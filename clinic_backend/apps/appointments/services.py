from datetime import date, time, datetime, timedelta
from typing import Optional
from django.db import transaction, IntegrityError
from django.db.models import Max, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Appointment, AppointmentStatus
from apps.doctors.models import DoctorClinic, DoctorClinicStatus
from apps.clinics.models import Clinic, VerificationStatus
from apps.doctors.models import Doctor


ONLINE_HOLD_EXPIRY_MINUTES = 20
PATIENT_CANCEL_CUTOFF_HOURS = 2


def format_doctor_display_name(doctor) -> str:
    name = (getattr(doctor, 'full_name', '') or str(doctor)).strip()
    if name.lower().startswith('dr.') or name.lower().startswith('dr '):
        return name
    return f"Dr. {name}"


def release_expired_online_holds(
    *,
    doctor_id: Optional[str] = None,
    clinic_id: Optional[str] = None,
    appointment_date: Optional[date] = None
) -> int:
    """
    Lazy auto-expiration for abandoned online payment checkouts.
    Releases slots held by PENDING appointments where an online payment (non-CASH)
    was initiated more than ONLINE_HOLD_EXPIRY_MINUTES ago but never completed.
    """
    from apps.payments.models import PaymentMethod, PaymentStatus

    cutoff = timezone.now() - timedelta(minutes=ONLINE_HOLD_EXPIRY_MINUTES)
    qs = Appointment.objects.filter(
        status=AppointmentStatus.PENDING,
        created_at__lt=cutoff,
        payment__isnull=False,
        payment__payment_status__in=[PaymentStatus.PENDING, PaymentStatus.FAILED],
    ).exclude(
        payment__payment_method=PaymentMethod.CASH
    )
    if doctor_id:
        qs = qs.filter(doctor_id=doctor_id)
    if clinic_id:
        qs = qs.filter(clinic_id=clinic_id)
    if appointment_date:
        qs = qs.filter(appointment_date=appointment_date)

    return qs.update(status=AppointmentStatus.CANCELLED, updated_at=timezone.now())


