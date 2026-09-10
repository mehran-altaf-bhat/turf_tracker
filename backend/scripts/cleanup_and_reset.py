import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.database import service_client

def cleanup_old_test_data():
    db = service_client()
    print("=== Starting Turf Tracker Data Cleanup ===")

    # 1. Fetch all auth users
    users = db.auth.admin.list_users()
    print(f"Total users found: {len(users)}")

    admin_email = "mehranbhat010@gmail.com"

    deleted_count = 0
    for u in users:
        email = u.email or ""
        # Check if synthetic or test user
        if "@turftracker.local" in email or u.user_metadata.get("is_no_email_user") or u.user_metadata.get("created_by_admin"):
            uid = u.id
            print(f"Deleting synthetic user: {email} ({uid})")
            # delete payments
            try:
                db.table("payments").delete().eq("user_id", uid).execute()
            except Exception as e:
                print(f"Payment delete error for {uid}: {e}")
            # delete profile
            try:
                db.table("profiles").delete().eq("id", uid).execute()
            except Exception as e:
                print(f"Profile delete error for {uid}: {e}")
            # delete auth
            try:
                db.auth.admin.delete_user(uid)
                deleted_count += 1
            except Exception as e:
                print(f"Auth delete error for {uid}: {e}")

    print(f"Deleted {deleted_count} synthetic test users.")

    # 2. Ensure admin account is active, verified and approved
    admin_user = next((u for u in users if (u.email or "").lower() == admin_email.lower()), None)
    if admin_user:
        print(f"Configuring admin account: {admin_email}")
        meta = admin_user.user_metadata or {}
        meta["is_approved"] = True
        meta["role"] = "admin"
        db.auth.admin.update_user_by_id(admin_user.id, {
            "user_metadata": meta,
            "email_confirm": True
        })
        # Profile
        db.table("profiles").upsert({
            "id": admin_user.id,
            "name": meta.get("name") or "Mehran",
            "role": "admin"
        }).execute()
        print("Admin account configured and pre-approved!")

    # 3. Clean up any orphaned profiles
    all_profiles = db.table("profiles").select("*").execute().data
    current_auth_ids = {u.id for u in db.auth.admin.list_users()}
    for p in all_profiles:
        if p["id"] not in current_auth_ids:
            print(f"Deleting orphaned profile: {p.get('name')} ({p['id']})")
            db.table("profiles").delete().eq("id", p["id"]).execute()

    # 4. Clear all old payments for clean slate
    db.table("payments").delete().neq("id", 0).execute()
    print("Payments reset for clean slate.")

    # 5. Clean screenshots bucket
    try:
        files = db.storage.from_("turf_screenshots").list()
        if files:
            filenames = [f["name"] for f in files]
            db.storage.from_("turf_screenshots").remove(filenames)
            print(f"Removed {len(filenames)} old screenshot files.")
    except Exception as e:
        print(f"Screenshot cleanup note: {e}")

    print("=== Cleanup Complete! ===")

if __name__ == "__main__":
    cleanup_old_test_data()
