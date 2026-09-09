import os
from pathlib import Path
from functools import lru_cache
from dotenv import load_dotenv, find_dotenv
from supabase import create_client, Client

# Look for .env in current or parent directory
env_path = find_dotenv(usecwd=True)
if env_path:
    load_dotenv(env_path)
else:
    load_dotenv(Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Default UPI settings (from provided QR)
UPI_VPA = os.environ.get("UPI_VPA", "7006869014@hdfc")
UPI_NAME = os.environ.get("UPI_NAME", "FAISAL RASHID BHAT")


@lru_cache
def anon_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError("SUPABASE_URL or SUPABASE_ANON_KEY missing from environment")
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


@lru_cache
def service_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from environment")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
