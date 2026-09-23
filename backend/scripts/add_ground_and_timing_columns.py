import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database import service_client

def check_and_migrate():
    client = service_client()
    conn = client.get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'turf_sessions';
        """)
        cols = cur.fetchall()
        print("Columns in turf_sessions:")
        col_names = []
        for c in cols:
            print(f"  {c[0]} ({c[1]}, default: {c[2]})")
            col_names.append(c[0])

        if "ground_name" not in col_names:
            print("Adding column ground_name to turf_sessions...")
            cur.execute("ALTER TABLE turf_sessions ADD COLUMN IF NOT EXISTS ground_name TEXT DEFAULT 'Elite Football Turf';")
            conn.commit()
            print("Column ground_name added successfully!")
        else:
            print("Column ground_name already exists.")

        cur.execute("UPDATE turf_sessions SET ground_name = 'Elite Football Turf' WHERE ground_name IS NULL;")
        conn.commit()

        # Check system_settings
        cur.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)
        conn.commit()
        print("system_settings ready.")
    finally:
        client.release_connection(conn)

if __name__ == "__main__":
    check_and_migrate()
