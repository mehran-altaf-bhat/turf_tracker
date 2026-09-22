from backend.database import service_client

db = service_client()

# Find the admin user
users = db.auth.admin.list_users()
admin = next((u for u in users if u.email == "mehranbhat010@gmail.com"), None)

if admin:
    NEW_PASSWORD = "Aseef@2025"  # Set a new password you'll remember
    db.auth.admin.update_user_by_id(admin.id, {
        "password": NEW_PASSWORD,
        "email_confirm": True,
        "user_metadata": {
            "name": "Mehran",
            "is_approved": True,
            "role": "admin"
        }
    })
    print(f"Password reset for {admin.email}")
    print(f"New password: {NEW_PASSWORD}")
else:
    print("Admin user not found!")
