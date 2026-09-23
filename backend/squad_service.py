from typing import Optional

try:
    from backend.database import service_client
except ImportError:
    from database import service_client


def recalculate_session_squad_split(session_id: int, total_turf_cost: Optional[int] = None) -> dict:
    """
    Recalculates equal split of the total turf booking fee
    across all active playing squad players for the given session.
    
    1. Finds all payments for this session (excluding admin users).
    2. Determines total turf cost from:
       a. Parameter total_turf_cost (if explicitly passed and > 0)
       b. Stored session total_turf_cost (if > 0)
       c. Stored session cost_per_person * squad_count (if > 0 and squad_count > 0)
       d. Default 3800
    3. Computes split_cost = round(effective_total / squad_count) if squad_count > 0 else effective_total.
    4. Updates turf_sessions.total_turf_cost and cost_per_person.
    5. Updates all 'unpaid' and 'rejected' payments for this session to split_cost.
    6. Returns summary dict: {squad_count, split_cost, total_turf_cost}.
    """
    db = service_client()
    
    # 1. Fetch session
    sess_res = db.table("turf_sessions").select("*").eq("id", session_id).single().execute()
    if not sess_res.data:
        fallback = total_turf_cost if (total_turf_cost and total_turf_cost > 0) else 3800
        return {"squad_count": 0, "split_cost": fallback, "total_turf_cost": fallback}
    session = sess_res.data
    
    # 2. Get admin profiles to exclude
    admin_profiles = db.table("profiles").select("id").eq("role", "admin").execute().data or []
    admin_ids = {a["id"] for a in admin_profiles}
    
    # 3. Get all active payments for this session
    session_payments = db.table("payments").select("*").eq("session_id", session_id).execute().data or []
    squad_payments = [p for p in session_payments if p["user_id"] not in admin_ids]
    squad_count = len(squad_payments)
    
    # 4. Determine effective total turf cost
    if total_turf_cost is not None and total_turf_cost > 0:
        effective_total = int(total_turf_cost)
    elif session.get("total_turf_cost") and int(session["total_turf_cost"]) > 0:
        effective_total = int(session["total_turf_cost"])
    elif session.get("cost_per_person") and int(session["cost_per_person"]) > 0 and squad_count > 0:
        effective_total = int(session["cost_per_person"]) * squad_count
    else:
        effective_total = 3800
        
    if squad_count > 0:
        split_cost = round(effective_total / squad_count)
    else:
        split_cost = effective_total
        
    # 5. Update session in turf_sessions table
    db.table("turf_sessions").update({
        "cost_per_person": split_cost,
        "total_turf_cost": effective_total,
    }).eq("id", session_id).execute()
    
    # 6. Update unpaid or rejected payments to the new split amount
    for pay in squad_payments:
        if pay.get("status") in ["unpaid", "rejected"]:
            db.table("payments").update({"amount": split_cost}).eq("id", pay["id"]).execute()
            
    return {
        "session_id": session_id,
        "squad_count": squad_count,
        "split_cost": split_cost,
        "total_turf_cost": effective_total,
    }

