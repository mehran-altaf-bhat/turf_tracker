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
    if current_payment:
        raw_cur_ref = current_payment.get("upi_ref") or ""
        if "[screenshot:" in raw_cur_ref:
            import re
            m = re.search(r"\[screenshot:(.*?)\]", raw_cur_ref)
            cur_screenshot = m.group(1) if m else None
            cur_clean = re.sub(r"\[screenshot:.*?\]", "", raw_cur_ref).strip()
            cur_display = "Screenshot Sent"
            if cur_clean and cur_clean != "Screenshot Attached":
                cur_display = f"{cur_clean} (Screenshot Sent)"
            current_payment = {
                **current_payment,
                "upi_ref": cur_display,
                "screenshot_url": cur_screenshot,
            }

    # Get match squad for this Friday (Playing vs Not Playing)
    playing_squad = []
    not_playing_squad = []
    is_in_squad = False

    if current_session:
        session_payments = (
            db.table("payments")
            .select("*")
            .eq("session_id", current_session["id"])
            .execute()
            .data
        )
        all_profiles = db.table("profiles").select("id, name, role").execute().data
        squad_user_ids = set()

        if session_payments:
            name_map = {p["id"]: p.get("name", "Player") for p in all_profiles}
            for sp in session_payments:
                squad_user_ids.add(sp["user_id"])
                playing_squad.append({
                    "user_id": sp["user_id"],
                    "name": name_map.get(sp["user_id"], "Player"),
                    "status": sp.get("status", "unpaid"),
                    "amount": sp.get("amount", current_session.get("cost_per_person", 200)),
                })
            playing_squad.sort(key=lambda x: x["name"].lower())

        is_in_squad = user["id"] in squad_user_ids

        for p in all_profiles:
            if p["id"] not in squad_user_ids:
                not_playing_squad.append({
                    "user_id": p["id"],
                    "name": p.get("name", "Player"),
                    "role": p.get("role", "user"),
                })
        not_playing_squad.sort(key=lambda x: x["name"].lower())

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

    # Combined history: ONLY payments that are confirmed (done) or rejected
    import re
    history = []
    for s in sessions:
        p = payments_by_session.get(s["id"])
        if p and p.get("status") in ["confirmed", "rejected"]:
            raw_ref = p.get("upi_ref") or ""
            screenshot_url = None
            clean_ref = raw_ref
            if "[screenshot:" in raw_ref:
                m = re.search(r"\[screenshot:(.*?)\]", raw_ref)
                if m:
                    screenshot_url = m.group(1)
                    clean_ref = re.sub(r"\[screenshot:.*?\]", "", raw_ref).strip()

            display_ref = "—"
            if clean_ref and clean_ref != "Screenshot Attached":
                display_ref = f"{clean_ref} (Screenshot Sent)" if screenshot_url else clean_ref
            elif screenshot_url or clean_ref == "Screenshot Attached":
                display_ref = "Screenshot Sent"
            elif clean_ref:
                display_ref = clean_ref

            history.append({
                "payment_id": p["id"],
                "session_id": s["id"],
                "session_date": s["session_date"],
                "start_time": s.get("start_time", "20:00"),
                "end_time": s.get("end_time", "22:00"),
                "amount": p["amount"],
                "upi_ref": display_ref,
                "screenshot_url": screenshot_url,
                "status": p.get("status"),
                "submitted_at": p.get("submitted_at"),
                "confirmed_at": p.get("confirmed_at"),
            })
    # Most recent first
    history.sort(key=lambda x: x["session_date"], reverse=True)

    return {
        "current_session": current_session,
        "current_status": current_payment["status"] if current_payment else "unpaid",
        "current_payment": current_payment,
        "current_squad": playing_squad,
        "playing_squad": playing_squad,
        "not_playing_squad": not_playing_squad,
        "is_in_squad": is_in_squad,
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


class RsvpRequest(BaseModel):
    attending: bool  # True = Playing, False = Not Playing


@router.post("/session/{session_id}/rsvp")
def rsvp_session(session_id: int, data: RsvpRequest, user: dict = Depends(get_current_user)):
    db = service_client()
    user_id = user["id"]

    session_res = db.table("turf_sessions").select("*").eq("id", session_id).single().execute()
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    session = session_res.data
    cost = session.get("cost_per_person", 200)

    existing = db.table("payments").select("*").eq("session_id", session_id).eq("user_id", user_id).execute().data

    if not data.attending:
        # User is opting out / not playing
        if existing:
            pay = existing[0]
            if pay.get("status") == "confirmed":
                raise HTTPException(
                    status_code=400,
                    detail="Your payment for this match is already confirmed. Contact admin if you cannot attend."
                )
            # Delete pending or unpaid record, automatically removing player from squad
            db.table("payments").delete().eq("id", pay["id"]).execute()
        return {
            "message": "You have marked yourself as NOT PLAYING. You have been removed from the match squad.",
            "attending": False,
        }
    else:
        # User is opting in / playing
        if not existing:
            db.table("payments").insert({
                "user_id": user_id,
                "session_id": session_id,
                "amount": cost,
                "status": "unpaid",
            }).execute()
        return {
            "message": "You are now added to the Playing squad for this match!",
            "attending": True,
        }

