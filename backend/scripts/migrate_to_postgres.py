import os
import sys

# Ensure workspace root is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import psycopg2
import psycopg2.extras
import hashlib
import binascii
from database import service_client as supabase_service_client

PG_HOST = "88.222.215.30"
PG_PORT = 5432
PG_USER = "dbuser"
PG_PASS = "Classic@123"
PG_DB = "turf_tracking"


def hash_password(password: str) -> str:
    salt = hashlib.sha256(os.urandom(60)).hexdigest().encode('ascii')
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    pwdhash = binascii.hexlify(pwdhash)
    return (salt + pwdhash).decode('ascii')


def setup_schema_and_migrate():
    print("Connecting to PostgreSQL...")
    conn = psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        user=PG_USER,
        password=PG_PASS,
        dbname=PG_DB,
        connect_timeout=10
    )
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # 1. Create Schema
    print("Creating tables in PostgreSQL...")
    cur.execute("""
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        is_approved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        phone TEXT,
        is_approved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS turf_sessions (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        session_date DATE NOT NULL UNIQUE,
        start_time TEXT DEFAULT '20:00',
        end_time TEXT DEFAULT '22:00',
        cost_per_person INTEGER DEFAULT 200,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        session_id BIGINT NOT NULL REFERENCES turf_sessions(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        upi_ref TEXT,
        status TEXT DEFAULT 'pending',
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ,
        confirmed_by UUID REFERENCES profiles(id),
        UNIQUE(user_id, session_id)
    );
    """)
    conn.commit()
    print("Schema created successfully!")

    # 2. Extract Data from Supabase
    print("Extracting data from Supabase...")
    sb = supabase_service_client()
    sb_users = sb.auth.admin.list_users()
    sb_profiles = sb.table("profiles").select("*").execute().data
    sb_sessions = sb.table("turf_sessions").select("*").order("id").execute().data
    sb_payments = sb.table("payments").select("*").order("id").execute().data

    print(f"Fetched from Supabase: {len(sb_users)} users, {len(sb_profiles)} profiles, {len(sb_sessions)} sessions, {len(sb_payments)} payments.")

    # 3. Migrate Users & Profiles
    print("Migrating users & profiles...")
    profile_map = {p["id"]: p for p in sb_profiles}
    
    for u in sb_users:
        meta = u.user_metadata or {}
        p = profile_map.get(u.id, {})
        name = p.get("name") or meta.get("name") or u.email.split("@")[0]
        role = p.get("role") or meta.get("role") or "user"
        phone = p.get("phone") or meta.get("phone") or None
        is_approved = p.get("is_approved", True)

        # Default password: Admin@123 for admin, Turf@123 for players
        initial_pw = "Admin@123" if role == "admin" else "Turf@123"
        pw_hash = hash_password(initial_pw)

        cur.execute("""
            INSERT INTO users (id, email, password_hash, name, phone, role, is_approved)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                phone = EXCLUDED.phone,
                is_approved = EXCLUDED.is_approved;
        """, (u.id, u.email, pw_hash, name, phone, role, is_approved))

        cur.execute("""
            INSERT INTO profiles (id, name, role, phone, is_approved)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                phone = EXCLUDED.phone,
                is_approved = EXCLUDED.is_approved;
        """, (u.id, name, role, phone, is_approved))

    conn.commit()
    print("Users & Profiles migrated!")

    # 4. Migrate Turf Sessions (preserving IDs)
    print("Migrating turf sessions...")
    for s in sb_sessions:
        cur.execute("""
            INSERT INTO turf_sessions (id, session_date, start_time, end_time, cost_per_person, status, created_at)
            OVERRIDING SYSTEM VALUE
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                session_date = EXCLUDED.session_date,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                cost_per_person = EXCLUDED.cost_per_person,
                status = EXCLUDED.status;
        """, (s["id"], s["session_date"], s.get("start_time", "20:00"), s.get("end_time", "22:00"), s.get("cost_per_person", 200), s.get("status", "open"), s.get("created_at")))
    
    # Sync identity sequence
    cur.execute("SELECT setval(pg_get_serial_sequence('turf_sessions', 'id'), COALESCE(MAX(id), 1)) FROM turf_sessions;")
    conn.commit()
    print("Turf sessions migrated!")

    # 5. Migrate Payments (preserving IDs)
    print("Migrating payments...")
    for pay in sb_payments:
        cur.execute("""
            INSERT INTO payments (id, user_id, session_id, amount, upi_ref, status, submitted_at, confirmed_at, confirmed_by)
            OVERRIDING SYSTEM VALUE
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                session_id = EXCLUDED.session_id,
                amount = EXCLUDED.amount,
                upi_ref = EXCLUDED.upi_ref,
                status = EXCLUDED.status,
                submitted_at = EXCLUDED.submitted_at,
                confirmed_at = EXCLUDED.confirmed_at,
                confirmed_by = EXCLUDED.confirmed_by;
        """, (pay["id"], pay["user_id"], pay["session_id"], pay["amount"], pay.get("upi_ref"), pay.get("status", "pending"), pay.get("submitted_at"), pay.get("confirmed_at"), pay.get("confirmed_by")))

    # Sync identity sequence
    cur.execute("SELECT setval(pg_get_serial_sequence('payments', 'id'), COALESCE(MAX(id), 1)) FROM payments;")
    conn.commit()
    print("Payments migrated successfully!")

    # Verification counts
    cur.execute("SELECT count(*) FROM users;")
    u_count = cur.fetchone()["count"]
    cur.execute("SELECT count(*) FROM profiles;")
    p_count = cur.fetchone()["count"]
    cur.execute("SELECT count(*) FROM turf_sessions;")
    s_count = cur.fetchone()["count"]
    cur.execute("SELECT count(*) FROM payments;")
    pay_count = cur.fetchone()["count"]

    print(f"VERIFICATION IN POSTGRES: users={u_count}, profiles={p_count}, sessions={s_count}, payments={pay_count}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    setup_schema_and_migrate()
