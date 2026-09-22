"""
Database adapter routing to backend.database (PostgreSQL)
"""

from backend.database import (
    anon_client,
    service_client,
    PostgresClient,
    QueryBuilder,
    ExecuteResult,
    UserObj,
    SessionObj,
    AuthResponse,
    hash_password,
    verify_password,
    UPI_VPA,
    UPI_NAME,
)

__all__ = [
    "anon_client",
    "service_client",
    "PostgresClient",
    "QueryBuilder",
    "ExecuteResult",
    "UserObj",
    "SessionObj",
    "AuthResponse",
    "hash_password",
    "verify_password",
    "UPI_VPA",
    "UPI_NAME",
]