def book_appointment(*, patient, clinic_id: str, doctor_id: str, appointment_date: date, appointment_time: time, problem_description: str = "", family_member_id: Optional[str] = None, initial_status: str = AppointmentStatus.PENDING, is_walk_in: bool = False) -> Appointment:
    """
    Atomic appointment booking with concurrency protection against double booking.
    Enforces that Clinic and Doctor are VERIFIED and their service agreement is ACCEPTED.
    Uses monotonic serial generation (Max + 1) to prevent duplicate serial collisions after cancellations.
    """
    try:
        doctor_clinic = DoctorClinic.objects.select_related('doctor', 'clinic', 'department').get(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            is_active=True
        )
    except DoctorClinic.DoesNotExist:
        raise ValidationError({"doctor_id": "Doctor does not practice at this clinic or mapping is inactive."})

    if doctor_clinic.clinic.verification_status != VerificationStatus.VERIFIED:
        raise ValidationError({"clinic_id": "This clinic is pending approval by platform Admin."})

    if doctor_clinic.doctor.verification_status != VerificationStatus.VERIFIED:
        raise ValidationError({"doctor_id": "This doctor profile is pending approval by platform Admin."})

    if doctor_clinic.status != DoctorClinicStatus.ACCEPTED:
        raise ValidationError({"doctor_id": "The service agreement between this doctor and clinic has not been accepted yet."})

    family_member = None
    if family_member_id:
        from apps.accounts.models import FamilyMember
        try:
            family_member = FamilyMember.objects.get(pk=family_member_id, patient=patient)
        except FamilyMember.DoesNotExist:
            raise ValidationError({"family_member_id": "Invalid family member selected."})

    amount = doctor_clinic.consultation_fee

    with transaction.atomic():
        # Auto-release any abandoned online payment holds before checking slot lock
        release_expired_online_holds(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            appointment_date=appointment_date
        )

        # Check if slot is already booked with a database lock
        existing = Appointment.objects.select_for_update().filter(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status__in=[AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED]
        ).exists()

        if existing:
            raise ValidationError({"appointment_time": "This time slot is already booked. Please choose another slot."})

        # Active patient count for capacity enforcement (excludes CANCELLED)
        active_count = Appointment.objects.filter(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            appointment_date=appointment_date,
            status__in=[AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED]
        ).count()

        # Monotonic serial number (Max + 1 across all records for that day to prevent duplicate serials after cancellation)
        max_serial = Appointment.objects.filter(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            appointment_date=appointment_date
        ).aggregate(m=Max('serial_number'))['m'] or 0
        next_serial = max_serial + 1

        today = date.today()

        # 1. Past date check
        if appointment_date < today:
            raise ValidationError({"appointment_date": "Cannot book appointments for past dates."})

        # 2. Maximum advance booking window (30 days limit)
        if appointment_date > today + timedelta(days=30):
            raise ValidationError({"appointment_date": "Appointments can only be booked up to 30 days in advance."})

        doc_name = format_doctor_display_name(doctor_clinic.doctor)

        # 3. Doctor Leave check
        from apps.doctors.models import DoctorLeave
        on_leave = DoctorLeave.objects.filter(
            doctor_id=doctor_id,
            start_date__lte=appointment_date,
            end_date__gte=appointment_date,
            is_approved=True
        ).filter(Q(clinic_id=clinic_id) | Q(clinic__isnull=True)).exists()
        if on_leave:
            raise ValidationError({
                "appointment_date": f"{doc_name} is on scheduled leave on {appointment_date}."
            })

        # 4. Doctor Schedule verification
        from apps.doctors.models import DoctorSchedule
        day_num = appointment_date.weekday()

        has_clinic_schedules = DoctorSchedule.objects.filter(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            is_active=True
        ).exists()

        if has_clinic_schedules:
            schedule = DoctorSchedule.objects.filter(
                doctor_id=doctor_id,
                clinic_id=clinic_id,
                day_of_week=day_num,
                is_active=True
            ).first()

            if not schedule:
                raise ValidationError({
                    "appointment_date": f"{doc_name} does not practice at {doctor_clinic.clinic.name} on {appointment_date.strftime('%A')}s."
                })

            if not (schedule.start_time <= appointment_time < schedule.end_time):
                raise ValidationError({
                    "appointment_time": f"Doctor chamber hours on {appointment_date.strftime('%A')} are {schedule.start_time.strftime('%I:%M %p')} - {schedule.end_time.strftime('%I:%M %p')}."
                })
            if active_count >= schedule.max_patients:
                raise ValidationError({
                    "appointment_date": f"Maximum appointment capacity ({schedule.max_patients} patients) reached for this chamber session."
                })

        try:
            appointment = Appointment.objects.create(
                patient=patient,
                family_member=family_member,
                clinic_id=clinic_id,
                doctor_id=doctor_id,
                department=doctor_clinic.department,
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                serial_number=next_serial,
                amount=amount,
                problem_description=problem_description,
                status=initial_status
            )

            # If walk-in or marked confirmed with cash, record payment entry
            if initial_status == AppointmentStatus.CONFIRMED:
                try:
                    from apps.payments.models import Payment, PaymentMethod, PaymentStatus
                    Payment.objects.create(
                        appointment=appointment,
                        amount=amount,
                        currency='BDT',
                        payment_method=PaymentMethod.CASH,
                        payment_status=PaymentStatus.COMPLETED,
                        transaction_id=f"CASH_COUNTER_{appointment.id.hex[:8]}"
                    )
                except Exception:
                    pass

            # Dispatch SMS & in-app booking confirmation notification
            try:
                from apps.notifications.sms_service import send_sms_notification
                from apps.notifications.models import NotificationType
                patient_name = family_member.full_name if family_member else f"{patient.first_name} {patient.last_name}".strip()
                status_text = "Confirmed (Cash Paid at Counter)" if initial_status == AppointmentStatus.CONFIRMED else "Booked"
                send_sms_notification(
                    recipient=patient,
                    title=f"Appointment {status_text} ✅",
                    message=(
                        f"Dear {patient_name}, your token with {doc_name} "
                        f"at {doctor_clinic.clinic.name} on {appointment_date} ({appointment_time.strftime('%I:%M %p') if hasattr(appointment_time, 'strftime') else appointment_time}) is {status_text}. "
                        f"Serial #: {next_serial}. Fee: ৳{amount} BDT."
                    ),
                    notification_type=NotificationType.APPOINTMENT_CONFIRMED if initial_status == AppointmentStatus.CONFIRMED else NotificationType.APPOINTMENT_BOOKED
                )
            except Exception:
                pass  # Never let notification failure break core booking flow

            return appointment
        except IntegrityError:
            raise ValidationError({"appointment_time": "Time slot conflict. Slot was booked concurrently."})


