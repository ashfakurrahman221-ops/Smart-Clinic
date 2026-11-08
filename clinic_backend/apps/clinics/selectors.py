from typing import Optional
from django.db.models import QuerySet, Avg, Count, Prefetch
from .models import Clinic, Department, ClinicService

def list_departments() -> QuerySet:
    return Department.objects.filter(is_active=True)

def _clinic_base_qs() -> QuerySet:
    return Clinic.objects.filter(is_active=True).select_related('owner').prefetch_related(
        'departments',
        Prefetch('services', queryset=ClinicService.objects.filter(is_available=True))
    ).annotate(
        annotated_avg_rating=Avg('reviews__rating'),
        annotated_review_count=Count('reviews')
    ).order_by('-created_at')

def list_clinics(
    *,
    city: Optional[str] = None,
    department_id: Optional[str] = None,
    division_id: Optional[str] = None,
    district_id: Optional[str] = None,
    upazila_id: Optional[str] = None,
    search: Optional[str] = None,
    only_verified: bool = True
) -> QuerySet:
    from django.db.models import Q
    qs = _clinic_base_qs()
    if only_verified:
        qs = qs.filter(verification_status='VERIFIED')
    if division_id:
        qs = qs.filter(division_id=division_id)
    if district_id:
        qs = qs.filter(district_id=district_id)
    if upazila_id:
        qs = qs.filter(upazila_id=upazila_id)
    if search:
        import difflib
        words = [w for w in search.strip().split() if len(w) >= 2]
        if words:
            # 1. Try strict matching (all words match)
            strict_qs = qs
            for w in words:
                strict_qs = strict_qs.filter(
                    Q(name__icontains=w) | Q(city__icontains=w) | Q(address__icontains=w)
                )
            if strict_qs.exists():
                qs = strict_qs
            else:
                # 2. Try flexible matching (any keyword matches name, city, address)
                flex_q = Q()
                for w in words:
                    flex_q |= Q(name__icontains=w) | Q(city__icontains=w) | Q(address__icontains=w)
                flex_qs = qs.filter(flex_q)

                if flex_qs.exists():
                    qs = flex_qs
                else:
                    # 3. Fuzzy matching: detect typos like 'anawar' vs 'anwar'
                    all_candidates = list(qs)
                    matched_ids = set()
                    for clinic in all_candidates:
                        clinic_tokens = (clinic.name + " " + clinic.city + " " + clinic.address).lower().split()
                        for u_word in words:
                            # check if any token is close to the user's word
                            if difflib.get_close_matches(u_word.lower(), clinic_tokens, n=1, cutoff=0.7):
                                matched_ids.add(clinic.id)
                                break
                    if matched_ids:
                        qs = qs.filter(id__in=matched_ids)
    if city:
        if city.strip().lower() == 'mymensingh':
            qs = qs.filter(city__in=['Mymensingh', 'Sherpur', 'mymensingh', 'sherpur'])
        else:
            qs = qs.filter(city__iexact=city)
    if department_id:
        qs = qs.filter(departments__id=department_id)
    return qs

def get_clinic_by_id(clinic_id: str) -> Optional[Clinic]:
    return _clinic_base_qs().filter(id=clinic_id).first()

def get_clinic_by_slug(slug: str) -> Optional[Clinic]:
    return _clinic_base_qs().filter(slug=slug).first()

def get_clinic_by_owner(user) -> Optional[Clinic]:
    return _clinic_base_qs().filter(owner=user).first()
