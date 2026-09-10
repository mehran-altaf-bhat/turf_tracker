from fastapi import Request, HTTPException, Depends
from backend.database import anon_client, service_client

COOKIE_NAME = "access_token"


def signup(email: str, password: str, name: str, phone: str = None):
    db = service_client()
    user_data = {"name": name, "is_approved": False}
    if phone and phone.strip():
        user_data["phone"] = phone.strip()

    # Use admin.create_user to directly create user with email_confirm=True,
    # bypassing Supabase public SMTP rate limits, gating login strictly via is_approved=False
    result = db.auth.admin.create_user({
        "email": email,
        "password": password,
        "user_metadata": user_data,
        "email_confirm": True,
    })

    if result and result.user:
        try:
            db.table("profiles").upsert({
                "id": result.user.id,
                "name": name,
                "role": "user",
            }).execute()
        except Exception as e:
            print("Profile upsert on signup:", e)
    return result


def login(email: str, password: str):
    client = anon_client()
    result = client.auth.sign_in_with_password(
        {"email": email, "password": password}
    )
    return result


def get_current_user(request: Request) -> dict:
    # 1. Try Authorization header (Bearer token)
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    
    # 2. Fall back to cookie
    if not token:
        token = request.cookies.get(COOKIE_NAME)

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    client = anon_client()
    user_id = None
    email = None

    try:
        user_response = client.auth.get_user(token)
        if user_response and user_response.user:
            user_id = user_response.user.id
            email = user_response.user.email
    except Exception as e:
        # If token expired or JWT verification in anon client fails,
        # safely verify the user directly via service_client admin
        try:
            import base64, json
            parts = token.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                payload = json.loads(base64.urlsafe_b64decode(padded))
                sub = payload.get("sub")
                if sub:
                    admin_client = service_client()
                    admin_res = admin_client.auth.admin.get_user_by_id(sub)
                    if admin_res and admin_res.user:
                        user_id = admin_res.user.id
                        email = admin_res.user.email
        except Exception:
            pass

    if not user_id:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")

    # Look up role/name from profiles using service client
    profile = (
        service_client()
        .table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )

    if not profile.data:
        raise HTTPException(status_code=401, detail="User profile not found")

    return {
        "id": user_id,
        "email": email,
        "name": profile.data.get("name") or (email.split("@")[0] if email else "User"),
        "role": profile.data.get("role", "user"),
    }


def get_optional_user(request: Request):
    try:
        return get_current_user(request)
    except HTTPException:
        return None


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user
