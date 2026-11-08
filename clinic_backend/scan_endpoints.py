import os
import re
import glob

files = glob.glob('d:/Projects/smart-clinic/src/**/*.jsx', recursive=True)
endpoints = {}
for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    matches = re.findall(r'apiClient\.(get|post|put|patch|delete)\([`"\']([^`"\'${}]*)', content)
    for method, path in matches:
        endpoints.setdefault(os.path.basename(f), []).append((method.upper(), path))

for fname, calls in sorted(endpoints.items()):
    print(f"=== {fname} ===")
    for m, p in sorted(set(calls)):
        print(f"  {m} {p}")