def cancel_appointment(*, appointment: Appointment, cancelled_by_user) -> Appointment:
    if appointment.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
        raise ValidationError({"status": f"Cannot cancel an appointment with status {appointment.status}."})

    # Enforce 2-hour cutoff & check-in guard when a PATIENT self-cancels a CONFIRMED appointment
    if cancelled_by_user and getattr(cancelled_by_user, 'role', None) == 'PATIENT':
        if appointment.is_arrived:
            raise ValidationError({
                "status": "Cannot cancel online after checking in at the clinic counter. Please contact reception."
            })
        if appointment.status == AppointmentStatus.CONFIRMED:
            naive_apt_dt = datetime.combine(appointment.appointment_date, appointment.appointment_time)
            apt_dt = timezone.make_aware(naive_apt_dt, timezone.get_current_timezone()) if timezone.is_naive(naive_apt_dt) else naive_apt_dt
            now_dt = timezone.now()
            if apt_dt - now_dt < timedelta(hours=PATIENT_CANCEL_CUTOFF_HOURS):
                raise ValidationError({
                    "status": (
                        f"Confirmed appointments cannot be cancelled online within {PATIENT_CANCEL_CUTOFF_HOURS} hours "
                        f"of the scheduled chamber time. Please contact {appointment.clinic.name} reception directly."
                    )
                })

    appointment.status = AppointmentStatus.CANCELLED
    appointment.save(update_fields=['status', 'updated_at'])

    # Notify patient of cancellation
    try:
        from apps.notifications.sms_service import send_sms_notification
        from apps.notifications.models import NotificationType
        doc_display = format_doctor_display_name(appointment.doctor)
        send_sms_notification(
            recipient=appointment.patient,
            title="Appointment Cancelled ❌",
            message=(
                f"Your appointment with {doc_display} at {appointment.clinic.name} "
                f"on {appointment.appointment_date} has been cancelled."
            ),
            notification_type=NotificationType.APPOINTMENT_CANCELLED
        )
    except Exception:
        pass

    return appointment


def complete_appointment(*, appointment: Appointment) -> Appointment:
    if appointment.status in [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED]:
        return appointment
    appointment.status = AppointmentStatus.COMPLETED
    if not appointment.is_arrived:
        appointment.is_arrived = True
        if not appointment.arrived_at:
            appointment.arrived_at = timezone.now()
    appointment.save(update_fields=['status', 'is_arrived', 'arrived_at', 'updated_at'])

    # Notify patient that consultation has completed
    try:
        from apps.notifications.sms_service import send_sms_notification
        from apps.notifications.models import NotificationType
        doc_display = format_doctor_display_name(appointment.doctor)
        send_sms_notification(
            recipient=appointment.patient,
            title="Consultation Completed ✅",
            message=(
                f"Your consultation with {doc_display} at {appointment.clinic.name} "
                f"is marked completed. You can view your digital prescription and leave a review in your portal."
            ),
            notification_type=NotificationType.SYSTEM
        )
    except Exception:
        pass

    return appointment


def find_next_chamber_date(doctor_id: str, clinic_id: str, after_date: date) -> Optional[tuple]:
    """
    Finds the next upcoming scheduled chamber date and start time for a doctor.
    Skips approved leave dates. Returns (next_date, start_time, slot_duration_minutes) or None.
    """
    from apps.doctors.models import DoctorSchedule, DoctorLeave
    schedules = list(DoctorSchedule.objects.filter(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        is_active=True
    ))
    if not schedules:
        return None

    sched_by_dow = {s.day_of_week: s for s in schedules}
    for day_offset in range(1, 15):
        candidate_date = after_date + timedelta(days=day_offset)
        dow = candidate_date.weekday()
        if dow in sched_by_dow:
            on_leave = DoctorLeave.objects.filter(
                doctor_id=doctor_id,
                start_date__lte=candidate_date,
                end_date__gte=candidate_date,
                is_approved=True
            ).filter(
                Q(clinic_id=clinic_id) | Q(clinic__isnull=True)
            ).exists()
            if not on_leave:
                s = sched_by_dow[dow]
                return (candidate_date, s.start_time, s.slot_duration_minutes or 15)

    return None


