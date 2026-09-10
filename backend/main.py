import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import api_auth, api_sessions, api_payments, api_admin

app = FastAPI(
    title="ASEEF XI API",
    description="Backend API for ASEEF XI Friday football payment tracking and match management",
    version="2.0.0",
)

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

# Include API routers
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
