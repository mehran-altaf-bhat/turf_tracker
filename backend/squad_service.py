try:
    from backend.database import service_client
except ImportError:
    from database import service_client


def recalculate_session_squad_split(session_id: int, total_turf_cost: int = 3800) -> dict:
    """
    Recalculates equal split of the total turf booking fee (default ₹3,800)
    across all active playing squad players for the given session.
    
    1. Finds all payments for this session (excluding admin users).
    2. Computes split_cost = round(total_turf_cost / squad_count) if squad_count > 0 else total_turf_cost.
    3. Updates turf_sessions.cost_per_person to split_cost.
    4. Updates all 'unpaid' and 'rejected' payments for this session to split_cost.
    5. Returns summary dict: {squad_count, split_cost, total_turf_cost}.
    """
    db = service_client()
    
    # 1. Fetch session
    sess_res = db.table("turf_sessions").select("*").eq("id", session_id).single().execute()
    if not sess_res.data:
        return {"squad_count": 0, "split_cost": total_turf_cost, "total_turf_cost": total_turf_cost}
    
    # 2. Get admin profiles to exclude
    admin_profiles = db.table("profiles").select("id").eq("role", "admin").execute().data or []
    admin_ids = {a["id"] for a in admin_profiles}
    
    # 3. Get all active payments for this session
    session_payments = db.table("payments").select("*").eq("session_id", session_id).execute().data or []
    squad_payments = [p for p in session_payments if p["user_id"] not in admin_ids]
    squad_count = len(squad_payments)
    
    if squad_count > 0:
        split_cost = round(total_turf_cost / squad_count)
    else:
        split_cost = total_turf_cost
        
    # 4. Update session cost_per_person in turf_sessions table
    db.table("turf_sessions").update({"cost_per_person": split_cost}).eq("id", session_id).execute()
    
    # 5. Update unpaid or rejected payments to the new split amount
    for pay in squad_payments:
        if pay.get("status") in ["unpaid", "rejected"]:
            db.table("payments").update({"amount": split_cost}).eq("id", pay["id"]).execute()
            
    return {
        "session_id": session_id,
        "squad_count": squad_count,
        "split_cost": split_cost,
        "total_turf_cost": total_turf_cost,
    }