def reschedule_appointment(
    *,
    appointment: Appointment,
    new_date: date,
    new_time: time,
    requested_by_user=None,
    reason: str = ""
) -> Appointment:
    """
    Reschedules an existing appointment to a new date and time slot.
    Preserves payment records and assigns a new sequential serial on the target date.
    Sends automated confirmation SMS to the patient.
    """
    if appointment.status == AppointmentStatus.COMPLETED:
        raise ValidationError({"status": "Completed appointments cannot be rescheduled."})
    if appointment.status == AppointmentStatus.CANCELLED:
        raise ValidationError({"status": "Cancelled appointments cannot be rescheduled."})

    today = timezone.localdate() if timezone.is_aware(timezone.now()) else date.today()
    if new_date < today:
        raise ValidationError({"new_date": "Cannot reschedule to a past date."})
    if new_date == today:
        now_time = timezone.localtime().time() if timezone.is_aware(timezone.now()) else datetime.now().time()
        if new_time < now_time:
            raise ValidationError({"new_time": "Cannot reschedule to a past time slot on today."})

    with transaction.atomic():
        conflict = Appointment.objects.select_for_update().filter(
            doctor_id=appointment.doctor_id,
            clinic_id=appointment.clinic_id,
            appointment_date=new_date,
            appointment_time=new_time,
        ).exclude(
            id=appointment.id
        ).exclude(
            status=AppointmentStatus.CANCELLED
        ).exists()

        if conflict:
            raise ValidationError({"new_time": "The selected time slot is already booked on this date."})

        max_serial = Appointment.objects.filter(
            doctor_id=appointment.doctor_id,
            clinic_id=appointment.clinic_id,
            appointment_date=new_date
        ).aggregate(Max('serial_number'))['serial_number__max'] or 0
        new_serial = max_serial + 1

        appointment.appointment_date = new_date
        appointment.appointment_time = new_time
        appointment.serial_number = new_serial
        appointment.is_arrived = False
        appointment.arrived_at = None
        appointment.save(update_fields=[
            'appointment_date', 'appointment_time', 'serial_number',
            'is_arrived', 'arrived_at', 'updated_at'
        ])

        try:
            from apps.notifications.sms_service import send_sms_notification
            from apps.notifications.models import NotificationType
            doc_display = format_doctor_display_name(appointment.doctor)
            time_str = new_time.strftime('%I:%M %p').lstrip('0') if hasattr(new_time, 'strftime') else str(new_time)
            send_sms_notification(
                recipient=appointment.patient,
                title="Appointment Rescheduled 🗓️",
                message=(
                    f"Dear Patient, your appointment with {doc_display} at {appointment.clinic.name} "
                    f"has been rescheduled to {new_date} ({time_str}). Your new token is Serial #{new_serial}. "
                    f"Original consultation fee remains paid."
                ),
                notification_type=NotificationType.SYSTEM,
                phone=appointment.patient.phone
            )
        except Exception:
            pass

        return appointment


