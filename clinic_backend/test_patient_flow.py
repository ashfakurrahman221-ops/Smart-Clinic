import urllib.request
import json

def run_patient_flow():
    from comprehensive_user_audit import api, tokens

    tok = tokens['PATIENT']
    print("--- 1. Testing Patient Booking Flow ---")
    _, clinics, _ = api('/clinics/', token=tok)
    c_list = clinics.get('data', {}).get('results', [])
    if not c_list:
        print("NO CLINICS FOUND!")
        return

    c = c_list[0]
    cid = c['id']
    print(f"Selected Clinic: {c['name']} (ID: {cid})")

    _, docs, _ = api(f'/doctors/?clinic_id={cid}', token=tok)
    d_list = docs.get('data', {}).get('results', [])
    if not d_list:
        print("NO DOCTORS FOR THIS CLINIC!")
        return

    d = d_list[0]
    did = d['id']
    print(f"Selected Doctor: {d.get('user', {}).get('first_name')} {d.get('user', {}).get('last_name')} (ID: {did})")

    code, avail, _ = api(f'/doctors/availability/?doctor_id={did}&clinic_id={cid}&date=2026-10-12', token=tok)
    print("Availability response:", code, avail)

    # Try booking an appointment
    booking_payload = {
        "clinic_id": cid,
        "doctor_id": did,
        "appointment_date": "2026-10-12",
        "appointment_time": "10:00:00",
        "problem_description": "Fever and headaches for 3 days"
    }
    b_code, b_res, _ = api('/appointments/', method='POST', data=booking_payload, token=tok)
    print("Booking attempt response:", b_code, b_res)

if __name__ == '__main__':
    run_patient_flow()
