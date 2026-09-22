import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.routers import api_auth, api_sessions, api_payments, api_admin

from fastapi import Request
from fastapi.responses import JSONResponse

app = FastAPI(
    title="ASEEF XI API",
    description="Backend API for ASEEF XI Friday football payment tracking and match management",
    version="2.0.0",
    redirect_slashes=False,
)

@app.middleware("http")
async def restore_path_middleware(request: Request, call_next):
    # If routed by Vercel rewrite with __path__, restore the original path into ASGI scope
    real_path = request.query_params.get("__path__")
    if real_path:
        request.scope["path"] = real_path
        request.scope["raw_path"] = real_path.encode()
    return await call_next(request)



# Ensure uploads directory exists (use /tmp on Vercel serverless where /var/task is read-only)
if os.environ.get("VERCEL") or not os.access(os.path.dirname(__file__), os.W_OK):
    UPLOAD_DIR = "/tmp/uploads"
else:
    UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

try:
    os.makedirs(os.path.join(UPLOAD_DIR, "turf_screenshots"), exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
except Exception as e:
    print("Warning: could not mount uploads static files:", e)

# Allow CORS for local frontend development and production
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
]

# Allow any Vercel preview/production deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers with both /api and without /api prefixes
# so routes work whether deployed on Vercel (which may strip /api) or locally
for pfx in ["/api", ""]:
    app.include_router(api_auth.router, prefix=pfx)
    app.include_router(api_sessions.router, prefix=pfx)
    app.include_router(api_payments.router, prefix=pfx)
    app.include_router(api_admin.router, prefix=pfx)


@app.get("/api/health")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": "Turf Tracker API",
        "version": "2.0.0",
        "turf": "Elite Football Turf",
    }

# Static SPA fallback for Vercel and production deployments
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
public_dir = os.path.join(root_dir, "public")
frontend_dist = os.path.join(root_dir, "frontend", "dist")
static_dir = public_dir if os.path.exists(public_dir) else frontend_dist

if os.path.exists(static_dir):
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.join(static_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"status": "healthy", "app": "Turf Tracker API"}

