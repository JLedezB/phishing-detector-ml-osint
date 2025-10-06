# app/auth.py
# -----------------------------
# Autenticación con roles de usuario (user / admin)
# + Funciones administrativas: listar / eliminar usuarios
# -----------------------------

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import timedelta
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from .db import get_collection
from .models import UserCreate, TokenResponse
from .auth_utils import create_access_token

# Configuración general
SECRET_KEY = "supersecretkey123"  # ⚠️ Cambiar en producción
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# -----------------------------
# Helpers de contraseñas
# -----------------------------
def hash_password(password: str) -> str:
    """Hashea la contraseña, recortada a máximo 72 caracteres (límite de bcrypt)."""
    return pwd_context.hash(password[:72])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica la contraseña, recortando a 72 caracteres."""
    return pwd_context.verify(plain_password[:72], hashed_password)


# -----------------------------
# Registro de usuario
# -----------------------------
class RegisterRequest(UserCreate):
    role: str = "user"  # Valor por defecto


@router.post("/register")
async def register(user: RegisterRequest):
    users = get_collection("users")

    # ¿Ya existe?
    if await users.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Usuario ya existe")

    hashed_pw = hash_password(user.password)
    new_user = {
        "username": user.username,
        "hashed_password": hashed_pw,
        "role": user.role,  # Guardamos el rol
    }

    await users.insert_one(new_user)
    return {"msg": f"✅ Usuario '{user.username}' registrado como {user.role}"}


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

    # Incluimos el rol en el token
    token_data = {"sub": data.username, "role": user.get("role", "user")}

    token = create_access_token(
        token_data, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {"access_token": token, "token_type": "bearer"}


# -----------------------------
# Validación de roles
# -----------------------------
def get_current_user(token: str = Depends(oauth2_scheme)):
    """Decodifica el JWT y devuelve los datos del usuario actual."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload  # {"sub": "usuario", "role": "user"/"admin"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


def require_admin(current_user=Depends(get_current_user)):
    """Verifica si el usuario tiene rol admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acceso denegado: se requiere rol administrador",
        )
    return current_user


# -----------------------------
# ADMIN: GESTIÓN DE USUARIOS
# -----------------------------
@router.get("/users", dependencies=[Depends(require_admin)])
async def list_users():
    """Lista todos los usuarios registrados (solo admin)."""
    users = get_collection("users")
    cursor = users.find({}, {"_id": 0, "username": 1, "role": 1})
    return await cursor.to_list(None)


@router.delete("/users/{username}", dependencies=[Depends(require_admin)])
async def delete_user(username: str):
    """Elimina un usuario de la base de datos (solo admin)."""
    users = get_collection("users")
    result = await users.delete_one({"username": username})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # También eliminamos sus correos asociados
    emails = get_collection("emails")
    await emails.delete_many({"owner": username})

    return {"msg": f"🗑️ Usuario '{username}' y sus análisis fueron eliminados"}


# -----------------------------
# Ruta de prueba para admin
# -----------------------------
@router.get("/admin/secret")
async def admin_secret(current_user=Depends(require_admin)):
    """Ruta protegida solo para administradores."""
    return {"msg": f"Bienvenido admin {current_user.get('sub')}"}
