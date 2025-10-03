# app/models.py
# -----------------------------
# Modelos Pydantic usados en la API
# - Emails (entrada/análisis)
# - Usuarios (registro/login)
# - Tokens JWT
# -----------------------------

from typing import List, Dict, Optional
from pydantic import BaseModel


# -----------------------------
# Emails
# -----------------------------
class EmailIn(BaseModel):
    sender: str
    subject: str
    body: str
    headers: Optional[Dict[str, str]] = None


class AnalyzeResult(BaseModel):
    risk_score: int
    label: str
    reasons: List[str]
    indicators: Dict[str, list]


# -----------------------------
# Usuarios
# -----------------------------
class UserIn(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str


class UserInDB(BaseModel):
    username: str
    hashed_password: str


# -----------------------------
# Tokens JWT
# -----------------------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
