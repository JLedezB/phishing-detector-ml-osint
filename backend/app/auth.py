# =====================================================
# app/auth.py
# =====================================================
# Sistema de autenticación con JWT y roles (user/admin)
# + Limpieza automática de Gmail vinculado al iniciar sesión
# =====================================================

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import timedelta
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from .db import get_collection
from .models import UserCreate, TokenResponse
from .auth_utils import create_access_token

# =====================================================
# Configuración general
# =====================================================
SECRET_KEY = "supersecretkey123"  # ⚠️ Cambiar en producción
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# =====================================================
# Helpers de contraseñas
# =====================================================
def hash_password(password: str) -> str:
    """Hashea la contraseña (máx. 72 caracteres)."""
    return pwd_context.hash(password[:72])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseñas con límite de 72 caracteres."""
    return pwd_context.verify(plain_password[:72], hashed_password)


# =====================================================
# Registro
# =====================================================
class RegisterRequest(UserCreate):
    role: str = "user"


@router.post("/register")
async def register(user: RegisterRequest):
    users = get_collection("users")

    if await users.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Usuario ya existe")

    hashed_pw = hash_password(user.password)
    new_user = {"username": user.username, "hashed_password": hashed_pw, "role": user.role}
    await users.insert_one(new_user)
    return {"msg": f"✅ Usuario '{user.username}' registrado correctamente"}


# =====================================================
# Login
# =====================================================
class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    users = get_collection("users")
    user = await users.find_one({"username": data.username})

    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="❌ Credenciales inválidas")

    token_data = {"sub": data.username, "role": user.get("role", "user")}
    token = create_access_token(token_data, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

    # 🔹 Limpieza automática de vínculos Gmail antiguos de otros usuarios
    gmail_users = get_collection("gmail_users")
    await gmail_users.delete_many({"owner": {"$ne": data.username}})

    return {"access_token": token, "token_type": "bearer"}


# =====================================================
# Roles y autenticación
# =====================================================
def get_current_user(token: str = Depends(oauth2_scheme)):
    """Decodifica el token y devuelve payload con username y rol."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


def require_admin(current_user=Depends(get_current_user)):
    """Verifica si el usuario tiene rol admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado: se requiere rol administrador")
    return current_user


# =====================================================
# ADMIN: Gestión de usuarios
# =====================================================
@router.get("/users", dependencies=[Depends(require_admin)])
async def list_users():
    """Lista todos los usuarios (solo admin)."""
    users = get_collection("users")
    cursor = users.find({}, {"_id": 0, "username": 1, "role": 1})
    users_list = [u async for u in cursor]
    return {"users": users_list}


@router.delete("/users/{username}", dependencies=[Depends(require_admin)])
async def delete_user(username: str):
    """Elimina un usuario y sus correos (solo admin)."""
    users = get_collection("users")
    result = await users.delete_one({"username": username})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Limpieza de correos asociados
    emails = get_collection("emails")
    await emails.delete_many({"owner": username})

    return {"msg": f"🗑️ Usuario '{username}' y sus análisis fueron eliminados"}


# =====================================================
# Ruta secreta de admin
# =====================================================
@router.get("/admin/secret")
async def admin_secret(current_user=Depends(require_admin)):
    """Ruta de prueba protegida."""
    return {"msg": f"Bienvenido admin {current_user.get('sub')}"}
