from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from auth import get_current_user
from database import service_client

router = APIRouter()
templates = Jinja2Templates(directory="templates")


def _sessions_with_status(user_id: str):
    """Return all turf sessions (past + upcoming) along with this user's
    payment status for each one, newest first."""
    db = service_client()

    sessions = (
        db.table("turf_sessions")
        .select("*")
        .order("session_date", desc=True)
        .execute()
        .data
    )

    payments = (
        db.table("payments")
        .select("*")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    payments_by_session = {p["session_id"]: p for p in payments}

    combined = []
    for s in sessions:
        payment = payments_by_session.get(s["id"])
        combined.append({
            "session": s,
            "payment": payment,
            "status": payment["status"] if payment else "unpaid",
        })
    return combined


@router.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request, user: dict = Depends(get_current_user)):
    rows = _sessions_with_status(user["id"])
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "user": user, "rows": rows},
    )


@router.post("/pay", response_class=HTMLResponse)
def submit_payment(
    request: Request,
    session_id: int = Form(...),
    amount: int = Form(...),
    upi_ref: str = Form(""),
    user: dict = Depends(get_current_user),
):
    db = service_client()

    # Upsert: one payment row per (user, session). If they already have
    # a row (e.g. previously rejected), update it instead of erroring.
    existing = (
        db.table("payments")
        .select("id")
        .eq("user_id", user["id"])
        .eq("session_id", session_id)
        .execute()
        .data
    )

    payload = {
        "user_id": user["id"],
        "session_id": session_id,
        "amount": amount,
        "upi_ref": upi_ref or None,
        "status": "pending",
    }

    if existing:
        db.table("payments").update(payload).eq("id", existing[0]["id"]).execute()
    else:
        db.table("payments").insert(payload).execute()

    return RedirectResponse(url="/dashboard", status_code=303)
