from pydantic import BaseModel
from typing import Optional


class SignupForm(BaseModel):
    name: str
    email: str
    password: str


class LoginForm(BaseModel):
    email: str
    password: str


class PaymentSubmit(BaseModel):
    session_id: int
    amount: int
    upi_ref: Optional[str] = None
