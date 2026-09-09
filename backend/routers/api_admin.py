from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from backend.auth import require_admin
from backend.database import service_client
from backend.routers.api_sessions import ensure_upcoming_sessions

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/overview")
def get_admin_overview(admin: dict = Depends(require_admin)):
    ensure_upcoming_sessions(4)
    db = service_client()
    today_str = date.today().isoformat()

    # Get all sessions
    sessions = (
        db.table("turf_sessions")
        .select("*")
        .order("session_date", desc=False)
        .execute()
        .data
    )

    # Get all payments and profiles
    payments = db.table("payments").select("*").execute().data
    profiles = db.table("profiles").select("*").execute().data
    profile_map = {p["id"]: p for p in profiles}

    for p in payments:
        p["profiles"] = profile_map.get(p.get("user_id"), {"name": "Player"})

    # Map payments by session
    payments_by_session = {}
    for p in payments:
        payments_by_session.setdefault(p["session_id"], []).append(p)

    total_revenue_collected = sum(
        p["amount"] for p in payments if p.get("status") == "confirmed"
    )
    total_pending_count = sum(
        1 for p in payments if p.get("status") == "pending"
    )

    sessions_data = []
    for s in sessions:
        s_payments = payments_by_session.get(s["id"], [])
        confirmed = [p for p in s_payments if p.get("status") == "confirmed"]
        pending = [p for p in s_payments if p.get("status") == "pending"]
        rejected = [p for p in s_payments if p.get("status") == "rejected"]

        collected = sum(p["amount"] for p in confirmed)
        pending_amount = sum(p["amount"] for p in pending)

        sessions_data.append({
            "session": s,
            "confirmed_count": len(confirmed),
            "pending_count": len(pending),
            "rejected_count": len(rejected),
            "collected_amount": collected,
            "pending_amount": pending_amount,
            "payments": s_payments,
        })

    # Sort sessions by date desc for admin list
    sessions_data.sort(key=lambda x: x["session"]["session_date"], reverse=True)

    # Nearest upcoming session is current
    upcoming = [sd for sd in sessions_data if sd["session"]["session_date"] >= today_str]
    current_session = upcoming[-1] if upcoming else (sessions_data[0] if sessions_data else None)

    return {
        "stats": {
            "total_revenue_collected": total_revenue_collected,
            "total_pending_approvals": total_pending_count,
            "total_players_registered": len(profiles),
            "total_sessions_count": len(sessions),
        },
        "sessions": sessions_data,
        "current_session": current_session,
        "all_profiles": profiles,
    }


