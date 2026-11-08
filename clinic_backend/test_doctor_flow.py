import urllib.request
import json

def run_doctor_flow():
    from comprehensive_user_audit import api

    print("=== TESTING DOCTOR WORKFLOW (Dr. Nusrat) ===")
    # 1. Login
    code, res, _ = api('/accounts/login/', method='POST', data={'email': 'dr.nusrat@smartclinic.bd', 'password': 'Password123!'})
    tok = res['data']['access']
    print("Doctor logged in successfully:", res['data']['user']['email'])

    # 2. Get Doctor Appointments
    code, appts_res, _ = api('/appointments/', token=tok)
    appts = appts_res.get('data', {}).get('results', [])
    print(f"Doctor appointments count: {len(appts)}")
    alif_appt = next((a for a in appts if a.get('patient_name') == 'Alif Hossain'), None)
    if alif_appt:
        print(f"Found Alif's appointment: Serial #{alif_appt.get('serial_number')}, Status: {alif_appt.get('status')}, ID: {alif_appt.get('id')}")
    else:
        print("Alif's appointment not in doctor list!")

    # 3. Chamber Session Action (Start chamber)
    cid = '57a86b85-879c-4334-b193-207f34a0f77a'
    did = '07e5d9b6-0fd4-43cc-8366-6ccd882b6555'
    start_payload = {
        "doctor_id": did,
        "clinic_id": cid,
        "status": "IN_SESSION"
    }
    c_code, c_res, _ = api('/doctors/chamber-session/', method='POST', data=start_payload, token=tok)
    print("Start chamber session response:", c_code, c_res)

    # 4. Call NEXT_SERIAL
    next_payload = {
        "doctor_id": did,
        "clinic_id": cid,
        "action": "NEXT_SERIAL"
    }
    n_code, n_res, _ = api('/doctors/chamber-session/', method='POST', data=next_payload, token=tok)
    print("Call next serial response:", n_code, n_res)

    # 5. Write Prescription for Alif's appointment
    if alif_appt:
        rx_payload = {
            "appointment_id": alif_appt['id'],
            "diagnosis": "Acute Upper Respiratory Tract Infection (Flu)",
            "clinical_notes": "Patient has mild fever and nasal congestion. Vitals stable.",
            "tests": "CBC with ESR if fever persists",
            "advice": "Drink warm water, take plenty of rest.",
            "medications": [
                {
                    "medication_name": "Tab. Napa Extra 500mg+65mg",
                    "dosage": "1 + 0 + 1",
                    "timing": "After meals",
                    "duration": "5 days",
                    "instructions": "When fever occurs"
                }
            ]
        }
        rx_code, rx_res, _ = api('/prescriptions/', method='POST', data=rx_payload, token=tok)
        print("Write prescription response:", rx_code, rx_res.get('success') if isinstance(rx_res, dict) else rx_res)

    # 6. Complete appointment
    if alif_appt:
        comp_code, comp_res, _ = api(f"/appointments/{alif_appt['id']}/complete/", method='POST', token=tok)
        print("Complete appointment response:", comp_code, comp_res)

if __name__ == '__main__':
    run_doctor_flow()
