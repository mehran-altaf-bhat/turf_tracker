"""
Authentication helpers bridging to backend.auth (PostgreSQL backed).
"""

from backend.auth import (
    COOKIE_NAME,
    signup,
    login,
    get_current_user,
    get_optional_user,
    require_admin,
)

__all__ = [
    "COOKIE_NAME",
    "signup",
    "login",
    "get_current_user",
    "get_optional_user",
    "require_admin",
]
