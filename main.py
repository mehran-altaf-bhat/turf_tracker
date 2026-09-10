from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse

from fastapi.middleware.cors import CORSMiddleware
from auth import get_optional_user
from routers import auth_routes, user_routes, admin_routes
from backend.routers import api_auth, api_sessions, api_payments, api_admin

app = FastAPI(title="ASEEF XI — Friday Football")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:8000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Mount new REST API routers
app.include_router(api_auth.router)
app.include_router(api_sessions.router)
app.include_router(api_payments.router)
app.include_router(api_admin.router)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "Turf Tracker API",
        "version": "2.0.0",
        "turf": "Elite Football Turf",
    }

# Legacy template routers
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(admin_routes.router)

import os
from fastapi.responses import FileResponse

dist_dir = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/app", include_in_schema=False)
    @app.get("/app/{path:path}", include_in_schema=False)
    def serve_react_app(path: str = ""):
        return FileResponse(os.path.join(dist_dir, "index.html"))

    @app.get("/", include_in_schema=False)
    def home(request: Request):
        return FileResponse(os.path.join(dist_dir, "index.html"))
else:
    @app.get("/")
    def home(request: Request):
        user = get_optional_user(request)
        if user:
            return RedirectResponse(url="/dashboard")
        return RedirectResponse(url="/login")