@router.get("/session/{session_id}/roster")
def get_session_roster(session_id: int, admin: dict = Depends(require_admin)):
    db = service_client()

    session_res = db.table("turf_sessions").select("*").eq("id", session_id).single().execute()
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    session = session_res.data

    # All profiles
    profiles = db.table("profiles").select("*").order("name").execute().data
    profile_map = {p["id"]: p for p in profiles}

    # Payments for this session
    payments = (
        db.table("payments")
        .select("*")
        .eq("session_id", session_id)
        .execute()
        .data
    )
    payments_by_user = {p["user_id"]: p for p in payments}

    # The roster contains players who are in the squad for this session
    import re
    roster = []
    session_cost = session.get("cost_per_person", 200)

    for pay in payments:
        user = profile_map.get(pay["user_id"])
        if not user:
            continue
        raw_ref = pay.get("upi_ref") or ""
        screenshot_url = None
        clean_ref = raw_ref
        if "[screenshot:" in raw_ref:
            m = re.search(r"\[screenshot:(.*?)\]", raw_ref)
            if m:
                screenshot_url = m.group(1)
                clean_ref = re.sub(r"\[screenshot:.*?\]", "", raw_ref).strip()

        p_status = pay.get("status", "unpaid")
        amount_paid = pay.get("amount", 0) if p_status in ["confirmed", "partial", "pending"] else 0
        balance = max(0, session_cost - amount_paid)

        display_status = p_status
        if p_status == "confirmed" and balance > 0:
            display_status = "partial"

        roster.append({
            "user_id": user["id"],
            "name": user.get("name", "Unknown"),
            "role": user.get("role", "user"),
            "payment": pay,
            "payment_id": pay.get("id"),
            "status": display_status,
            "payable": session_cost,
            "amount_paid": amount_paid,
            "balance": balance,
            "amount": amount_paid,
            "upi_ref": clean_ref or ("Screenshot Uploaded" if screenshot_url else None),
            "screenshot_url": screenshot_url,
            "submitted_at": pay.get("submitted_at"),
        })

    # Sort roster alphabetically by player name
    roster.sort(key=lambda r: r["name"].lower())

    # All registered players with selection state for admin squad selector
    all_registered_players = [
        {
            "id": user["id"],
            "name": user.get("name", "Unknown"),
            "role": user.get("role", "user"),
            "is_selected": user["id"] in payments_by_user,
            "status": payments_by_user.get(user["id"], {}).get("status", "not_selected"),
        }
        for user in profiles
    ]

    # Generate WhatsApp share message for the selected squad
    confirmed_players = [r["name"] for r in roster if r["status"] == "confirmed"]
    partial_players = [r for r in roster if r["status"] == "partial"]
    pending_players = [r["name"] for r in roster if r["status"] == "pending"]
    unpaid_players = [r["name"] for r in roster if r["status"] in ["unpaid", "rejected"]]

    collected = sum(r["amount_paid"] for r in roster if r["status"] in ["confirmed", "partial"])
    expected_total = len(roster) * session_cost

    wa_lines = [
        f"⚽ *Elite Football Turf — Match Squad*",
        f"📅 *Date:* {session['session_date']} (Friday)",
        f"⏰ *Slot:* {session.get('start_time', '20:00')} - {session.get('end_time', '22:00')}",
        f"👥 *Squad:* {len(roster)} Players Selected",
        f"💰 *Fee:* ₹{session_cost} / player",
        f"📊 *Collected:* ₹{collected:,} / ₹{expected_total:,}",
        "",
        f"✅ *PAID IN FULL ({len(confirmed_players)}):*",
    ]
    if confirmed_players:
        for idx, name in enumerate(confirmed_players, 1):
            wa_lines.append(f"{idx}. {name}")
    else:
        wa_lines.append("  (None yet)")

    if partial_players:
        wa_lines.extend(["", f"⚠️ *PARTIAL PAYMENTS ({len(partial_players)}):*"])
        for idx, p in enumerate(partial_players, 1):
            wa_lines.append(f"{idx}. {p['name']} — Paid: ₹{p['amount_paid']} | Balance: ₹{p['balance']}")

    if pending_players:
        wa_lines.extend(["", f"⏳ *PENDING VERIFICATION ({len(pending_players)}):*"])
        for idx, name in enumerate(pending_players, 1):
            wa_lines.append(f"{idx}. {name}")

    if unpaid_players:
        wa_lines.extend(["", f"⚠️ *UNPAID ({len(unpaid_players)}):*"])
        for idx, name in enumerate(unpaid_players, 1):
            wa_lines.append(f"{idx}. {name}")

    wa_lines.extend([
        "",
        f"📲 *Please pay ₹{session_cost} via UPI to confirm your spot!*",
    ])
    whatsapp_text = "\n".join(wa_lines)

    return {
        "session": session,
        "roster": roster,
        "all_registered_players": all_registered_players,
        "summary": {
            "squad_size": len(roster),
            "confirmed_count": len(confirmed_players),
            "pending_count": len(pending_players),
            "unpaid_count": len(unpaid_players),
            "total_collected": collected,
            "expected_total": expected_total,
        },
        "whatsapp_text": whatsapp_text,
    }


