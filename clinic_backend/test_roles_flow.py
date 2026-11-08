import urllib.request
import urllib.error
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"
PASSWORD = "Password123!"

demo_users = {
    "SUPER_ADMIN": "admin@clinic.com",
    "CLINIC_ADMIN": "monira@gmail.com",
    "DOCTOR": "lubna@gmail.com",
    "PATIENT": "alif@gmail.com",
    "RECEPTIONIST": "rahela_counter@clinic.test"
}

def api_call(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            res_data = json.loads(resp.read().decode("utf-8"))
            return status, res_data
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            res_data = json.loads(err_body)
        except Exception:
            res_data = err_body
        return e.code, res_data
    except Exception as e:
        return 500, {"error": str(e)}

def run_roles_flow():
    tokens = {}

    print("=== 1. TESTING LOGIN FOR ALL ROLES ===")
    for role, email in demo_users.items():
        status, res = api_call("/accounts/login/", method="POST", data={"email": email, "password": PASSWORD})
        if status == 200 and res.get("success"):
            data = res.get("data", {})
            tokens[role] = {
                "access": data.get("access"),
                "user": data,
                "email": email
            }
            print(f"[{role}] OK (200) -> Name: {data.get('first_name')} {data.get('last_name')}, Role: {data.get('role')}")
        else:
            print(f"[{role}] FAILED ({status}): {res}")

    print("\n=== 2. TESTING PATIENT FLOW ===")
    if "PATIENT" in tokens:
        tok = tokens['PATIENT']['access']
        print("Patient /me:", api_call("/accounts/me/", token=tok)[0])
        print("Patient family members:", api_call("/accounts/family-members/", token=tok)[0])
        print("Patient clinics list:", api_call("/clinics/", token=tok)[0])
        print("Patient doctors list:", api_call("/doctors/", token=tok)[0])
        print("Patient my-appointments:", api_call("/appointments/patient/my-appointments/", token=tok)[0])
        print("Patient my-prescriptions:", api_call("/prescriptions/my-prescriptions/", token=tok)[0])
        print("Patient notifications:", api_call("/notifications/", token=tok)[0])

    print("\n=== 3. TESTING DOCTOR FLOW ===")
    if "DOCTOR" in tokens:
        tok = tokens['DOCTOR']['access']
        print("Doctor /me:", api_call("/accounts/me/", token=tok)[0])
        print("Doctor /doctors/me/:", api_call("/doctors/me/", token=tok)[0])
        print("Doctor my-appointments:", api_call("/appointments/doctor/my-appointments/", token=tok)[0])
        print("Doctor chamber-sessions:", api_call("/doctors/chamber-sessions/", token=tok)[0])
        print("Doctor schedules:", api_call("/doctors/schedules/", token=tok)[0])

    print("\n=== 4. TESTING CLINIC ADMIN FLOW ===")
    if "CLINIC_ADMIN" in tokens:
        tok = tokens['CLINIC_ADMIN']['access']
        print("Clinic Admin /me:", api_call("/accounts/me/", token=tok)[0])
        st, my_clinics = api_call("/clinics/my-clinics/", token=tok)
        print("Clinic Admin my-clinics status:", st)
        clinics_data = my_clinics.get("data", []) if isinstance(my_clinics, dict) else []
        print("Clinic Admin my-clinics count:", len(clinics_data))
        if clinics_data:
            cid = clinics_data[0].get("id")
            print(f"Clinic {cid} analytics status:", api_call(f"/clinics/{cid}/analytics/", token=tok)[0])
            print(f"Clinic {cid} doctors status:", api_call(f"/clinics/{cid}/doctors/", token=tok)[0])
            print(f"Clinic {cid} appointments status:", api_call(f"/appointments/clinic/{cid}/", token=tok)[0])

    print("\n=== 5. TESTING RECEPTIONIST FLOW ===")
    if "RECEPTIONIST" in tokens:
        tok = tokens['RECEPTIONIST']['access']
        print("Receptionist /me:", api_call("/accounts/me/", token=tok)[0])
        print("Receptionist search appointments:", api_call("/appointments/search/", token=tok)[0])
        print("Receptionist queue today:", api_call("/appointments/queue/today/", token=tok)[0])

    print("\n=== 6. TESTING SUPER ADMIN FLOW ===")
    if "SUPER_ADMIN" in tokens:
        tok = tokens['SUPER_ADMIN']['access']
        print("Super Admin /me:", api_call("/accounts/me/", token=tok)[0])
        print("Super Admin platform-summary:", api_call("/analytics/platform-summary/", token=tok)[0])
        print("Super Admin clinics list:", api_call("/clinics/admin/all/", token=tok)[0])

if __name__ == '__main__':
    run_roles_flow()
