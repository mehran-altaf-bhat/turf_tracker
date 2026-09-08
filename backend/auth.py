from fastapi import Request, HTTPException, Depends
from backend.database import anon_client, service_client

COOKIE_NAME = "access_token"


def signup(email: str, password: str, name: str):
    client = anon_client()
    result = client.auth.sign_up(
        {
            "email": email,
            "password": password,
            "options": {"data": {"name": name}},
        }
    )
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
    try:
        user_response = client.auth.get_user(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Session expired or invalid: {str(e)}")

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")

    user_id = user_response.user.id
    email = user_response.user.email

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
        "name": profile.data.get("name") or email.split("@")[0],
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