def rollover_unserved_appointments(
    *,
    doctor_id: str,
    clinic_id: str,
    session_date: date,
    target_date: Optional[date] = None,
    requested_by_user=None
) -> list:
    """
    Bulk reassigns all remaining unserved appointments from a concluded/early-ended chamber
    to the doctor's next scheduled chamber day (or specified target_date).
    Assigns sequential available slots and new serials, preserving payment.
    Notifies each patient via SMS.
    """
    from apps.doctors.models import ChamberSession

    session = ChamberSession.objects.filter(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        session_date=session_date
    ).first()

    current_serial = session.current_serial if session else 0

    unserved = list(Appointment.objects.filter(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        appointment_date=session_date,
        status__in=[AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]
    ).order_by('serial_number'))

    if not unserved:
        return []

    today = timezone.localdate() if timezone.is_aware(timezone.now()) else date.today()
    if target_date and target_date < today:
        raise ValidationError({"target_date": "Cannot rollover appointments to a past date."})

    if not target_date:
        next_info = find_next_chamber_date(doctor_id, clinic_id, session_date)
        if not next_info:
            raise ValidationError({"target_date": "No upcoming active schedule found for this doctor. Please provide target_date manually."})
        target_date, base_start_time, slot_mins = next_info
    else:
        from apps.doctors.models import DoctorSchedule
        sched = DoctorSchedule.objects.filter(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            day_of_week=target_date.weekday(),
            is_active=True
        ).first()
        if sched:
            base_start_time = sched.start_time
            slot_mins = sched.slot_duration_minutes or 15
        else:
            base_start_time = time(10, 0)
            slot_mins = 15

    max_serial = Appointment.objects.filter(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        appointment_date=target_date
    ).aggregate(Max('serial_number'))['serial_number__max'] or 0

    booked_times = set(Appointment.objects.filter(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        appointment_date=target_date
    ).exclude(status=AppointmentStatus.CANCELLED).values_list('appointment_time', flat=True))

    rescheduled_list = []

    with transaction.atomic():
        curr_dt = datetime.combine(target_date, base_start_time)
        next_serial = max_serial + 1

        for apt in unserved:
            while curr_dt.time() in booked_times:
                curr_dt += timedelta(minutes=slot_mins)

            target_time = curr_dt.time()
            booked_times.add(target_time)

            apt.rolled_over_from_date = session_date
            apt.original_serial_number = apt.serial_number
            apt.original_appointment_time = apt.appointment_time
            apt.appointment_date = target_date
            apt.appointment_time = target_time
            apt.serial_number = next_serial
            apt.is_arrived = False
            apt.arrived_at = None
            apt.save(update_fields=[
                'rolled_over_from_date', 'original_serial_number', 'original_appointment_time',
                'appointment_date', 'appointment_time', 'serial_number',
                'is_arrived', 'arrived_at', 'updated_at'
            ])

            rescheduled_list.append(apt)
            next_serial += 1
            curr_dt += timedelta(minutes=slot_mins)

            try:
                from apps.notifications.sms_service import send_sms_notification
                from apps.notifications.models import NotificationType
                doc_display = format_doctor_display_name(apt.doctor)
                time_str = target_time.strftime('%I:%M %p').lstrip('0')
                send_sms_notification(
                    recipient=apt.patient,
                    title="Chamber Rollover to Next Day 🗓️",
                    message=(
                        f"Dear Patient, your appointment with {doc_display} at {apt.clinic.name} "
                        f"has been rolled over to {target_date} ({time_str}). "
                        f"Your new token is Serial #{apt.serial_number}. Fee remains paid."
                    ),
                    notification_type=NotificationType.SYSTEM,
                    phone=apt.patient.phone
                )
            except Exception:
                pass

    return rescheduled_list


