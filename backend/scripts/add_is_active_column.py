import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database import service_client

def migrate_is_active():
    client = service_client()
    conn = client.get_connection()
    try:
        cur = conn.cursor()
        print("Checking users table for is_active...")
        cur.execute("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
        """)
        cur.execute("UPDATE users SET is_active = TRUE WHERE is_active IS NULL;")
        
        print("Checking profiles table for is_active...")
        cur.execute("""
            ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
        """)
        cur.execute("UPDATE profiles SET is_active = TRUE WHERE is_active IS NULL;")
        
        conn.commit()
        print("Migration complete: is_active added and initialized to TRUE for users and profiles!")
    finally:
        client.release_connection(conn)

if __name__ == "__main__":
    migrate_is_active()
