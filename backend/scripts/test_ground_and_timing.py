import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from fastapi.testclient import TestClient
from main import app
from backend.database import service_client

def test_ground_and_timing():
    client = TestClient(app)
    
    # 1. Test config endpoint
    res = client.get("/api/payments/config")
    print("GET /api/payments/config status:", res.status_code)
    data = res.json()
    print("Config data:", data)
    assert "ground_name" in data
    assert "start_time" in data
    assert "end_time" in data
    print("Config test passed!")

    # 2. Get admin user token
    db = service_client()
    admin_user = db.table("profiles").select("*").eq("role", "admin").limit(1).execute().data
    if not admin_user:
        print("No admin user found for patch test.")
        return
    admin_id = admin_user[0]["id"]
    
    import jwt
    from backend.database import JWT_SECRET
    token = jwt.encode({"sub": admin_id, "role": "admin"}, JWT_SECRET, algorithm="HS256")
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get current session
    sessions_res = client.get("/api/sessions")
    curr = sessions_res.json().get("current")
    if not curr:
        print("No current session found.")
        return
    sid = curr["id"]
    print(f"Testing PATCH /api/sessions/{sid}...")

    # Patch ground name and timing
    patch_res = client.patch(
        f"/api/sessions/{sid}",
        headers=headers,
        json={
            "ground_name": "Elite Football Turf - Main Pitch",
            "start_time": "20:30",
            "end_time": "22:30",
            "save_as_default": True
        }
    )
    print("Patch status:", patch_res.status_code)
    print("Patch res:", patch_res.json())
    assert patch_res.status_code == 200

    # Verify updated session
    sess_check = client.get("/api/sessions").json()["current"]
    assert sess_check["ground_name"] == "Elite Football Turf - Main Pitch"
    assert sess_check["start_time"] == "20:30"
    assert sess_check["end_time"] == "22:30"
    print("Session updated successfully!")

    # Restore ground name and timing back to clean values
    restore_res = client.patch(
        f"/api/sessions/{sid}",
        headers=headers,
        json={
            "ground_name": "Elite Football Turf",
            "start_time": "20:00",
            "end_time": "22:00",
            "save_as_default": True
        }
    )
    print("Restored session:", restore_res.json())
    print("ALL TESTS PASSED!")

if __name__ == "__main__":
    test_ground_and_timing()
