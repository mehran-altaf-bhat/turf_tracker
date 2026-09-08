"""
Auth helpers built on top of Supabase Auth.

Flow:
- Signup/login happen via the Supabase Auth API (handled for us).
- On success, Supabase gives us an access_token (JWT). We store that
  token in an HttpOnly cookie so the browser sends it automatically.
- On each request, `get_current_user` reads the cookie, asks Supabase
  to validate the token and return the user, then looks up that
  user's row in `profiles` (for name/role) using the service client.
- Role checks (`require_admin`) build on top of `get_current_user`.
"""

from fastapi import Request, HTTPException, Depends
from database import anon_client, service_client

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
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not logged in")

    client = anon_client()
    try:
        user_response = client.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")

    user_id = user_response.user.id
    email = user_response.user.email

    # Look up role/name from profiles using the service client
    profile = (
        service_client()
        .table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )

    if not profile.data:
        raise HTTPException(status_code=401, detail="Profile not found")

    return {
        "id": user_id,
        "email": email,
        "name": profile.data.get("name"),
        "role": profile.data.get("role", "user"),
    }


def get_optional_user(request: Request):
    """Like get_current_user but returns None instead of raising, for
    pages (like the login page) that should render either way."""
    try:
        return get_current_user(request)
    except HTTPException:
        return None


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return user
