# app/routes.py
# -----------------------------
# Endpoints y motor heurístico de análisis de emails
# - Scoring basado en reglas simples
# - Persistencia en MongoDB por usuario
# -----------------------------

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from .models import EmailIn, AnalyzeResult
from .db import get_collection
from datetime import datetime
from bson import ObjectId
import re
from .auth_utils import decode_access_token

router = APIRouter()

# =========================
# Seguridad
# =========================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return payload["sub"]

# =========================
# Reglas heurísticas
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

# =========================
# Helpers
# =========================
def _doc_to_dict(doc: dict) -> dict:
    """Convierte _id a string y limpia documento para JSON."""
    if not doc:
        return {}
    out = dict(doc)
    if "_id" in out and isinstance(out["_id"], ObjectId):
        out["analysis_id"] = str(out["_id"])
        del out["_id"]
    return out

# =========================
# Motor de scoring heurístico
# =========================
def _score_email(data: EmailIn) -> AnalyzeResult:
    score = 0
    reasons: list[str] = []
    indicators = {"found_urls": [], "shorteners": [], "keywords": [], "auth_fail": []}
    text = f"{data.subject}\n{data.body}".lower()

    # 1) Lenguaje de urgencia
    hit_kw = [kw for kw in KEYWORDS_URGENCY if kw in text]
    if hit_kw:
        score += min(30, 5 * len(hit_kw))
        reasons.append(f"Lenguaje de urgencia detectado ({', '.join(hit_kw)})")
        indicators["keywords"] = hit_kw

    # 2) URLs detectadas
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

    # 3) SPF/DKIM/DMARC fallidos
    if data.headers and isinstance(data.headers, dict):
        auth = str(data.headers.get("Authentication-Results", "")).lower()
        fail_flags = [mech for mech in ("spf", "dkim", "dmarc") if f"{mech}=fail" in auth or f"{mech}=none" in auth]
        if fail_flags:
            score += 10 + 5 * (len(fail_flags) - 1)
            reasons.append(f"Fallo de autenticación ({', '.join(fail_flags).upper()})")
            indicators["auth_fail"] = fail_flags

    # 4) Remitente genérico
    sender = str(data.sender).lower()
    if any(x in sender for x in ["support@", "soporte@", "help@", "billing@", "facturacion@"]):
        score += 5
        reasons.append("Remitente genérico de soporte/facturación")

    # Normalización y etiquetado
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
# Endpoints
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
async def analyze_email(email: EmailIn, current_user: str = Depends(get_current_user)):
    if not email.subject.strip() or not email.body.strip():
        raise HTTPException(status_code=400, detail="Subject y body son obligatorios")

    result = _score_email(email)
    doc = {
        "email": email.model_dump(),
        "result": result.model_dump(),
        "owner": current_user,   # 🔑 se guarda el usuario dueño
        "created_at": datetime.utcnow()
    }
    col = get_collection("emails")
    res = await col.insert_one(doc)

    return {"analysis_id": str(res.inserted_id), **result.model_dump()}

@router.get("/emails")
async def list_emails(limit: int = 20, current_user: str = Depends(get_current_user)):
    limit = max(1, min(limit, 100))
    col = get_collection("emails")
    cursor = (
        col.find({"owner": current_user}, {"email.body": 0})
        .sort("created_at", -1)
        .limit(limit)
    )
    items = [_doc_to_dict(doc) async for doc in cursor]
    return {"count": len(items), "items": items}

@router.get("/emails/{analysis_id}")
async def get_email_analysis(analysis_id: str, current_user: str = Depends(get_current_user)):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="analysis_id inválido")

    col = get_collection("emails")
    doc = await col.find_one({"_id": oid, "owner": current_user})
    if not doc:
        raise HTTPException(status_code=404, detail="Análisis no encontrado o no pertenece al usuario")

    return _doc_to_dict(doc)
