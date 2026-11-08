import re

with open('d:/Projects/smart-clinic/src/pages/dashboard/DoctorDashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

for line_no, line in enumerate(text.splitlines(), 1):
    if "chamber-session" in line or "chamberSession" in line:
        print(f"L{line_no}: {line.strip()[:100]}")
