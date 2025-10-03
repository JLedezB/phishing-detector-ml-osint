# app/routes.py
# -----------------------------
# Endpoints:
# - Status, db/ping, analyze, emails
# - Registro/Login con JWT
# -----------------------------

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from bson import ObjectId
from jose import JWTError, jwt
from passlib.context import CryptContext
import re
import os

from .models import EmailIn, AnalyzeResult, UserIn, UserInDB, Token, TokenData
from .db import get_collection

router = APIRouter()

# =========================
# Configuración de seguridad
# =========================
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey123")  # ⚠️ cámbiala en prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


async def get_user(username: str):
    col = get_collection("users")
    user = await col.find_one({"username": username})
    if user:
        return UserInDB(username=user["username"], hashed_password=user["hashed_password"])
    return None


async def authenticate_user(username: str, password: str):
    user = await get_user(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="No se pudo validar el token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = await get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


# =========================
# Endpoints de Autenticación
# =========================
@router.post("/register", response_model=Token)
async def register(user: UserIn):
    col = get_collection("users")
    existing = await col.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Usuario ya existe")

    hashed_pw = get_password_hash(user.password)
    await col.insert_one({"username": user.username, "hashed_password": hashed_pw})

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    return {"username": current_user.username}


# =========================
# Reglas heurísticas (emails)
# =========================
KEYWORDS_URGENCY = [
    "urgente", "verifica", "bloqueada", "bloqueado", "reactiva", "reactivar",
    "24 horas", "inmediatamente", "suspensión", "cierre", "premio", "ganaste",
    "confirmar", "actualiza", "restablecer", "restaurar"
]
URL_SHORTENERS = ["bit.ly", "t.co", "tinyurl.com", "ow.ly", "buff.ly", "is.gd", "rebrand.ly"]
SUS_DOMAINS_HINTS = [
    r"[a-z0-9-]+\.(ru|cn|tk|top|gq|ml|ga)$",
    r"[a-z0-9-]+\.[a-z0-9-]+\.(info|biz)$",
]
URL_REGEX = re.compile(r"https?://[^\s)>\]]+", re.IGNORECASE)


def _doc_to_dict(doc: dict) -> dict:
    """Convierte _id a string y limpia documento para JSON."""
    if not doc:
        return {}
    out = dict(doc)
    if "_id" in out and isinstance(out["_id"], ObjectId):
        out["analysis_id"] = str(out["_id"])
        del out["_id"]
    return out


def _score_email(data: EmailIn) -> AnalyzeResult:
    score = 0
    reasons: list[str] = []
    indicators = {"found_urls": [], "shorteners": [], "keywords": [], "auth_fail": []}
    text = f"{data.subject}\n{data.body}".lower()

    hit_kw = [kw for kw in KEYWORDS_URGENCY if kw in text]
    if hit_kw:
        score += min(30, 5 * len(hit_kw))
        reasons.append(f"Lenguaje de urgencia detectado ({', '.join(hit_kw)})")
        indicators["keywords"] = hit_kw

    urls = URL_REGEX.findall(text)
    if urls:
        indicators["found_urls"] = urls
        score += 10

        short_hits = [u for u in urls if any(s in u for s in URL_SHORTENERS)]
        if short_hits:
            score += 15
            reasons.append("Uso de acortadores de URL")
            indicators["shorteners"] = short_hits

        sus_hits = []
        for u in urls:
            try:
                host = re.sub(r"^https?://", "", u).split("/")[0].lower()
            except Exception:
                host = ""
            if any(re.search(p, host) for p in SUS_DOMAINS_HINTS):
                sus_hits.append(host)
        if sus_hits:
            score += 15
            reasons.append("Dominios con patrones sospechosos")
            indicators["sus_domains"] = list(set(sus_hits))

    if data.headers and isinstance(data.headers, dict):
        auth = str(data.headers.get("Authentication-Results", "")).lower()
        fail_flags = [mech for mech in ("spf", "dkim", "dmarc") if f"{mech}=fail" in auth or f"{mech}=none" in auth]
        if fail_flags:
            score += 10 + 5 * (len(fail_flags) - 1)
            reasons.append(f"Fallo de autenticación ({', '.join(fail_flags).upper()})")
            indicators["auth_fail"] = fail_flags

    sender = str(data.sender).lower()
    if any(x in sender for x in ["support@", "soporte@", "help@", "billing@", "facturacion@"]):
        score += 5
        reasons.append("Remitente genérico de soporte/facturación")

    score = max(0, min(100, score))
    if score >= 80:
        label = "phishing"
    elif score >= 50:
        label = "sospechoso"
    else:
        label = "legitimo"

    if not reasons:
        reasons.append("Sin indicadores de riesgo relevantes en reglas base")

    return AnalyzeResult(risk_score=score, label=label, reasons=reasons, indicators=indicators)


# =========================
# Endpoints de Emails
# =========================
@router.get("/status")
def get_status():
    return {"status": "ok", "message": "Backend en FastAPI funcionando"}


@router.get("/db/ping")
async def db_ping():
    col = get_collection("health")
    doc = {"ok": True, "ts": datetime.utcnow()}
    await col.insert_one(doc)
    count = await col.count_documents({})
    return {"mongo_connected": True, "health_docs": count}


@router.post("/analyze")
async def analyze_email(email: EmailIn, current_user: UserInDB = Depends(get_current_user)):
    if not email.subject.strip() or not email.body.strip():
        raise HTTPException(status_code=400, detail="Subject y body son obligatorios")

    result = _score_email(email)
    doc = {"email": email.model_dump(), "result": result.model_dump(), "created_at": datetime.utcnow()}
    col = get_collection("emails")
    res = await col.insert_one(doc)

    return {"analysis_id": str(res.inserted_id), **result.model_dump()}


@router.get("/emails")
async def list_emails(limit: int = 20, current_user: UserInDB = Depends(get_current_user)):
    limit = max(1, min(limit, 100))
    col = get_collection("emails")
    cursor = col.find({}, {"email.body": 0}).sort("created_at", -1).limit(limit)

    items = [ _doc_to_dict(doc) async for doc in cursor ]
    return {"count": len(items), "items": items}


@router.get("/emails/{analysis_id}")
async def get_email_analysis(analysis_id: str, current_user: UserInDB = Depends(get_current_user)):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="analysis_id inválido")

    col = get_collection("emails")
    doc = await col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")

    return _doc_to_dict(doc)