class UpdateSquadRequest(BaseModel):
    player_ids: list[str]


@router.post("/session/{session_id}/squad")
def update_session_squad(session_id: int, data: UpdateSquadRequest, admin: dict = Depends(require_admin)):
    db = service_client()
    session_res = db.table("turf_sessions").select("*").eq("id", session_id).single().execute()
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    cost = session_res.data.get("cost_per_person", 200)

    # Fetch current payments for this session
    existing = db.table("payments").select("*").eq("session_id", session_id).execute().data
    existing_by_user = {p["user_id"]: p for p in existing}

    target_ids = set(data.player_ids)

    # 1. Add players who are not in this session yet
    for uid in target_ids:
        if uid not in existing_by_user:
            db.table("payments").insert({
                "user_id": uid,
                "session_id": session_id,
                "amount": cost,
                "status": "unpaid",
            }).execute()

    # 2. Remove players who were unchecked and have status == 'unpaid'
    for uid, pay in existing_by_user.items():
        if uid not in target_ids and pay.get("status") == "unpaid":
            db.table("payments").delete().eq("id", pay["id"]).execute()

    return {"message": f"Match squad updated! {len(target_ids)} player(s) selected."}


@router.post("/session/{session_id}/remove-player/{user_id}")
def remove_player_from_squad(session_id: int, user_id: str, admin: dict = Depends(require_admin)):
    db = service_client()
    res = db.table("payments").delete().eq("session_id", session_id).eq("user_id", user_id).execute()
    return {"message": "Player removed from match squad"}


@router.post("/payments/{payment_id}/confirm")
def confirm_payment(payment_id: int, admin: dict = Depends(require_admin)):
    db = service_client()
    now_str = datetime.utcnow().isoformat()

    pay_res = db.table("payments").select("*").eq("id", payment_id).single().execute()
    if not pay_res.data:
        raise HTTPException(status_code=404, detail="Payment record not found")
    pay = pay_res.data

    session_res = db.table("turf_sessions").select("*").eq("id", pay["session_id"]).single().execute()
    session_cost = session_res.data.get("cost_per_person", 200) if session_res.data else 200

    amount = max(pay.get("amount", 0), session_cost)
    status = "confirmed"

    res = (
        db.table("payments")
        .update({
            "amount": amount,
            "status": status,
            "confirmed_by": admin["id"],
            "confirmed_at": now_str,
        })
        .eq("id", payment_id)
        .execute()
    )
    return {"message": f"Payment confirmed! Paid: ₹{amount}", "payment": res.data[0]}


@router.post("/payments/{payment_id}/clear-balance")
def clear_payment_balance(payment_id: int, admin: dict = Depends(require_admin)):
    db = service_client()
    now_str = datetime.utcnow().isoformat()

    pay_res = db.table("payments").select("*").eq("id", payment_id).single().execute()
    if not pay_res.data:
        raise HTTPException(status_code=404, detail="Payment record not found")
    pay = pay_res.data

    session_res = db.table("turf_sessions").select("*").eq("id", pay["session_id"]).single().execute()
    session_cost = session_res.data.get("cost_per_person", 200) if session_res.data else 200

    prev_ref = pay.get("upi_ref") or ""
    new_ref = prev_ref
    if "Balance Cleared" not in prev_ref:
        new_ref = f"{prev_ref} (Balance Cleared)".strip() if prev_ref else "Paid in Full (Balance Cleared)"

    res = (
        db.table("payments")
        .update({
            "amount": session_cost,
            "status": "confirmed",
            "upi_ref": new_ref,
            "confirmed_by": admin["id"],
            "confirmed_at": now_str,
        })
        .eq("id", payment_id)
        .execute()
    )
    return {
        "message": f"Balance cleared! Player marked as Paid Full (₹{session_cost})",
        "payment": res.data[0] if res.data else None,
        "payable": session_cost,
        "amount_paid": session_cost,
        "balance": 0,
        "status": "confirmed",
    }


