import os
import sys
import sqlite3
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

# Dependency order for tables
TABLES_ORDER = [
    # Geo
    "common_division",
    "common_district",
    "common_upazila",
    
    # Core Auth
    "accounts_user",
    "accounts_user_groups",
    "accounts_user_user_permissions",
    "accounts_familymember",
    
    # Clinics & Services
    "clinics_clinic",
    "clinics_department",
    "clinics_clinicdepartment",
    "clinics_clinicservice",
    "clinics_clinicstaff",
    "clinics_announcement",
    "clinics_shiftclosinglog",
    "clinics_staffattendance",
    
    # Doctors & Schedules
    "doctors_specialization",
    "doctors_doctor",
    "doctors_doctor_specializations",
    "doctors_doctorclinic",
    "doctors_doctorschedule",
    "doctors_chambersession",
    "doctors_doctorleave",
    
    # Medications Catalog
    "prescriptions_medication",
    
    # Clinical Engagements
    "appointments_appointment",
    "payments_payment",
    "prescriptions_prescription",
    "prescriptions_prescribedmedication",
    "prescriptions_patientvitallog",
    "prescriptions_medicalreport",
    "reviews_review",
    "notifications_notification",
]

def migrate_sqlite_to_neon():
    sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'db.sqlite3')
    if not os.path.exists(sqlite_path):
        print(f"Error: {sqlite_path} does not exist.")
        return

    con_lite = sqlite3.connect(sqlite_path)
    cur_lite = con_lite.cursor()

    print("=== MIGRATING ALL LOCAL SQLITE DATA TO NEON POSTGRESQL ===")
    
    with connection.cursor() as cur_pg:
        # 1. Fetch column data types for all Neon tables
        cur_pg.execute("""
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public';
        """)
        col_types = {}
        for tbl, col, dt in cur_pg.fetchall():
            col_types.setdefault(tbl, {})[col] = dt

        # 2. Truncate existing data in Neon to prevent duplicate key or FK conflicts
        print("\n1. Truncating Neon tables (CASCADE)...")
        # Reverse order for clean truncate
        tables_to_truncate = [t for t in reversed(TABLES_ORDER) if t in col_types]
        truncate_sql = f'TRUNCATE TABLE {", ".join([f"{chr(34)}{t}{chr(34)}" for t in tables_to_truncate])} CASCADE;'
        cur_pg.execute(truncate_sql)
        print("   All target Neon tables truncated successfully.")

        # 3. Transfer each table in dependency order
        print("\n2. Transferring data from SQLite to Neon in dependency order...")
        total_migrated = 0

        for table in TABLES_ORDER:
            # Check if table exists in SQLite
            cur_lite.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if not cur_lite.fetchone():
                print(f"   [SKIP] Table {table} not in SQLite.")
                continue

            # Get columns from SQLite
            cur_lite.execute(f"PRAGMA table_info('{table}')")
            lite_cols = [c[1] for c in cur_lite.fetchall()]
            
            # Common columns between SQLite and Neon
            pg_tbl_cols = col_types.get(table, {})
            common_cols = [c for c in lite_cols if c in pg_tbl_cols]
            
            if not common_cols:
                continue

            # Read rows from SQLite
            cols_str = ', '.join([f'"{c}"' for c in common_cols])
            cur_lite.execute(f'SELECT {cols_str} FROM "{table}"')
            rows = cur_lite.fetchall()
            
            if not rows:
                print(f"   Table {table:<35}: 0 rows (empty)")
                continue

            # Prepare rows for PostgreSQL
            processed_rows = []
            for row in rows:
                p_row = []
                for val, col in zip(row, common_cols):
                    dt = pg_tbl_cols[col]
                    if val is None:
                        p_row.append(None)
                    elif dt == 'boolean':
                        p_row.append(bool(val))
                    else:
                        p_row.append(val)
                processed_rows.append(tuple(p_row))

            # Bulk insert into Neon
            placeholders = ', '.join(['%s'] * len(common_cols))
            insert_sql = f'INSERT INTO "{table}" ({cols_str}) VALUES ({placeholders})'
            
            # Execute in batches of 100
            batch_size = 100
            for i in range(0, len(processed_rows), batch_size):
                batch = processed_rows[i:i + batch_size]
                cur_pg.executemany(insert_sql, batch)

            total_migrated += len(rows)
            print(f"   [OK] Table {table:<32}: {len(rows):>4} rows migrated.")

        print(f"\nTotal Records Migrated from Local SQLite to Neon: {total_migrated}")

    con_lite.close()
    print("=== MIGRATION COMPLETE ===")

if __name__ == '__main__':
    migrate_sqlite_to_neon()