def revert_session_rollover(
    *,
    doctor_id: str,
    clinic_id: str,
    session_date: date
) -> list:
    """
    Reverts a session rollover by moving patients who were rolled over from this session
    back to their original session date, restoring original serial numbers and slot times.
    Re-aligns the serial numbers on the target dates for any remaining/newly booked patients.
    Notifies restored patients via SMS.
    """
    rolled_over_apts = list(Appointment.objects.filter(
        doctor_id=doctor_id,
        clinic_id=clinic_id,
        rolled_over_from_date=session_date
    ).exclude(status=AppointmentStatus.CANCELLED).order_by('original_serial_number', 'created_at'))

    if not rolled_over_apts:
        return []

    target_dates = set(apt.appointment_date for apt in rolled_over_apts)
    restored_list = []

    with transaction.atomic():
        for apt in rolled_over_apts:
            apt.appointment_date = session_date
            if apt.original_serial_number:
                apt.serial_number = apt.original_serial_number
            if apt.original_appointment_time:
                apt.appointment_time = apt.original_appointment_time
            apt.rolled_over_from_date = None
            apt.original_serial_number = None
            apt.original_appointment_time = None
            apt.save(update_fields=[
                'appointment_date', 'serial_number', 'appointment_time',
                'rolled_over_from_date', 'original_serial_number', 'original_appointment_time',
                'updated_at'
            ])
            restored_list.append(apt)

            try:
                from apps.notifications.sms_service import send_sms_notification
                from apps.notifications.models import NotificationType
                doc_display = format_doctor_display_name(apt.doctor)
                time_str = apt.appointment_time.strftime('%I:%M %p').lstrip('0') if hasattr(apt.appointment_time, 'strftime') else str(apt.appointment_time)
                send_sms_notification(
                    recipient=apt.patient,
                    title="Chamber Session Resumed Today 🗓️",
                    message=(
                        f"Dear Patient, {doc_display}'s chamber session today ({session_date}) has resumed. "
                        f"Your appointment has been restored to today at {time_str} (Serial #{apt.serial_number}). "
                        f"Fee remains paid."
                    ),
                    notification_type=NotificationType.SYSTEM,
                    phone=apt.patient.phone
                )
            except Exception:
                pass

        # Re-align serial numbers on affected target dates
        for t_date in target_dates:
            remaining_target_apts = list(Appointment.objects.filter(
                doctor_id=doctor_id,
                clinic_id=clinic_id,
                appointment_date=t_date
            ).exclude(status=AppointmentStatus.CANCELLED).order_by('appointment_time', 'created_at'))

            for idx, r_apt in enumerate(remaining_target_apts, start=1):
                if r_apt.serial_number != idx:
                    r_apt.serial_number = idx
                    r_apt.save(update_fields=['serial_number', 'updated_at'])

    return restored_list


