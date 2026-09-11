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

    # Filter out the dedicated admin from player counts and lists
    player_profiles = [p for p in profiles if p.get("role") != "admin"]

    return {
        "stats": {
            "total_revenue_collected": total_revenue_collected,
            "total_pending_approvals": total_pending_count,
            "total_players_registered": len(player_profiles),
            "total_sessions_count": len(sessions),
        },
        "sessions": sessions_data,
        "current_session": current_session,
        "all_profiles": player_profiles,
    }


@router.get("/session/{session_id}/roster")
def get_session_roster(session_id: int, admin: dict = Depends(require_admin)):
    db = service_client()

    session_res = db.table("turf_sessions").select("*").eq("id", session_id).single().execute()
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    session = session_res.data

    # All profiles (separate players from admin)
    profiles = db.table("profiles").select("*").order("name").execute().data
    profile_map = {p["id"]: p for p in profiles}
    player_profiles = [p for p in profiles if p.get("role") != "admin"]

    # Payments for this session
    payments = (
        db.table("payments")
        .select("*")
        .eq("session_id", session_id)
        .execute()
        .data
    )
    payments_by_user = {p["user_id"]: p for p in payments}

    # The roster contains players who are in the squad for this session (Admin is strictly excluded)
    import re
    roster = []
    session_cost = session.get("cost_per_person", 200)

    for pay in payments:
        user = profile_map.get(pay["user_id"])
        if not user or user.get("role") == "admin":
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

        # Sanitize any legacy auto-generated partial balance calculation note if balance is now cleared
        if balance == 0 and clean_ref and ("(Balance:" in clean_ref or "(Balance Cleared)" in clean_ref):
            clean_ref = "Paid in Full"

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

    # All registered squad players (Admin is strictly excluded from match players list)
    all_registered_players = [
        {
            "id": user["id"],
            "name": user.get("name", "Unknown"),
            "role": "user",
            "is_selected": user["id"] in payments_by_user,
            "status": payments_by_user.get(user["id"], {}).get("status", "not_selected"),
        }
        for user in player_profiles
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
        f"💰 *Total Turf Fee:* ₹3,800",
        f"👥 *Squad:* {len(roster)} Players (Split: ₹{session_cost}/player)",
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
    total_turf_cost: Optional[int] = 3800


@router.post("/session/{session_id}/squad")
def update_session_squad(session_id: int, data: UpdateSquadRequest, admin: dict = Depends(require_admin)):
    db = service_client()
    session_res = db.table("turf_sessions").select("*").eq("id", session_id).single().execute()
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Ensure admin ID is NEVER included in squad player IDs
    admin_profiles = db.table("profiles").select("id").eq("role", "admin").execute().data or []
    admin_ids = {a["id"] for a in admin_profiles}
    target_ids = {pid for pid in data.player_ids if pid not in admin_ids}
    squad_size = len(target_ids)
    total_turf_cost = data.total_turf_cost if (data.total_turf_cost and data.total_turf_cost > 0) else 3800

    # Calculate split per player: e.g. 3800 / 16 = 238
    if squad_size > 0:
        cost = round(total_turf_cost / squad_size)
    else:
        cost = session_res.data.get("cost_per_person", 200)

    # Update session's cost_per_person
    db.table("turf_sessions").update({"cost_per_person": cost}).eq("id", session_id).execute()

    # Fetch current payments for this session
    existing = db.table("payments").select("*").eq("session_id", session_id).execute().data
    existing_by_user = {p["user_id"]: p for p in existing}

    # 1. Add players who are not in this session yet with split fee
    for uid in target_ids:
        if uid not in existing_by_user:
            db.table("payments").insert({
                "user_id": uid,
                "session_id": session_id,
                "amount": cost,
                "status": "unpaid",
            }).execute()
        elif existing_by_user[uid].get("status") == "unpaid":
            # Update unpaid players to new split amount
            db.table("payments").update({"amount": cost}).eq("id", existing_by_user[uid]["id"]).execute()

    # 2. Remove players who were unchecked and have status == 'unpaid'
    for uid, pay in existing_by_user.items():
        if uid not in target_ids and pay.get("status") == "unpaid":
            db.table("payments").delete().eq("id", pay["id"]).execute()

    return {
        "message": f"Squad confirmed with {squad_size} players! Turf fee of ₹{total_turf_cost} split to ₹{cost}/player.",
        "squad_size": squad_size,
        "total_turf_cost": total_turf_cost,
        "split_per_player": cost,
    }


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
    if "(Balance:" in prev_ref or "Paid ₹" in prev_ref:
        new_ref = "Paid in Full"
    elif "Balance Cleared" not in prev_ref:
        new_ref = f"{prev_ref} (Balance Cleared)".strip() if prev_ref else "Paid in Full"
    else:
        new_ref = prev_ref

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

    if data.note:
        ref = data.note
    elif balance == 0:
        existing_ref = pay.get("upi_ref") or ""
        ref = "Paid in Full" if ("(Balance:" in existing_ref or "Paid ₹" in existing_ref or not existing_ref) else existing_ref
    elif amount > 0:
        ref = f"Partial: Paid ₹{amount} (Balance: ₹{balance})"
    else:
        ref = None

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


@router.post("/users/{user_id}/approve")
def approve_user(user_id: str, admin: dict = Depends(require_admin)):
    db = service_client()
    try:
        user_res = db.auth.admin.get_user_by_id(user_id)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=404, detail="User not found")
        meta = user_res.user.user_metadata or {}
        meta["is_approved"] = True
        db.auth.admin.update_user_by_id(user_id, {
            "user_metadata": meta,
            "email_confirm": True,
        })
        player_name = meta.get("name") or "Player"
        return {"message": f"Account for '{player_name}' approved successfully! They can now log in."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/users/{user_id}")
def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="The administrator cannot delete their own account.")
    db = service_client()
    target_prof = db.table("profiles").select("role").eq("id", user_id).execute().data
    if target_prof and target_prof[0].get("role") == "admin":
        raise HTTPException(status_code=400, detail="The dedicated administrator account cannot be deleted.")

    try:
        # 1. Delete associated payments
        db.table("payments").delete().eq("user_id", user_id).execute()
        # 2. Delete profile
        db.table("profiles").delete().eq("id", user_id).execute()
        # 3. Delete from Supabase auth
        try:
            db.auth.admin.delete_user(user_id)
        except Exception as auth_err:
            print("Auth delete warning:", auth_err)
        return {"message": "User and all associated records removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RemoveUserByNameRequest(BaseModel):
    name: str


@router.post("/users/remove-by-name")
def remove_user_by_name(data: RemoveUserByNameRequest, admin: dict = Depends(require_admin)):
    clean_name = data.name.strip().lower()
    db = service_client()
    profiles = db.table("profiles").select("*").execute().data
    target = next((p for p in profiles if p.get("name", "").strip().lower() == clean_name), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"No user found matching '{data.name}'")
    if target["id"] == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    return delete_user(target["id"], admin)


@router.post("/clear-all-data")
def clear_all_payments_data(admin: dict = Depends(require_admin)):
    db = service_client()
    try:
        # Clear all payments
        db.table("payments").delete().neq("id", 0).execute()
        # Clean screenshots
        try:
            files = db.storage.from_("turf_screenshots").list()
            if files:
                filenames = [f["name"] for f in files]
                db.storage.from_("turf_screenshots").remove(filenames)
        except Exception:
            pass
        return {"message": "All payment and match roster records cleared successfully! Fresh clean slate."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear data: {str(e)}")


@router.get("/users")
def get_all_users_detailed(admin: dict = Depends(require_admin)):
    db = service_client()
    profiles = db.table("profiles").select("*").order("name").execute().data

    # Map auth metadata (phone, email, is_no_email_user, is_approved)
    auth_users_map = {}
    try:
        auth_users = db.auth.admin.list_users()
        for u in auth_users:
            meta = getattr(u, "user_metadata", {}) or {}
            auth_users_map[u.id] = {
                "email": getattr(u, "email", None),
                "phone": meta.get("phone") or getattr(u, "phone", None),
                "is_no_email_user": meta.get("is_no_email_user") or (getattr(u, "email", "") and "@turftracker.local" in getattr(u, "email", "")),
                "is_approved": meta.get("is_approved"),
            }
    except Exception as e:
        print("Auth list error:", e)

    # Get payments stats per user
    payments = db.table("payments").select("user_id, amount, status").execute().data
    user_stats = {}
    for p in payments:
        uid = p["user_id"]
        stats = user_stats.setdefault(uid, {"total_paid": 0, "matches_count": 0})
        if p.get("status") in ["confirmed", "partial"]:
            stats["total_paid"] += p.get("amount", 0)
        stats["matches_count"] += 1

    result = []
    for p in profiles:
        uid = p["id"]
        auth_info = auth_users_map.get(uid, {})
        stats = user_stats.get(uid, {"total_paid": 0, "matches_count": 0})
        
        # Admin is always approved; regular users depend on is_approved in metadata (defaults to False if None)
        is_admin_user = (p.get("role") == "admin")
        is_approved = True if is_admin_user else (auth_info.get("is_approved") is True)

        result.append({
            "id": uid,
            "name": p.get("name") or "Player",
            "role": p.get("role") or "user",
            "created_at": p.get("created_at"),
            "email": auth_info.get("email"),
            "phone": auth_info.get("phone"),
            "is_no_email_user": auth_info.get("is_no_email_user", False),
            "is_approved": is_approved,
            "total_paid": stats["total_paid"],
            "matches_count": stats["matches_count"],
        })

    # Separate players from the system administrator
    player_list = [u for u in result if u.get("role") != "admin"]
    admin_user = next((u for u in result if u.get("role") == "admin"), None)
    pending_count = sum(1 for u in player_list if not u.get("is_approved"))

    return {
        "users": player_list,
        "admin_user": admin_user,
        "total": len(player_list),
        "pending_count": pending_count,
    }


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None


@router.put("/users/{user_id}")
def update_user(user_id: str, data: UpdateUserRequest, admin: dict = Depends(require_admin)):
    db = service_client()
    clean_name = (data.name or "").strip()

    # Verify user exists
    target_res = db.table("profiles").select("*").eq("id", user_id).single().execute()
    if not target_res.data:
        raise HTTPException(status_code=404, detail="User not found")
    target_profile = target_res.data

    # Admin cannot be user and user cannot be admin: only ONE account will be for the admin separate
    if data.role == "admin" and target_profile.get("role") != "admin":
        raise HTTPException(status_code=400, detail="Players cannot be promoted to admin. Only one separate admin account exists.")
    if data.role == "user" and target_profile.get("role") == "admin":
        raise HTTPException(status_code=400, detail="The dedicated admin account cannot be demoted to regular user.")

    # 1. Update profiles table
    update_data = {}
    if clean_name:
        update_data["name"] = clean_name

    if update_data:
        db.table("profiles").update(update_data).eq("id", user_id).execute()

    # 2. Update auth user metadata (phone and name)
    try:
        user_res = db.auth.admin.get_user_by_id(user_id)
        if user_res and user_res.user:
            current_meta = user_res.user.user_metadata or {}
            if clean_name:
                current_meta["name"] = clean_name
            if data.phone is not None:
                current_meta["phone"] = data.phone.strip()
            db.auth.admin.update_user_by_id(user_id, {"user_metadata": current_meta})
    except Exception as e:
        print("Auth metadata update note:", e)

    return {"message": "Player details updated successfully!"}


class UpdateAdminProfileRequest(BaseModel):
    name: Optional[str] = None
    email: str
    phone: Optional[str] = None


@router.put("/profile")
def update_admin_profile(data: UpdateAdminProfileRequest, admin: dict = Depends(require_admin)):
    """Allow the administrator to change their own email and contact details. Admin cannot be deleted."""
    db = service_client()
    admin_id = admin["id"]

    clean_email = (data.email or "").strip().lower()
    clean_name = (data.name or "").strip()
    clean_phone = (data.phone or "").strip()

    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="A valid admin email address is required.")

    auth_update = {
        "email": clean_email,
        "email_confirm": True,
    }

    try:
        user_res = db.auth.admin.get_user_by_id(admin_id)
        current_meta = user_res.user.user_metadata or {} if user_res and user_res.user else {}
        if clean_name:
            current_meta["name"] = clean_name
        if clean_phone:
            current_meta["phone"] = clean_phone
        auth_update["user_metadata"] = current_meta
        if clean_phone:
            auth_update["phone"] = clean_phone

        db.auth.admin.update_user_by_id(admin_id, auth_update)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update admin email in auth: {str(e)}")

    if clean_name:
        db.table("profiles").update({"name": clean_name}).eq("id", admin_id).execute()

    return {
        "message": "Admin profile and email updated successfully!",
        "admin": {
            "id": admin_id,
            "name": clean_name or admin.get("name"),
            "email": clean_email,
            "phone": clean_phone or admin.get("phone"),
            "role": "admin",
        },
    }



