"""
Supabase client helpers.

We keep two clients:
- `anon_client()`  -> used for auth calls (signup/login) and any request made
                      "as the user" (respects whatever access rules exist).
- `service_client()` -> uses the service role key, bypasses RLS entirely.
                      Since we chose to enforce access control in FastAPI
                      code (not RLS), our own route logic decides who's
                      allowed to see/do what, and we use this client for
                      the actual DB reads/writes after that check passes.
"""

import os
from functools import lru_cache
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


@lru_cache
def anon_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


@lru_cache
def service_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