def calculate_dynamic_patient_eta(appointment: Appointment, session=None) -> dict:
    """
    Single source of truth for real-time patient queue calculations.
    Factors in doctor delays, active emergencies, skipped serials, prayer breaks,
    and average consultation duration without mutating baseline appointment records.
    """
    from apps.doctors.models import ChamberSession, ChamberSessionStatus

    if session is None:
        session = ChamberSession.objects.filter(
            doctor=appointment.doctor,
            clinic=appointment.clinic,
            session_date=appointment.appointment_date
        ).first()

    current_serving_serial = session.current_serial if session else 0
    chamber_status = session.status if session else ChamberSessionStatus.NOT_STARTED
    delay_minutes = session.delay_minutes if session else 0
    announcement_note = session.announcement_note if session else ''
    room_number = session.room_number if session and session.room_number else 'Chamber Room'
    est_mins_per_patient = session.estimated_mins_per_patient if session else 12

    patient_serial = appointment.serial_number or 1

    has_active_emergency = bool(session and session.active_emergency_id)
    is_active_emergency = bool(session and session.active_emergency_id == appointment.id)
    is_held = bool(session and session.held_patient_id == appointment.id)
    is_prayer_break = bool(session and session.status == ChamberSessionStatus.PRAYER_BREAK)
    is_session_ended = bool(session and session.status == ChamberSessionStatus.ENDED)

    skipped = list(session.skipped_serials or []) if session else []

    if appointment.is_emergency:
        if is_active_emergency:
            patients_ahead = 0
            is_turn_now = True
            is_passed = False
            estimated_wait_mins = 0
        elif appointment.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
            patients_ahead = 0
            is_turn_now = False
            is_passed = (appointment.status == AppointmentStatus.COMPLETED)
            estimated_wait_mins = 0
        else:
            is_turn_now = False
            is_passed = False
            prior_emergencies = Appointment.objects.filter(
                doctor=appointment.doctor,
                clinic=appointment.clinic,
                appointment_date=appointment.appointment_date,
                is_emergency=True,
                status=AppointmentStatus.CONFIRMED,
                created_at__lt=appointment.created_at
            ).count()
            patients_ahead = prior_emergencies + (1 if has_active_emergency else 0)
            estimated_wait_mins = None if is_prayer_break else (patients_ahead * 10)

    elif is_held:
        patients_ahead = 0
        is_turn_now = False
        is_passed = False
        estimated_wait_mins = None if is_prayer_break else 5

    elif appointment.status == AppointmentStatus.COMPLETED:
        patients_ahead = 0
        is_turn_now = False
        is_passed = True
        estimated_wait_mins = 0

    elif appointment.status == AppointmentStatus.CANCELLED:
        patients_ahead = 0
        is_turn_now = False
        is_passed = False
        estimated_wait_mins = 0

    elif patient_serial in skipped:
        patients_ahead = 0
        is_turn_now = False
        is_passed = True
        estimated_wait_mins = None

    elif patient_serial == current_serving_serial:
        if has_active_emergency:
            patients_ahead = 0
            is_turn_now = False
            is_passed = False
            estimated_wait_mins = 10
        elif is_prayer_break:
            patients_ahead = 0
            is_turn_now = False
            is_passed = False
            estimated_wait_mins = None
        else:
            patients_ahead = 0
            is_turn_now = True
            is_passed = False
            estimated_wait_mins = 0

    elif patient_serial < current_serving_serial:
        patients_ahead = 0
        is_turn_now = False
        is_passed = True
        estimated_wait_mins = 0

    else:
        # patient_serial > current_serving_serial
        normal_ahead_count = Appointment.objects.filter(
            doctor=appointment.doctor,
            clinic=appointment.clinic,
            appointment_date=appointment.appointment_date,
            serial_number__gt=current_serving_serial,
            serial_number__lt=patient_serial,
            is_emergency=False,
            status__in=[AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]
        ).exclude(
            serial_number__in=skipped
        ).count()

        active_normal_count = 1 if (session and session.current_serial > 0 and Appointment.objects.filter(
            doctor=appointment.doctor,
            clinic=appointment.clinic,
            appointment_date=appointment.appointment_date,
            serial_number=session.current_serial,
            is_emergency=False,
            status=AppointmentStatus.CONFIRMED
        ).exists()) else 0

        emergencies_ahead = Appointment.objects.filter(
            doctor=appointment.doctor,
            clinic=appointment.clinic,
            appointment_date=appointment.appointment_date,
            is_emergency=True,
            status=AppointmentStatus.CONFIRMED
        ).count()

        patients_ahead = normal_ahead_count + active_normal_count + emergencies_ahead
        is_turn_now = False
        is_passed = False
        if is_prayer_break:
            estimated_wait_mins = None
        else:
            estimated_wait_mins = (patients_ahead * est_mins_per_patient) + delay_minutes

    if is_session_ended:
        is_turn_now = False
        estimated_wait_mins = None

    # Calculate human-readable dynamic target time
    estimated_consultation_time = None
    if is_turn_now:
        estimated_consultation_time = "Now"
    elif is_prayer_break:
        estimated_consultation_time = "On Prayer Break"
    elif is_session_ended:
        estimated_consultation_time = "Session Ended"
    elif estimated_wait_mins is not None and not is_passed:
        now_dt = timezone.localtime(timezone.now()) if timezone.is_aware(timezone.now()) else datetime.now()
        target_dt = now_dt + timedelta(minutes=estimated_wait_mins)
        estimated_consultation_time = target_dt.strftime('%I:%M %p').lstrip('0')

    return {
        'current_serving_serial': current_serving_serial,
        'chamber_status': chamber_status,
        'is_prayer_break': is_prayer_break,
        'is_session_ended': is_session_ended,
        'room_number': room_number,
        'delay_minutes': delay_minutes,
        'delay_offset_minutes': delay_minutes,
        'is_delayed': bool(delay_minutes > 0),
        'announcement_note': announcement_note,
        'patients_ahead': patients_ahead,
        'estimated_wait_mins': estimated_wait_mins,
        'estimated_consultation_time': estimated_consultation_time,
        'is_turn_now': is_turn_now,
        'is_passed': is_passed,
        'is_held': is_held,
        'has_active_emergency': has_active_emergency,
        'is_active_emergency': is_active_emergency,
        'active_emergency_serial': session.active_emergency.serial_number if (session and session.active_emergency) else None,
        'held_patient_serial': session.held_patient.serial_number if (session and session.held_patient) else None,
        'skipped_serials': skipped,
        'estimated_mins_per_patient': est_mins_per_patient,
    }



