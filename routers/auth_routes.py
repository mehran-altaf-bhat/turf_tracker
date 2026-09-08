from fastapi import APIRouter, Request, Form, Response
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.templating import Jinja2Templates

import auth

router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/signup", response_class=HTMLResponse)
def signup_page(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request, "error": None})


@router.post("/signup", response_class=HTMLResponse)
def signup_submit(request: Request, name: str = Form(...), email: str = Form(...), password: str = Form(...)):
    try:
        auth.signup(email=email, password=password, name=name)
    except Exception as e:
        return templates.TemplateResponse(
            "signup.html", {"request": request, "error": str(e)}
        )
    # After signup, send them to login (in case email confirmation is on).
    return RedirectResponse(url="/login?just_signed_up=1", status_code=303)


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request, just_signed_up: str = None):
    return templates.TemplateResponse(
        "login.html",
        {"request": request, "error": None, "just_signed_up": bool(just_signed_up)},
    )


@router.post("/login")
def login_submit(request: Request, email: str = Form(...), password: str = Form(...)):
    try:
        result = auth.login(email=email, password=password)
    except Exception:
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "Invalid email or password", "just_signed_up": False},
        )

    access_token = result.session.access_token
    response = RedirectResponse(url="/dashboard", status_code=303)
    response.set_cookie(
        key=auth.COOKIE_NAME,
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=request.url.scheme == "https",   # HTTPS on Vercel, HTTP supported locally
        max_age=60 * 60 * 24 * 7,  # 7 days
    )
    return response


@router.get("/logout")
def logout():
    response = RedirectResponse(url="/login", status_code=303)
    response.delete_cookie(auth.COOKIE_NAME)
    return response
