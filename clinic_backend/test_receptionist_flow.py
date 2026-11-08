import urllib.request
import json

def run_receptionist_flow():
    from comprehensive_user_audit import api

    print("=== TESTING RECEPTIONIST WORKFLOW (Rahela) ===")
    # 1. Login
    code, res, _ = api('/accounts/login/', method='POST', data={'email': 'rahela_counter@clinic.test', 'password': 'Password123!'})
    tok = res['data']['access']
    print("Receptionist logged in:", res['data']['user']['email'])

    # 2. Reception my-clinic
    code, c_res, _ = api('/clinics/reception/my-clinic/', token=tok)
    print("Reception my-clinic status:", code, c_res.get('data', {}).get('name'))

    # 3. Check-in Alif's appointment
    appt_id = '4bf74e77-cb9a-4cb7-a446-44cbeabe5a41'
    ci_code, ci_res, _ = api('/clinics/reception/check-in/', method='POST', data={'appointment_id': appt_id}, token=tok)
    print("Patient Check-in response:", ci_code, ci_res)

    # 4. Collect Cash Payment
    pay_code, pay_res, _ = api('/clinics/reception/cash-payment/', method='POST', data={'appointment_id': appt_id, 'amount_collected': 700}, token=tok)
    print("Cash Payment response:", pay_code, pay_res)

    # 5. Walk-in Patient Registration & Appointment
    walkin_payload = {
        "patient_name": "Rahim Uddin",
        "patient_phone": "01899123456",
        "doctor_id": "07e5d9b6-0fd4-43cc-8366-6ccd882b6555",
        "problem_description": "Severe stomach ache and nausea",
        "fee": 700,
        "is_emergency": False
    }
    w_code, w_res, _ = api('/clinics/reception/walk-in/', method='POST', data=walkin_payload, token=tok)
    print("Walk-in Creation response:", w_code, w_res)

    # 6. Reception Cash Summary
    cs_code, cs_res, _ = api('/clinics/reception/cash-summary/', token=tok)
    print("Cash summary after transactions:", cs_code, cs_res.get('data'))

if __name__ == '__main__':
    run_receptionist_flow()
