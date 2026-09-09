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
    
    current_cost = current_session.get("cost_per_person", 200) if current_session else 200
    cur_status = current_payment.get("status", "unpaid") if current_payment else "unpaid"
    cur_amount_paid = current_payment.get("amount", 0) if (current_payment and cur_status in ["confirmed", "partial", "pending"]) else 0
    cur_balance = max(0, current_cost - cur_amount_paid) if cur_status in ["partial", "confirmed"] else current_cost

    # If confirmed but amount is less than session cost, mark as partial
    if cur_status == "confirmed" and cur_balance > 0:
        cur_status = "partial"

    if current_payment:
        raw_cur_ref = current_payment.get("upi_ref") or ""
        cur_screenshot = None
        cur_display = raw_cur_ref
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
            "amount_paid": cur_amount_paid,
            "payable": current_cost,
            "balance": cur_balance,
            "status": cur_status,
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
                sp_status = sp.get("status", "unpaid")
                sp_amount = sp.get("amount", 0) if sp_status in ["confirmed", "partial", "pending"] else 0
                sp_balance = max(0, current_cost - sp_amount)
                display_sp_status = sp_status
                if sp_status == "confirmed" and sp_balance > 0:
                    display_sp_status = "partial"

                playing_squad.append({
                    "user_id": sp["user_id"],
                    "name": name_map.get(sp["user_id"], "Player"),
                    "status": display_sp_status,
                    "amount": sp_amount,
                    "payable": current_cost,
                    "balance": sp_balance,
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
        p["amount"] for p in payments if p.get("status") in ["confirmed", "partial"]
    )

    # Combined history: ONLY payments that are confirmed (done), partial, or rejected
    import re
    history = []
    for s in sessions:
        p = payments_by_session.get(s["id"])
        if p and p.get("status") in ["confirmed", "partial", "rejected"]:
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
                "payable": s.get("cost_per_person", 200),
                "balance": max(0, s.get("cost_per_person", 200) - p["amount"]) if p.get("status") in ["confirmed", "partial"] else s.get("cost_per_person", 200),
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
        "current_status": cur_status,
        "current_payment": current_payment,
        "payable_amount": current_cost,
        "amount_paid": cur_amount_paid,
        "balance_due": cur_balance if is_in_squad else 0,
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
                "amount_paid": payments_by_session.get(s["id"], {}).get("amount", 0) if payments_by_session.get(s["id"], {}).get("status") in ["confirmed", "partial"] else 0,
                "balance": max(0, s.get("cost_per_person", 200) - (payments_by_session.get(s["id"], {}).get("amount", 0) if payments_by_session.get(s["id"], {}).get("status") in ["confirmed", "partial"] else 0)),
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
        p["session_id"] for p in existing_payments if p.get("status") == "confirmed" and p.get("amount", 0) >= 200
    }

    # Find the next sessions to allocate payment to
    sessions_to_pay = []
    for s in upcoming:
        if s["id"] not in paid_session_ids:
            sessions_to_pay.append(s)
            if len(sessions_to_pay) == data.weeks_count:
                break

    if not sessions_to_pay:
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
        # If user explicitly supplied custom amount (e.g. paying partial balance), use that
        existing_row = [p for p in existing_payments if p["session_id"] == s["id"]]
        existing_paid = 0
        if existing_row and existing_row[0].get("status") in ["confirmed", "partial"]:
            existing_paid = existing_row[0].get("amount", 0)

        this_session_amount = data.amount if (data.amount and data.weeks_count == 1) else cost
        total_session_amount = existing_paid + this_session_amount
        total_amount += this_session_amount

        payload = {
            "user_id": user_id,
            "session_id": s["id"],
            "amount": total_session_amount,
            "upi_ref": combined_ref,
            "status": "pending",
        }

        if existing_row:
            res = db.table("payments").update(payload).eq("id", existing_row[0]["id"]).execute()
        else:
            res = db.table("payments").insert(payload).execute()

        processed.append({
            "session_id": s["id"],
            "session_date": s["session_date"],
            "amount": this_session_amount,
        })

    return {
        "message": f"Payment submitted for {len(processed)} Friday session(s)! Amount: ₹{total_amount}. Waiting for admin confirmation.",
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
            pay_status = pay.get("status")
            pay_amount = pay.get("amount", 0)

            # If user has already paid (confirmed, partial, or pending with funds), shift payment to NEXT match!
            if pay_status in ["confirmed", "partial"] or (pay_status == "pending" and pay_amount > 0):
                ensure_upcoming_sessions(4)
                next_sessions = (
                    db.table("turf_sessions")
                    .select("*")
                    .gt("session_date", session["session_date"])
                    .order("session_date", desc=False)
                    .limit(1)
                    .execute()
                    .data
                )
                if next_sessions:
                    next_session = next_sessions[0]
                    next_cost = next_session.get("cost_per_person", 200)

                    # Check if payment record exists for next session
                    next_existing = db.table("payments").select("*").eq("session_id", next_session["id"]).eq("user_id", user_id).execute().data
                    if next_existing:
                        existing_next_pay = next_existing[0]
                        prev_next_paid = existing_next_pay.get("amount", 0) if existing_next_pay.get("status") in ["confirmed", "partial"] else 0
                        combined_amount = prev_next_paid + pay_amount
                        new_status = "confirmed" if combined_amount >= next_cost else "partial"
                        db.table("payments").update({
                            "amount": combined_amount,
                            "status": new_status,
                            "upi_ref": f"Shifted ₹{pay_amount} from {session['session_date']}. Total credit: ₹{combined_amount}",
                        }).eq("id", existing_next_pay["id"]).execute()
                    else:
                        new_status = "confirmed" if pay_amount >= next_cost else "partial"
                        db.table("payments").insert({
                            "user_id": user_id,
                            "session_id": next_session["id"],
                            "amount": pay_amount,
                            "status": new_status,
                            "upi_ref": f"Shifted ₹{pay_amount} from {session['session_date']}",
                        }).execute()

                    # Remove user from current session squad
                    db.table("payments").delete().eq("id", pay["id"]).execute()

                    balance_due = max(0, next_cost - pay_amount)
                    return {
                        "message": f"You opted out of {session['session_date']}. Your payment of ₹{pay_amount} has been shifted to the next match on {next_session['session_date']}! Next match fee: ₹{next_cost}, Balance due: ₹{balance_due}.",
                        "attending": False,
                        "shifted_credit": pay_amount,
                        "next_session_date": next_session["session_date"],
                        "next_session_fee": next_cost,
                        "balance_due": balance_due,
                    }

            # If user was unpaid or rejected, simply remove from match squad
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