class UpdatePaymentAmountRequest(BaseModel):
    amount_paid: int
    note: Optional[str] = None
    status: Optional[str] = None


@router.post("/payments/{payment_id}/update-amount")
def update_payment_amount(payment_id: int, data: UpdatePaymentAmountRequest, admin: dict = Depends(require_admin)):
    db = service_client()
    now_str = datetime.utcnow().isoformat()

    pay_res = db.table("payments").select("*").eq("id", payment_id).single().execute()
    if not pay_res.data:
        raise HTTPException(status_code=404, detail="Payment record not found")
    pay = pay_res.data

    session_res = db.table("turf_sessions").select("*").eq("id", pay["session_id"]).single().execute()
    session_cost = session_res.data.get("cost_per_person", 200) if session_res.data else 200

    amount = max(0, data.amount_paid)
    balance = max(0, session_cost - amount)

    if data.status:
        target_status = data.status
    else:
        if amount >= session_cost:
            target_status = "confirmed"
        elif amount > 0:
            target_status = "partial"
        else:
            target_status = "unpaid"

    ref = data.note or (f"Paid ₹{amount} / ₹{session_cost} (Balance: ₹{balance})" if amount > 0 else None)

    update_payload = {
        "amount": amount,
        "status": target_status,
        "upi_ref": ref or pay.get("upi_ref"),
        "confirmed_by": admin["id"],
        "confirmed_at": now_str,
    }

    res = db.table("payments").update(update_payload).eq("id", payment_id).execute()
    return {
        "message": f"Payment updated! Payable: ₹{session_cost}, Paid: ₹{amount}, Balance: ₹{balance}",
        "payment": res.data[0] if res.data else None,
        "payable": session_cost,
        "amount_paid": amount,
        "balance": balance,
        "status": target_status,
    }


@router.post("/payments/{payment_id}/reject")
def reject_payment(payment_id: int, admin: dict = Depends(require_admin)):
    db = service_client()
    now_str = datetime.utcnow().isoformat()
    res = (
        db.table("payments")
        .update({
            "status": "rejected",
            "confirmed_by": admin["id"],
            "confirmed_at": now_str,
        })
        .eq("id", payment_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return {"message": "Payment marked as rejected", "payment": res.data[0]}


class ManualPayRequest(BaseModel):
    user_id: str
    session_id: int
    amount: int = 200
    payment_method: str = "Cash / Direct"


@router.post("/manual-pay")
def manual_pay_entry(data: ManualPayRequest, admin: dict = Depends(require_admin)):
    db = service_client()
    now_str = datetime.utcnow().isoformat()

    session_res = db.table("turf_sessions").select("*").eq("id", data.session_id).single().execute()
    session_cost = session_res.data.get("cost_per_person", 200) if session_res.data else 200
    target_status = "confirmed" if data.amount >= session_cost else ("partial" if data.amount > 0 else "unpaid")

    # Check if payment already exists
    existing = (
        db.table("payments")
        .select("id")
        .eq("user_id", data.user_id)
        .eq("session_id", data.session_id)
        .execute()
        .data
    )

    payload = {
        "user_id": data.user_id,
        "session_id": data.session_id,
        "amount": data.amount,
        "upi_ref": data.payment_method,
        "status": target_status,
        "confirmed_by": admin["id"],
        "confirmed_at": now_str,
    }

    if existing:
        res = db.table("payments").update(payload).eq("id", existing[0]["id"]).execute()
    else:
        res = db.table("payments").insert(payload).execute()

    balance = max(0, session_cost - data.amount)
    return {
        "message": f"Recorded payment! Payable: ₹{session_cost}, Paid: ₹{data.amount}, Balance: ₹{balance}",
        "payment": res.data[0] if res.data else None,
        "payable": session_cost,
        "amount_paid": data.amount,
        "balance": balance,
    }
