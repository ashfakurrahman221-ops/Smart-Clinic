import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"
PASSWORD = "Password123!"

USERS = {
    "SUPER_ADMIN": "superAdmin@gmail.com",
    "CLINIC_ADMIN": "monira@gmail.com",
    "DOCTOR": "lubna@gmail.com",
    "PATIENT": "alif@gmail.com",
    "RECEPTIONIST": "rahela_counter@clinic.test"
}

def api(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    t0 = time.time()
    try:
        with urllib.request.urlopen(req) as resp:
            elapsed = round((time.time() - t0) * 1000, 1)
            raw = resp.read().decode("utf-8")
            try:
                res_json = json.loads(raw)
            except:
                res_json = raw
            return resp.status, res_json, elapsed
    except urllib.error.HTTPError as e:
        elapsed = round((time.time() - t0) * 1000, 1)
        raw = e.read().decode("utf-8")
        try:
            res_json = json.loads(raw)
        except:
            res_json = raw
        return e.code, res_json, elapsed
    except Exception as e:
        elapsed = round((time.time() - t0) * 1000, 1)
        return 500, {"exception": str(e)}, elapsed

audit_results = {}

print("=== 1. LOGGING IN ALL USERS ===")
tokens = {}
for role, email in USERS.items():
    code, res, ms = api("/accounts/login/", method="POST", data={"email": email, "password": PASSWORD})
    if code == 200 and isinstance(res, dict) and res.get("success"):
        data = res.get("data", {})
        tokens[role] = data.get("access")
        user_info = data.get("user", {})
        print(f"[{role}] Login SUCCESS in {ms}ms: {user_info.get('first_name')} {user_info.get('last_name')} ({user_info.get('email')}), Role: {user_info.get('role')}")
    else:
        print(f"[{role}] Login FAILED ({code}): {res}")

def run_role_checks(role, checks):
    token = tokens.get(role)
    print(f"\n==========================================")
    print(f"--- RUNNING AUDIT FOR ROLE: {role} ---")
    print(f"==========================================")
    role_report = []
    for desc, method, endpoint, payload in checks:
        code, res, ms = api(endpoint, method=method, data=payload, token=token)
        success = (code in [200, 201])
        err_msg = ""
        if not success:
            if isinstance(res, dict):
                err_msg = str(res.get("errors") or res.get("detail") or res)
            else:
                err_msg = str(res)[:100]
        
        status_icon = "PASS" if success else "FAIL"
        print(f"[{status_icon}] {desc} ({method} {endpoint}) -> HTTP {code} ({ms}ms) {err_msg[:80]}")
        role_report.append({
            "description": desc,
            "method": method,
            "endpoint": endpoint,
            "code": code,
            "time_ms": ms,
            "success": success,
            "response": res
        })
    audit_results[role] = role_report

# ----------------- PATIENT CHECKS -----------------
patient_checks = [
    ("Fetch Profile /me", "GET", "/accounts/me/", None),
    ("Fetch Notifications", "GET", "/notifications/", None),
    ("Fetch Family Members", "GET", "/accounts/family-members/", None),
    ("Fetch Patient Appointments", "GET", "/appointments/", None),
    ("Fetch Medical Reports", "GET", "/prescriptions/reports/", None),
    ("Fetch Patient Vitals", "GET", "/prescriptions/vitals/", None),
    ("Browse Clinics", "GET", "/clinics/", None),
    ("Browse Doctors", "GET", "/doctors/", None),
    ("Check Specializations", "GET", "/doctors/specializations/", None),
    ("Check Doctor Availability", "GET", "/doctors/availability/", None),
    ("Check Divisions", "GET", "/common/divisions/", None),
]
run_role_checks("PATIENT", patient_checks)

# ----------------- DOCTOR CHECKS -----------------
doctor_checks = [
    ("Fetch Profile /me", "GET", "/accounts/me/", None),
    ("Fetch Doctor Profile Setup", "GET", "/doctors/setup-profile/", None),
    ("Fetch Doctor Appointments", "GET", "/appointments/", None),
    ("Fetch Doctor Schedule", "GET", "/doctors/schedule/", None),
    ("Fetch Chamber Session", "GET", "/doctors/chamber-session/", None),
    ("Fetch Clinic Affiliation Requests", "GET", "/doctors/requests/", None),
    ("Fetch Prescriptions List", "GET", "/prescriptions/", None),
    ("Fetch Medications List", "GET", "/prescriptions/medications/", None),
    ("Fetch Medical Reports", "GET", "/prescriptions/reports/", None),
]
run_role_checks("DOCTOR", doctor_checks)

# ----------------- CLINIC ADMIN CHECKS -----------------
ca_checks = [
    ("Fetch Profile /me", "GET", "/accounts/me/", None),
    ("Fetch My Clinic", "GET", "/clinics/my-clinic/", None),
    ("Fetch Clinic Staff List", "GET", "/clinics/staff/", None),
    ("Fetch Staff Attendance Today", "GET", "/clinics/staff/attendance/?date=2026-10-11", None),
    ("Fetch Staff Monthly Summary", "GET", "/clinics/staff/monthly-summary/?month=2026-10", None),
    ("Fetch Clinic Appointments", "GET", "/appointments/", None),
    ("Fetch Doctor Affiliation Requests", "GET", "/doctors/requests/", None),
    ("Fetch Departments List", "GET", "/clinics/departments/", None),
    ("Fetch Reception Daily Cash Summary", "GET", "/clinics/reception/daily-cash-summary/", None),
]
run_role_checks("CLINIC_ADMIN", ca_checks)

# ----------------- RECEPTIONIST CHECKS -----------------
rec_checks = [
    ("Fetch Profile /me", "GET", "/accounts/me/", None),
    ("Fetch Receptionist My Clinic", "GET", "/clinics/reception/my-clinic/", None),
    ("Fetch Appointments Queue", "GET", "/appointments/", None),
    ("Fetch Daily Cash Summary", "GET", "/clinics/reception/daily-cash-summary/", None),
    ("Lookup Patient (search)", "GET", "/clinics/reception/patient-lookup/?phone=017", None),
]
run_role_checks("RECEPTIONIST", rec_checks)

# ----------------- SUPER ADMIN CHECKS -----------------
sa_checks = [
    ("Fetch Profile /me", "GET", "/accounts/me/", None),
    ("Fetch All Clinics List", "GET", "/clinics/", None),
    ("Fetch All Doctors List", "GET", "/doctors/", None),
    ("Fetch All Appointments", "GET", "/appointments/", None),
    ("Fetch Departments Catalog", "GET", "/clinics/departments/", None),
    ("Fetch Specializations Catalog", "GET", "/doctors/specializations/", None),
]
run_role_checks("SUPER_ADMIN", sa_checks)

with open("audit_summary.json", "w", encoding="utf-8") as f:
    json.dump(audit_results, f, indent=2)

print("\nAudit completed! Summary written to audit_summary.json")
