from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel
from backend import auth

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup_endpoint(data: SignupRequest):
    try:
        res = auth.signup(email=data.email, password=data.password, name=data.name)
        return {
            "message": "Account created successfully! You can now log in.",
            "user": {
                "id": res.user.id if res and res.user else None,
                "email": data.email,
                "name": data.name,
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

    user_info = {
        "id": result.user.id,
        "email": result.user.email,
        "name": profile_data.get("name") or data.email.split("@")[0],
        "role": profile_data.get("role", "user"),
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
