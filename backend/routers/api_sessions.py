from datetime import date, timedelta, datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from backend.auth import require_admin
from backend.database import service_client

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def get_upcoming_friday_dates(count: int = 5) -> list[date]:
    """Return dates for the next `count` Fridays."""
    today = date.today()
    # In Python, Monday is 0 and Friday is 4
    days_ahead = (4 - today.weekday()) % 7
    # If today is Friday, check if it's already late night (optional), otherwise include today
    if days_ahead == 0 and datetime.now().hour >= 22:
        days_ahead = 7

    first_friday = today + timedelta(days=days_ahead)
    return [first_friday + timedelta(weeks=i) for i in range(count)]


def ensure_upcoming_sessions(count: int = 4):
    """Automatically ensure the next upcoming Friday sessions exist in DB."""
    db = service_client()
    dates = get_upcoming_friday_dates(count)

    # Fetch existing session dates
    existing = db.table("turf_sessions").select("session_date").execute().data
    existing_dates = {s["session_date"] for s in existing}

    for f_date in dates:
        f_str = f_date.isoformat()
        if f_str not in existing_dates:
            try:
                db.table("turf_sessions").insert({
                    "session_date": f_str,
                    "start_time": "20:00",
                    "end_time": "22:00",
                    "cost_per_person": 200,
                    "status": "open",
                }).execute()
            except Exception:
                pass


@router.get("")
def list_sessions():
    ensure_upcoming_sessions(4)
    db = service_client()
    today_str = date.today().isoformat()

    all_sessions = (
        db.table("turf_sessions")
        .select("*")
        .order("session_date", desc=False)
        .execute()
        .data
    )

    upcoming = [s for s in all_sessions if s["session_date"] >= today_str]
    past = [s for s in all_sessions if s["session_date"] < today_str]
    past.reverse()  # most recent past first

    return {
        "upcoming": upcoming,
        "past": past,
        "current": upcoming[0] if upcoming else None,
    }


class CreateSessionRequest(BaseModel):
    session_date: str
    start_time: str = "20:00"
    end_time: str = "22:00"
    cost_per_person: int = 200
    status: str = "open"
    populate_all_players: Optional[bool] = False


@router.post("")
def create_session(data: CreateSessionRequest, admin: dict = Depends(require_admin)):
    db = service_client()
    try:
        # Check if session date already exists
        existing = db.table("turf_sessions").select("id").eq("session_date", data.session_date).execute().data
        if existing:
            raise HTTPException(status_code=400, detail=f"A match session already exists for {data.session_date}")

        res = (
            db.table("turf_sessions")
            .insert({
                "session_date": data.session_date,
                "start_time": data.start_time,
                "end_time": data.end_time,
                "cost_per_person": data.cost_per_person,
                "status": data.status,
            })
            .execute()
        )
        new_session = res.data[0] if res.data else None

        # Optionally populate all registered players into this match's squad
        if new_session and data.populate_all_players:
            profiles = db.table("profiles").select("id").execute().data
            for p in profiles:
                try:
                    db.table("payments").insert({
                        "user_id": p["id"],
                        "session_id": new_session["id"],
                        "amount": data.cost_per_person,
                        "status": "unpaid",
                    }).execute()
                except Exception:
                    pass

        return {"message": "Friday match record created successfully!", "session": new_session}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class AddPastFridaysRequest(BaseModel):
    weeks_count: int = 4
    cost_per_person: int = 200
    status: str = "completed"
    populate_all_players: bool = True


@router.post("/add-past-fridays")
def add_past_fridays(data: AddPastFridaysRequest, admin: dict = Depends(require_admin)):
    db = service_client()
    today = date.today()
    # Friday is weekday 4 in python
    days_back = (today.weekday() - 4) % 7
    if days_back == 0:
        days_back = 7
    most_recent_past_friday = today - timedelta(days=days_back)

    past_fridays = [most_recent_past_friday - timedelta(weeks=i) for i in range(data.weeks_count)]

    existing = db.table("turf_sessions").select("session_date").execute().data
    existing_dates = {s["session_date"] for s in existing}
    profiles = db.table("profiles").select("id").execute().data if data.populate_all_players else []

    created_count = 0
    for f_date in past_fridays:
        f_str = f_date.isoformat()
        if f_str not in existing_dates:
            try:
                res = db.table("turf_sessions").insert({
                    "session_date": f_str,
                    "start_time": "20:00",
                    "end_time": "22:00",
                    "cost_per_person": data.cost_per_person,
                    "status": data.status,
                }).execute()
                if res.data and profiles:
                    sid = res.data[0]["id"]
                    for p in profiles:
                        try:
                            db.table("payments").insert({
                                "user_id": p["id"],
                                "session_id": sid,
                                "amount": data.cost_per_person,
                                "status": "unpaid",
                            }).execute()
                        except Exception:
                            pass
                created_count += 1
            except Exception as err:
                print("Insert past friday error:", err)

    return {"message": f"Added {created_count} past Friday match session(s) successfully!", "created_count": created_count}


class UpdateSessionRequest(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    cost_per_person: Optional[int] = None
    status: Optional[str] = None


@router.patch("/{session_id}")
def update_session(session_id: int, data: UpdateSessionRequest, admin: dict = Depends(require_admin)):
    db = service_client()
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    res = db.table("turf_sessions").update(update_data).eq("id", session_id).execute()
    if "cost_per_person" in update_data:
        try:
            db.table("payments").update({"amount": update_data["cost_per_person"]}).eq("session_id", session_id).eq("status", "unpaid").execute()
        except Exception:
            pass

    return {"message": "Session updated", "session": res.data[0] if res.data else None}


@router.delete("/{session_id}")
def delete_session(session_id: int, admin: dict = Depends(require_admin)):
    db = service_client()
    try:
        # Delete associated payments
        db.table("payments").delete().eq("session_id", session_id).execute()
        # Delete session
        res = db.table("turf_sessions").delete().eq("id", session_id).execute()
        return {"message": "Match session removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

