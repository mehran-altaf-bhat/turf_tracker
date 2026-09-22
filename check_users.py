from backend.database import service_client
db = service_client()
users = db.auth.admin.list_users()
for u in users:
    meta = getattr(u, 'user_metadata', {}) or {}
    print(f"Email: {u.email} | is_approved: {meta.get('is_approved')} | role: {meta.get('role')}")
print(f"Total users: {len(users)}")
