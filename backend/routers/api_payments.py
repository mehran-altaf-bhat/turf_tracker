import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel

from backend.auth import get_current_user
from backend.database import service_client, UPI_VPA, UPI_NAME
from backend.routers.api_sessions import ensure_upcoming_sessions

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.get("/config")
def get_payment_config():
    ensure_upcoming_sessions(1)
    db = service_client()
    today_str = date.today().isoformat()
    session = (
        db.table("turf_sessions")
        .select("cost_per_person")
        .gte("session_date", today_str)
        .order("session_date", desc=False)
        .limit(1)
        .execute()
        .data
    )
    cost = session[0]["cost_per_person"] if session else 200
    return {
        "vpa": UPI_VPA,
        "name": UPI_NAME,
        "cost_per_person": cost,
        "turf_name": "Elite Football Turf",
        "turf_slot": "Friday 8:00 PM - 10:00 PM",
    }


@router.post("/upload-screenshot")
async def upload_screenshot(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size too large (max 10MB)")

    ext = file.filename.split(".")[-1] if "." in (file.filename or "") else "jpg"
    filename = f"screenshot_{user['id'][:8]}_{uuid.uuid4().hex[:8]}.{ext}"

    db = service_client()
    try:
        content_type = file.content_type or "image/jpeg"
        db.storage.from_("turf_screenshots").upload(filename, content, {"content-type": content_type})
        public_url = db.storage.from_("turf_screenshots").get_public_url(filename)
        return {"screenshot_url": public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload screenshot: {str(e)}")


@router.get("/my-status")
def get_my_payment_status(user: dict = Depends(get_current_user)):
    ensure_upcoming_sessions(4)
    db = service_client()
    user_id = user["id"]
    today_str = date.today().isoformat()

    # All sessions
    sessions = (
        db.table("turf_sessions")
        .select("*")
        .order("session_date", desc=False)
        .execute()
        .data
    )

    # All payments for this user
    payments = (
        db.table("payments")
        .select("*")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    payments_by_session = {p["session_id"]: p for p in payments}

    upcoming = [s for s in sessions if s["session_date"] >= today_str]
    past = [s for s in sessions if s["session_date"] < today_str]
    past.reverse()

    # Current session is the nearest upcoming
    current_session = upcoming[0] if upcoming else None
    current_payment = payments_by_session.get(current_session["id"]) if current_session else None

    # Get match squad for this Friday
    current_squad = []
    if current_session:
        session_payments = (
            db.table("payments")
            .select("*")
            .eq("session_id", current_session["id"])
            .execute()
            .data
        )
        if session_payments:
            all_profiles = db.table("profiles").select("id, name").execute().data
            name_map = {p["id"]: p.get("name", "Player") for p in all_profiles}
            for sp in session_payments:
                current_squad.append({
                    "user_id": sp["user_id"],
                    "name": name_map.get(sp["user_id"], "Player"),
                    "status": sp.get("status", "unpaid"),
                    "amount": sp.get("amount", current_session.get("cost_per_person", 200)),
                })
            current_squad.sort(key=lambda x: x["name"].lower())

    # Advance payments are payments made for upcoming sessions after the current one
    advance_sessions = upcoming[1:] if len(upcoming) > 1 else []
    advance_paid_count = 0
    for s in advance_sessions:
        p = payments_by_session.get(s["id"])
        if p and p.get("status") in ["confirmed", "pending"]:
            advance_paid_count += 1

    # Total amount confirmed lifetime
    total_paid_confirmed = sum(
        p["amount"] for p in payments if p.get("status") == "confirmed"
    )

    # Combined history
    history = []
    for s in sessions:
        p = payments_by_session.get(s["id"])
        if p:
            history.append({
                "payment_id": p["id"],
                "session_id": s["id"],
                "session_date": s["session_date"],
                "start_time": s.get("start_time", "20:00"),
                "end_time": s.get("end_time", "22:00"),
                "amount": p["amount"],
                "upi_ref": p.get("upi_ref"),
                "status": p.get("status", "pending"),
                "submitted_at": p.get("submitted_at"),
                "confirmed_at": p.get("confirmed_at"),
            })
    # Most recent first
    history.sort(key=lambda x: x["session_date"], reverse=True)

    return {
        "current_session": current_session,
        "current_status": current_payment["status"] if current_payment else "unpaid",
        "current_payment": current_payment,
        "current_squad": current_squad,
        "advance_credits": advance_paid_count,
        "total_paid_confirmed": total_paid_confirmed,
        "history": history,
        "upcoming_sessions": [
            {
                "session": s,
                "payment": payments_by_session.get(s["id"]),
                "status": payments_by_session.get(s["id"], {}).get("status", "unpaid"),
            }
            for s in upcoming
        ],
    }


class SubmitPaymentRequest(BaseModel):
    weeks_count: int = 1
    upi_ref: Optional[str] = None
    screenshot_url: Optional[str] = None
    amount: Optional[int] = None


@router.post("/submit")
def submit_payment(data: SubmitPaymentRequest, user: dict = Depends(get_current_user)):
    if data.weeks_count < 1 or data.weeks_count > 12:
        raise HTTPException(status_code=400, detail="Weeks count must be between 1 and 12")

    ref = (data.upi_ref or "").strip()
    screenshot_url = (data.screenshot_url or "").strip()

    if not ref and not screenshot_url:
        raise HTTPException(status_code=400, detail="Please provide a UPI reference ID or upload a payment screenshot")

    combined_ref = ref
    if screenshot_url:
        if ref:
            combined_ref = f"{ref} [screenshot:{screenshot_url}]"
        else:
            combined_ref = f"Screenshot Attached [screenshot:{screenshot_url}]"

    # Make sure we have at least weeks_count sessions ahead
    ensure_upcoming_sessions(max(4, data.weeks_count + 1))
    db = service_client()
    today_str = date.today().isoformat()

    # Get upcoming sessions
    upcoming = (
        db.table("turf_sessions")
        .select("*")
        .gte("session_date", today_str)
        .order("session_date", desc=False)
        .execute()
        .data
    )

    # Fetch user's existing payments for these upcoming sessions
    user_id = user["id"]
    existing_payments = (
        db.table("payments")
        .select("*")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    paid_session_ids = {
        p["session_id"] for p in existing_payments if p.get("status") in ["confirmed", "pending"]
    }

    # Find the next `data.weeks_count` sessions that this user hasn't paid for yet
    sessions_to_pay = []
    for s in upcoming:
        if s["id"] not in paid_session_ids:
            sessions_to_pay.append(s)
            if len(sessions_to_pay) == data.weeks_count:
                break

    if not sessions_to_pay:
        # If user has already paid for all upcoming sessions, create more sessions
        ensure_upcoming_sessions(len(upcoming) + data.weeks_count)
        refreshed = (
            db.table("turf_sessions")
            .select("*")
            .gte("session_date", today_str)
            .order("session_date", desc=False)
            .execute()
            .data
        )
        for s in refreshed:
            if s["id"] not in paid_session_ids:
                sessions_to_pay.append(s)
                if len(sessions_to_pay) == data.weeks_count:
                    break

    if not sessions_to_pay:
        raise HTTPException(status_code=400, detail="No available upcoming sessions to allocate payment to")

    processed = []
    total_amount = 0
    for s in sessions_to_pay:
        cost = s.get("cost_per_person", 200)
        total_amount += cost
        payload = {
            "user_id": user_id,
            "session_id": s["id"],
            "amount": cost,
            "upi_ref": combined_ref,
            "status": "pending",
        }

        # Check if row exists (e.g. previously rejected)
        existing_row = [p for p in existing_payments if p["session_id"] == s["id"]]
        if existing_row:
            res = db.table("payments").update(payload).eq("id", existing_row[0]["id"]).execute()
        else:
            res = db.table("payments").insert(payload).execute()

        processed.append({
            "session_id": s["id"],
            "session_date": s["session_date"],
            "amount": cost,
        })

    return {
        "message": f"Payment submitted for {len(processed)} Friday session(s)! Total: ₹{total_amount}. Waiting for admin confirmation.",
        "sessions_covered": processed,
        "total_amount": total_amount,
        "upi_ref": ref,
    }
