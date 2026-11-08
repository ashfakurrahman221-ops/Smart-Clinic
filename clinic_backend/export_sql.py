import os
import sys
import django
from django.db import connection

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def export_sql():
    sql_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'neon_seeded_database.sql')
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
              AND table_name NOT LIKE 'django_content_type%'
              AND table_name NOT LIKE 'auth_permission%'
            ORDER BY table_name;
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        with open(sql_file_path, 'w', encoding='utf-8') as f:
            f.write("-- =====================================================================\n")
            f.write("-- SMART CLINIC - COMPLETE NEON POSTGRESQL DATABASE DUMP\n")
            f.write("-- Generated after all Django migrations & logical data seeding\n")
            f.write("-- =====================================================================\n\n")
            f.write("BEGIN;\n\n")
            
            total_records = 0
            for table in tables:
                cursor.execute(f'SELECT COUNT(*) FROM "{table}";')
                count = cursor.fetchone()[0]
                if count == 0:
                    continue
                
                total_records += count
                f.write(f"-- Table: {table} ({count} rows)\n")
                
                cursor.execute(f'SELECT * FROM "{table}";')
                col_names = [desc[0] for desc in cursor.description]
                cols_str = ', '.join([f'"{c}"' for c in col_names])
                
                rows = cursor.fetchall()
                for row in rows:
                    vals = []
                    for val in row:
                        if val is None:
                            vals.append("NULL")
                        elif isinstance(val, (int, float)):
                            vals.append(str(val))
                        elif isinstance(val, bool):
                            vals.append("TRUE" if val else "FALSE")
                        else:
                            # Escape single quotes and format
                            escaped = str(val).replace("'", "''")
                            vals.append(f"'{escaped}'")
                    vals_str = ', '.join(vals)
                    f.write(f'INSERT INTO "{table}" ({cols_str}) VALUES ({vals_str}) ON CONFLICT DO NOTHING;\n')
                f.write("\n")
            
            f.write("COMMIT;\n")
    
    print(f"Exported {total_records} rows across tables to {sql_file_path}")

if __name__ == '__main__':
    export_sql()

