from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import timedelta

from .db import get_collection
from .models import UserCreate, TokenResponse
from .auth_utils import create_access_token
from passlib.context import CryptContext

# Configuración de bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/auth", tags=["auth"])

ACCESS_TOKEN_EXPIRE_MINUTES = 60


# -----------------------------
# Helpers de contraseñas
# -----------------------------
def hash_password(password: str) -> str:
    """
    Hashea la contraseña, recortada a máximo 72 caracteres (límite de bcrypt).
    """
    return pwd_context.hash(password[:72])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica la contraseña, recortando a 72 caracteres.
    """
    return pwd_context.verify(plain_password[:72], hashed_password)


# -----------------------------
# Registro de usuario
# -----------------------------
@router.post("/register")
async def register(user: UserCreate):
    users = get_collection("users")

    # ¿Ya existe?
    if await users.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Usuario ya existe")

    hashed_pw = hash_password(user.password)
    await users.insert_one({"username": user.username, "hashed_password": hashed_pw})

    return {"msg": "✅ Usuario registrado correctamente"}


# -----------------------------
# Login
# -----------------------------
class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    users = get_collection("users")
    user = await users.find_one({"username": data.username})

    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="❌ Credenciales inválidas")

    token = create_access_token(
        {"sub": data.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer"}
