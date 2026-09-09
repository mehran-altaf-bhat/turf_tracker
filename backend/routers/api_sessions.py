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


@router.post("")
def create_session(data: CreateSessionRequest, admin: dict = Depends(require_admin)):
    db = service_client()
    try:
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
        return {"message": "Session created successfully", "session": res.data[0] if res.data else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


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
