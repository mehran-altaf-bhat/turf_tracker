from datetime import date

from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from auth import require_admin
from database import service_client

router = APIRouter()
templates = Jinja2Templates(directory="templates")


def _all_payments_view():
    """All sessions, each with the list of payments made against it,
    joined with the paying user's name/email."""
    db = service_client()

    sessions = (
        db.table("turf_sessions")
        .select("*")
        .order("session_date", desc=True)
        .execute()
        .data
    )

    payments = db.table("payments").select("*").execute().data
    profiles = db.table("profiles").select("id, name").execute().data
    profile_names = {p["id"]: p.get("name") for p in profiles}

    for p in payments:
        p["profiles"] = {"name": profile_names.get(p.get("user_id"), "Player")}

    payments_by_session = {}
    for p in payments:
        payments_by_session.setdefault(p["session_id"], []).append(p)

    return [
        {"session": s, "payments": payments_by_session.get(s["id"], [])}
        for s in sessions
    ]


@router.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request, admin: dict = Depends(require_admin)):
    data = _all_payments_view()
    return templates.TemplateResponse(
        "admin.html", {"request": request, "admin": admin, "data": data}
    )


@router.post("/admin/sessions/new")
def create_session(
    session_date: str = Form(...),
    cost_per_person: int = Form(200),
    admin: dict = Depends(require_admin),
):
    db = service_client()
    db.table("turf_sessions").insert(
        {"session_date": session_date, "cost_per_person": cost_per_person}
    ).execute()
    return RedirectResponse(url="/admin", status_code=303)


@router.post("/admin/confirm/{payment_id}", response_class=HTMLResponse)
def confirm_payment(request: Request, payment_id: int, admin: dict = Depends(require_admin)):
    db = service_client()
    db.table("payments").update(
        {"status": "confirmed", "confirmed_by": admin["id"], "confirmed_at": "now()"}
    ).eq("id", payment_id).execute()

    updated = db.table("payments").select("*").eq("id", payment_id).single().execute().data
    if updated:
        prof = db.table("profiles").select("name").eq("id", updated["user_id"]).single().execute().data
        updated["profiles"] = prof or {"name": "Player"}
    return templates.TemplateResponse(
        "_payment_row.html", {"request": request, "payment": updated}
    )


@router.post("/admin/reject/{payment_id}", response_class=HTMLResponse)
def reject_payment(request: Request, payment_id: int, admin: dict = Depends(require_admin)):
    db = service_client()
    db.table("payments").update(
        {"status": "rejected", "confirmed_by": admin["id"], "confirmed_at": "now()"}
    ).eq("id", payment_id).execute()

    updated = db.table("payments").select("*").eq("id", payment_id).single().execute().data
    if updated:
        prof = db.table("profiles").select("name").eq("id", updated["user_id"]).single().execute().data
        updated["profiles"] = prof or {"name": "Player"}
    return templates.TemplateResponse(
        "_payment_row.html", {"request": request, "payment": updated}
    )
