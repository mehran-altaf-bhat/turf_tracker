import os
import sys
import traceback

# Ensure root directory and backend directory are in sys.path for Vercel serverless execution
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")

if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from backend.main import app
    from fastapi import Request
    from fastapi.responses import JSONResponse

    @app.middleware("http")
    async def debug_middleware(request: Request, call_next):
        if request.url.path in ["/api/debug", "/debug"]:
            return JSONResponse({
                "received_path": request.url.path,
                "scope_path": request.scope.get("path"),
                "root_path": request.scope.get("root_path"),
                "routes": [getattr(r, "path", str(r)) for r in app.routes],
            })
        return await call_next(request)
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    err_tb = traceback.format_exc()
    print("FATAL VERCEL APP INIT ERROR:", err_tb)

    app = FastAPI(title="ASEEF XI API - Error Handler")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
    async def fallback_err(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Serverless Function Startup Failed",
                "detail": str(e),
                "traceback": err_tb,
            }
        )
