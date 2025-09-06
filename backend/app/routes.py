from fastapi import APIRouter, HTTPException
from .models import EmailIn, AnalyzeResult
from .db import get_collection
from datetime import datetime
from bson import ObjectId
import re

router = APIRouter()

# =========================
# Reglas heurísticas (baseline)
# =========================
KEYWORDS_URGENCY = [
    "urgente", "verifica", "bloqueada", "bloqueado", "reactiva", "reactivar",
    "24 horas", "inmediatamente", "suspensión", "cierre", "premio", "ganaste",
    "confirmar", "actualiza", "restablecer", "restaurar"
]
URL_SHORTENERS = ["bit.ly", "t.co", "tinyurl.com", "ow.ly", "buff.ly", "is.gd", "rebrand.ly"]
SUS_DOMAINS_HINTS = [
    # Pistas simples: TLD raros, subdominios múltiples, etc.
    r"[a-z0-9-]+\.(ru|cn|tk|top|gq|ml|ga)$",
    r"[a-z0-9-]+\.[a-z0-9-]+\.(info|biz)$",
]
URL_REGEX = re.compile(r"https?://[^\s)>\]]+", re.IGNORECASE)


# =========================
# Helper para serializar ObjectId y limpiar documentos
# =========================
def _doc_to_dict(doc: dict) -> dict:
    """Convierte _id a string y normaliza el documento para respuesta JSON."""
    if not doc:
        return {}
    out = dict(doc)
    if "_id" in out and isinstance(out["_id"], ObjectId):
        out["analysis_id"] = str(out["_id"])
        del out["_id"]
    # Opcional: no exponer cuerpo completo en listados
    return out


# =========================
# Motor de scoring heurístico (mismo baseline, con comentarios)
# =========================
def _score_email(data: EmailIn) -> AnalyzeResult:
    score = 0
    reasons: list[str] = []
    indicators = {
        "found_urls": [],
        "shorteners": [],
        "keywords": [],
        "auth_fail": [],
    }

    text = f"{data.subject}\n{data.body}".lower()

    # 1) Lenguaje de urgencia → suma hasta +30
    hit_kw = [kw for kw in KEYWORDS_URGENCY if kw in text]
    if hit_kw:
        k = min(30, 5 * len(hit_kw))
        score += k
        reasons.append(f"Lenguaje de urgencia detectado ({', '.join(hit_kw)})")
        indicators["keywords"] = hit_kw

    # 2) URLs detectadas → +10 base; acortadores → +15; dominios sospechosos → +15
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

    # 3) SPF/DKIM/DMARC fallidos (si vienen cabeceras) → +10 por el primero, +5 por cada extra
    if data.headers and isinstance(data.headers, dict):
        auth = str(data.headers.get("Authentication-Results", "")).lower()
        fail_flags = []
        for mech in ("spf", "dkim", "dmarc"):
            if f"{mech}=fail" in auth or f"{mech}=none" in auth:
                fail_flags.append(mech)
        if fail_flags:
            add = 10 + 5 * (len(fail_flags) - 1)
            score += add
            reasons.append(f"Fallo de autenticación ({', '.join(fail_flags).upper()})")
            indicators["auth_fail"] = fail_flags

    # 4) Remitente genérico de soporte/facturación (suave) → +5
    sender = str(data.sender).lower()
    if any(x in sender for x in ["support@", "soporte@", "help@", "billing@", "facturacion@"]):
        score += 5
        reasons.append("Remitente genérico de soporte/facturación")

    # Normalización a 0–100 + etiquetado
    score = max(0, min(100, score))
    label = "legitimo"
    if score >= 80:
        label = "phishing"
    elif score >= 50:
        label = "sospechoso"

    if not reasons:
        reasons.append("Sin indicadores de riesgo relevantes en reglas base")

    return AnalyzeResult(
        risk_score=score,
        label=label,
        reasons=reasons,
        indicators=indicators
    )


# =========================
# Endpoints
# =========================

@router.get("/status")
def get_status():
    """Salud básico del backend."""
    return {"status": "ok", "message": "Backend en FastAPI funcionando"}


@router.get("/db/ping")
async def db_ping():
    """
    Prueba de conexión a MongoDB:
    - Inserta un doc en 'health'
    - Devuelve conteo total
    """
    col = get_collection("health")
    doc = {"ok": True, "ts": datetime.utcnow()}
    await col.insert_one(doc)
    count = await col.count_documents({})
    return {"mongo_connected": True, "health_docs": count}


@router.post("/analyze")
async def analyze_email(email: EmailIn):
    """
    Analiza un correo con reglas heurísticas y lo PERSISTE en MongoDB.
    Respuesta incluye:
    - analysis_id (ObjectId como string)
    - risk_score, label, reasons, indicators
    """
    if not email.subject.strip() or not email.body.strip():
        raise HTTPException(status_code=400, detail="Subject y body son obligatorios")

    # 1) Calcular score heurístico
    result = _score_email(email)

    # 2) Persistir documento completo
    doc = {
        "email": email.model_dump(),
        "result": result.model_dump(),
        "created_at": datetime.utcnow(),
    }
    col = get_collection("emails")
    res = await col.insert_one(doc)

    # 3) Responder con analysis_id + resultado
    return {
        "analysis_id": str(res.inserted_id),
        **result.model_dump()
    }


@router.get("/emails")
async def list_emails(limit: int = 20):
    """
    Lista los análisis más recientes (solo metadatos esenciales).
    - Parámetro: ?limit=1..100
    - Oculta body por brevedad en listados
    """
    limit = max(1, min(limit, 100))
    col = get_collection("emails")
    cursor = col.find({}, {"email.body": 0}).sort("created_at", -1).limit(limit)

    items = []
    async for doc in cursor:
        items.append(_doc_to_dict(doc))
    return {"count": len(items), "items": items}


@router.get("/emails/{analysis_id}")
async def get_email_analysis(analysis_id: str):
    """
    Devuelve un análisis por ID (incluye body y detalles completos).
    """
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="analysis_id inválido")

    col = get_collection("emails")
    doc = await col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")

    return _doc_to_dict(doc)
