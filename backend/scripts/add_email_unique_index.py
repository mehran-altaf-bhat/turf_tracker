import os
import sys
sys.path.insert(0, os.getcwd())

from backend.database import service_client

def ensure_unique_email_index():
    db = service_client()
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        print("Creating case-insensitive unique index on users(LOWER(TRIM(email)))...")
        cur.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS users_lower_email_idx ON users (LOWER(TRIM(email)));
        """)
        conn.commit()
        print("Case-insensitive unique email index verified successfully!")
        cur.close()
    finally:
        db.release_connection(conn)

if __name__ == "__main__":
    ensure_unique_email_index()
