from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel
from backend import auth

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup_endpoint(data: SignupRequest):
    try:
        res = auth.signup(email=data.email, password=data.password, name=data.name, phone=data.phone)
        return {
            "message": "Account created successfully! Your account is pending admin approval. You will be able to log in once approved by the turf admin.",
            "user": {
                "id": res.user.id if res and res.user else None,
                "email": data.email,
                "name": data.name,
                "is_approved": False,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
def login_endpoint(data: LoginRequest, response: Response):
    try:
        result = auth.login(email=data.email, password=data.password)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not result or not result.session:
        raise HTTPException(status_code=401, detail="Authentication failed. Please verify credentials.")

    access_token = result.session.access_token

    # Fetch profile to get role and name
    from backend.database import service_client
    profile = (
        service_client()
        .table("profiles")
        .select("*")
        .eq("id", result.user.id)
        .single()
        .execute()
    )
    profile_data = profile.data or {}
    user_role = profile_data.get("role", "user")

    # Check approval status: Admin is always approved. Regular users must be approved by admin.
    user_meta = getattr(result.user, "user_metadata", {}) or {}
    is_approved = user_meta.get("is_approved", False)

    if user_role != "admin" and not is_approved:
        raise HTTPException(
            status_code=403,
            detail="Your account is pending admin approval. Please wait for the turf administrator to approve your account."
        )

    user_info = {
        "id": result.user.id,
        "email": result.user.email,
        "name": profile_data.get("name") or data.email.split("@")[0],
        "role": user_role,
        "is_approved": True,
    }

    # Set cookie as well for backward/browser compatibility
    response.set_cookie(
        key=auth.COOKIE_NAME,
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_info,
    }


@router.get("/me")
def get_me(user: dict = Depends(auth.get_current_user)):
    return {"user": user}


@router.post("/logout")
def logout_endpoint(response: Response):
    response.delete_cookie(auth.COOKIE_NAME)
    return {"message": "Logged out successfully"}


class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str


@router.post("/reset-password")
def reset_password_endpoint(data: ResetPasswordRequest):
    from backend.database import service_client
    db = service_client()
    clean_email = data.email.strip().lower()
    clean_pwd = data.new_password.strip()

    if len(clean_pwd) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    users = db.auth.admin.list_users()
    target_user = next((u for u in users if (u.email or "").lower() == clean_email), None)
    if not target_user:
        raise HTTPException(status_code=404, detail=f"No account found with email {data.email}")

    try:
        db.auth.admin.update_user_by_id(target_user.id, {
            "password": clean_pwd,
            "email_confirm": True,
        })
        return {"message": f"Password updated successfully! You can now log in with your new password."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

