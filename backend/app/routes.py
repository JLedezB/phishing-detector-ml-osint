# app/routes.py
# ============================================================
# Endpoints y motor heurístico + ML de análisis de emails
# Integración completa con:
# - OSINT (VirusTotal, PhishTank, OpenPhish, Whois, GeoIP)
# - Dashboard OSINT
# - Persistencia MongoDB
# ============================================================

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import StreamingResponse, RedirectResponse, JSONResponse
from .models import EmailIn, AnalyzeResult
from .db import get_collection
from datetime import datetime
from bson import ObjectId
import re, io, csv, json, os, socket, httpx
from .auth_utils import decode_access_token
from .auth import require_admin
from .ml import extract_features, ml_predict_proba, get_model_info

# Gmail API imports
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

router = APIRouter()

# =========================
# Seguridad
# =========================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    # 🔧 Aceptar tanto "sub" (estándar) como "username" (legacy)
    username = payload.get("sub") or payload.get("username")
    if not username:
        raise HTTPException(status_code=400, detail="Token sin usuario válido")
    return username

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
    if not doc:
        return {}
    out = dict(doc)
    if "_id" in out and isinstance(out["_id"], ObjectId):
        out["analysis_id"] = str(out["_id"])
        del out["_id"]
    return out

def _safe_str(v):
    try:
        return str(v)
    except Exception:
        return ""

# =========================
# Motor heurístico
# =========================
def _score_email(data: EmailIn) -> AnalyzeResult:
    score = 0
    reasons = []
    indicators = {"found_urls": [], "shorteners": [], "keywords": [], "auth_fail": []}
    text = f"{data.subject}\n{data.body}".lower()

    # --- Urgencia ---
    hit_kw = [kw for kw in KEYWORDS_URGENCY if kw in text]
    if hit_kw:
        score += min(30, 5 * len(hit_kw))
        reasons.append(f"Lenguaje de urgencia detectado ({', '.join(hit_kw)})")
        indicators["keywords"] = hit_kw

    # --- URLs ---
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
            host = re.sub(r"^https?://", "", u).split("/")[0].lower()
            if any(re.search(p, host) for p in SUS_DOMAINS_HINTS):
                sus_hits.append(host)
        if sus_hits:
            score += 15
            reasons.append("Dominios con patrones sospechosos")
            indicators["sus_domains"] = list(set(sus_hits))

    # --- Autenticación ---
    if data.headers and isinstance(data.headers, dict):
        auth = str(data.headers.get("Authentication-Results", "")).lower()
        fail_flags = [m for m in ("spf", "dkim", "dmarc") if f"{m}=fail" in auth or f"{m}=none" in auth]
        if fail_flags:
            score += 10 + 5 * (len(fail_flags) - 1)
            reasons.append(f"Fallo de autenticación ({', '.join(fail_flags).upper()})")
            indicators["auth_fail"] = fail_flags

    # --- Remitente ---
    sender = str(data.sender).lower()
    if any(x in sender for x in ["support@", "soporte@", "help@", "billing@", "facturacion@"]):
        score += 5
        reasons.append("Remitente genérico de soporte/facturación")

    # --- Etiqueta final ---
    score = max(0, min(100, score))
    label = "phishing" if score >= 80 else "sospechoso" if score >= 50 else "legitimo"
    if not reasons:
        reasons.append("Sin indicadores de riesgo relevantes")

    return AnalyzeResult(risk_score=score, label=label, reasons=reasons, indicators=indicators)

# =========================
# Endpoints principales
# =========================
@router.get("/status")
def get_status():
    return {"status": "ok", "message": "Backend en FastAPI funcionando"}

@router.post("/analyze")
async def analyze_email(email: EmailIn, current_user: str = Depends(get_current_user)):
    if not email.subject.strip() or not email.body.strip():
        raise HTTPException(status_code=400, detail="Subject y body son obligatorios")

    result = _score_email(email)
    features = extract_features(email, result.indicators)
    ml_proba = ml_predict_proba(features)
    ml_score = int(round(ml_proba * 100))
    combined_score = int(round(0.5 * result.risk_score + 0.5 * ml_score))

    label = "phishing" if combined_score >= 80 else "sospechoso" if combined_score >= 50 else "legitimo"
    result.reasons.append(f"Modelo ML: {ml_score}% prob. phishing ({get_model_info()['mode']})")
    result.indicators["ml_features"] = features

    doc = {
        "email": email.model_dump(),
        "result": {
            **result.model_dump(),
            "risk_score": combined_score,
            "label": label,
            "ml_proba": ml_proba,
            "ml_info": get_model_info(),
        },
        "owner": current_user,
        "created_at": datetime.utcnow(),
    }
    await get_collection("emails").insert_one(doc)
    return {
        "risk_score": combined_score,
        "label": label,
        "reasons": result.reasons,
        "indicators": result.indicators,
        "ml_proba": round(ml_proba, 4),
    }

@router.get("/emails")
async def list_emails(limit: int = 20, current_user: str = Depends(get_current_user)):
    limit = max(1, min(limit, 100))
    col = get_collection("emails")
    cursor = col.find({"owner": current_user}, {"email.body": 0}).sort("created_at", -1).limit(limit)
    items = [_doc_to_dict(doc) async for doc in cursor]
    return {"count": len(items), "items": items}

@router.get("/emails/{analysis_id}")
async def get_email_by_id(analysis_id: str, current_user: str = Depends(get_current_user)):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="analysis_id inválido")
    col = get_collection("emails")
    doc = await col.find_one({"_id": oid, "owner": current_user})
    if not doc:
        raise HTTPException(status_code=404, detail="Análisis no encontrado o no pertenece al usuario")
    return _doc_to_dict(doc)

# =========================
# ADMIN
# =========================
@router.get("/admin/emails", dependencies=[Depends(require_admin)])
async def admin_list_all_emails(limit: int = 100):
    col = get_collection("emails")
    cursor = col.find({}, {"email.subject": 1, "result.label": 1, "owner": 1, "created_at": 1}).sort("created_at", -1).limit(limit)
    items = []
    async for doc in cursor:
        d = _doc_to_dict(doc)
        d["subject"] = doc.get("email", {}).get("subject", "")
        d["label"] = doc.get("result", {}).get("label", "")
        items.append(d)
    return {"count": len(items), "items": items}

@router.get("/ml/info")
def ml_info():
    return get_model_info()

@router.get("/ml/metrics")
def ml_metrics():
    try:
        if os.path.exists("metrics.json"):
            with open("metrics.json", "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print("⚠️ No se pudieron cargar métricas reales:", e)
    return {"accuracy": 0.85, "precision": 0.83, "recall": 0.81, "f1_score": 0.82, "samples": 100, "source": "mock"}

@router.get("/ml/export", dependencies=[Depends(require_admin)])
async def export_ml_results():
    col = get_collection("emails")
    cursor = col.find({}, {"_id": 0})
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Usuario", "Asunto", "Etiqueta", "Score", "Probabilidad ML", "Modelo", "Fecha"])
    async for doc in cursor:
        result = doc.get("result", {})
        email = doc.get("email", {})
        writer.writerow([
            doc.get("owner", "N/A"),
            email.get("subject", "").replace("\n", " "),
            result.get("label", ""),
            result.get("risk_score", ""),
            result.get("ml_proba", ""),
            result.get("ml_info", {}).get("name", ""),
            str(doc.get("created_at")),
        ])
    buffer.seek(0)
    headers = {"Content-Disposition": "attachment; filename=ml_report.csv"}
    return StreamingResponse(iter([buffer.getvalue()]), media_type="text/csv", headers=headers)

# =========================
# OSINT Integration (VirusTotal + PhishTank + OpenPhish + Whois + GeoIP)
# =========================
try:
    import whois as pywhois
except Exception:
    pywhois = None

VT_API_KEY = os.getenv("VT_API_KEY")
IP_API = "http://ip-api.com/json/"
OSINT_CACHE_TTL = int(os.getenv("OSINT_CACHE_TTL", 86400))

def _domain_from_url(u: str) -> str:
    try:
        host = re.sub(r"^https?://", "", u).split("/")[0].lower()
        return host.split(":")[0]
    except Exception:
        return ""

async def _resolve_ip(domain: str) -> str | None:
    try:
        return socket.gethostbyname(domain)
    except Exception:
        return None

# --- Caché OSINT ---
async def _cache_get(col, t, k):
    now = datetime.utcnow()
    doc = await col.find_one({"type": t, "key": k})
    if doc and (now - doc["created_at"]).total_seconds() < OSINT_CACHE_TTL:
        return doc["data"]

async def _cache_set(col, t, k, data):
    try:
        await col.update_one(
            {"type": t, "key": k},
            {"$set": {"data": data, "created_at": datetime.utcnow()}},
            upsert=True
        )
    except Exception as e:
        if "E11000" not in str(e):
            print("⚠️ Error de caché:", e)

async def _geo_ip(ip: str) -> dict:
    if not ip:
        return {}
    col = get_collection("osint_cache")
    c = await _cache_get(col, "ip", ip)
    if c:
        return c
    try:
        async with httpx.AsyncClient(timeout=10) as cx:
            r = await cx.get(f"{IP_API}{ip}")
            if r.status_code == 200:
                j = r.json()
                if j.get("status") == "success":
                    d = {
                        "lat": j.get("lat"),
                        "lon": j.get("lon"),
                        "country": j.get("country"),
                        "isp": j.get("isp"),
                    }
                    await _cache_set(col, "ip", ip, d)
                    return d
    except Exception:
        pass
    return {}

async def _whois_domain(domain: str) -> dict:
    if not pywhois:
        return {}
    col = get_collection("osint_cache")
    c = await _cache_get(col, "whois", domain)
    if c:
        return c
    try:
        w = pywhois.whois(domain)
        d = {
            "registrar": getattr(w, "registrar", None),
            "created": _safe_str(getattr(w, "creation_date", "")),
        }
        await _cache_set(col, "whois", domain, d)
        return d
    except Exception:
        return {}

async def get_virustotal_info(domain: str) -> dict:
    if not VT_API_KEY:
        return {"error": "No API key configurada"}
    col = get_collection("osint_cache")
    c = await _cache_get(col, "vt", domain)
    if c:
        return c
    try:
        async with httpx.AsyncClient(timeout=15) as cx:
            r = await cx.get(
                f"https://www.virustotal.com/api/v3/domains/{domain}",
                headers={"x-apikey": VT_API_KEY}
            )
            if r.status_code == 200:
                j = r.json()
                s = j.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                d = {
                    "malicious": s.get("malicious", 0),
                    "suspicious": s.get("suspicious", 0),
                    "harmless": s.get("harmless", 0),
                    "undetected": s.get("undetected", 0),
                    "reputation": j.get("data", {}).get("attributes", {}).get("reputation", 0),
                }
                await _cache_set(col, "vt", domain, d)
                return d
            else:
                return {"error": f"VT {r.status_code}"}
    except Exception as e:
        return {"error": str(e)}

async def check_phishtank(url: str) -> dict:
    col = get_collection("osint_cache")
    c = await _cache_get(col, "phishtank", url)
    if c:
        return c
    try:
        async with httpx.AsyncClient(timeout=10) as cx:
            r = await cx.post(
                "https://checkurl.phishtank.com/checkurl/",
                data={"url": url, "format": "json"}
            )
            if r.status_code == 200:
                j = r.json().get("results", {})
                d = {
                    "phish_detected": bool(j.get("in_database")),
                    "verified": j.get("verified", False),
                    "detail_page": j.get("phish_detail_page"),
                }
                await _cache_set(col, "phishtank", url, d)
                return d
    except Exception:
        pass
    return {"phish_detected": False}

async def check_openphish(domain: str) -> dict:
    col = get_collection("osint_cache")
    c = await _cache_get(col, "openphish", domain)
    if c:
        return c
    try:
        async with httpx.AsyncClient(timeout=15) as cx:
            r = await cx.get("https://openphish.com/feed.txt")
            if r.status_code == 200:
                urls = r.text.splitlines()
                listed = any(domain in u for u in urls)
                d = {"listed": listed}
                await _cache_set(col, "openphish", domain, d)
                return d
    except Exception:
        pass
    return {"listed": False}

# ============================================================
#  🔍 OSINT ENDPOINTS
# ============================================================

@router.post("/osint/scan")
async def osint_scan(payload: dict, current_user: str = Depends(get_current_user)):
    """
    Enriquecer y guardar datos OSINT para un análisis.
    Usado por frontend: osintScan({ analysis_id, urls })
    """
    col = get_collection("emails")
    urls = payload.get("urls") or []
    base_doc = None

    if payload.get("analysis_id"):
        try:
            oid = ObjectId(payload["analysis_id"])
        except Exception:
            raise HTTPException(status_code=400, detail="analysis_id inválido")
        base_doc = await col.find_one({"_id": oid, "owner": current_user})
        if not base_doc:
            raise HTTPException(status_code=404, detail="Análisis no encontrado")
        # Si no mandan URLs, tomamos las detectadas en el análisis
        if not urls:
            urls = base_doc.get("result", {}).get("indicators", {}).get("found_urls") or []

    # Normalización y deduplicación
    urls = [u for u in urls if isinstance(u, str) and u.startswith("http")]
    urls = list(dict.fromkeys(urls))

    artifacts = []
    for u in urls:
        domain = _domain_from_url(u)
        if not domain:
            continue
        ip = await _resolve_ip(domain)
        geo = await _geo_ip(ip) if ip else {}
        whois_data = await _whois_domain(domain)
        vt = await get_virustotal_info(domain)
        pt = await check_phishtank(u)
        op = await check_openphish(domain)

        artifacts.append({
            "url": u,
            "domain": domain,
            "ip": ip,
            "geo": geo,
            "whois": whois_data,
            "virustotal": vt,
            "phishtank": pt,
            "openphish": op,
        })

    osint = {"scanned_at": datetime.utcnow().isoformat(), "artifacts": artifacts}

    # Persistimos en el análisis si existe
    if base_doc:
        await col.update_one({"_id": base_doc["_id"]}, {"$set": {"osint": osint}})

    return {"ok": True, "cached": True, "count": len(artifacts), "osint": osint}

@router.get("/osint/summary")
async def osint_summary(current_user: str = Depends(get_current_user)):
    """
    Resumen global de OSINT (por usuario)
    """
    col = get_collection("emails")
    cursor = col.find({"owner": current_user, "osint": {"$exists": True}})

    countries, domains, points = {}, {}, []
    risk_stats = {"malicioso": 0, "sospechoso": 0, "limpio": 0}
    total_reputation, total_count = 0, 0

    async for doc in cursor:
        for art in doc.get("osint", {}).get("artifacts", []):
            c = (art.get("geo", {}) or {}).get("country", "N/A")
            d = art.get("domain", "-") or "-"
            vt = art.get("virustotal", {}) or {}

            # Clasificación de riesgo
            if vt.get("malicious", 0) > 0:
                risk = "malicioso"
            elif vt.get("suspicious", 0) > 0:
                risk = "sospechoso"
            else:
                risk = "limpio"

            risk_stats[risk] += 1
            countries[c] = countries.get(c, 0) + 1
            domains[d] = domains.get(d, 0) + 1
            total_reputation += vt.get("reputation", 0) or 0
            total_count += 1

            g = art.get("geo", {}) or {}
            if g.get("lat") is not None and g.get("lon") is not None:
                points.append({
                    "lat": g["lat"],
                    "lon": g["lon"],
                    "domain": d,
                    "country": c,
                    "risk": risk,
                    "color": "#ff4d4d" if risk == "malicioso" else "#ffb84d" if risk == "sospechoso" else "#4dff4d",
                })

    top_countries = [{"country": k, "count": v} for k, v in sorted(countries.items(), key=lambda x: -x[1])[:10]]
    top_domains = [{"domain": k, "count": v, "risk": "desconocido", "country": "-"} for k, v in sorted(domains.items(), key=lambda x: -x[1])[:10]]

    return {
        "countries_count": len(countries),
        "domains_count": len(domains),
        "malicious_total": risk_stats["malicioso"],
        "avg_reputation": round(total_reputation / total_count, 2) if total_count else 0,
        "map_points": points[:200],
        "top_countries": top_countries,
        "top_domains": top_domains,
        "risk_stats": [{"type": k, "value": v} for k, v in risk_stats.items()],
    }

@router.get("/osint/{analysis_id}")
async def get_osint(analysis_id: str, current_user: str = Depends(get_current_user)):
    """
    Ver OSINT guardado para un análisis.
    """
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    col = get_collection("emails")
    doc = await col.find_one({"_id": oid, "owner": current_user})
    if not doc:
        raise HTTPException(status_code=404, detail="Análisis no encontrado o no pertenece al usuario")
    osint = doc.get("osint")
    return {"ok": bool(osint), "osint": osint or None}

# =========================
# OSINT SUMMARY DASHBOARD
# =========================
@router.get("/osint/summary")
async def osint_summary(current_user: str = Depends(get_current_user)):
    """
    Agrega la información de OSINT previamente escaneada por usuario.
    Devuelve: top países, top dominios, puntos para mapa, métricas rápidas.
    """
    col = get_collection("emails")
    cursor = col.find({"owner": current_user, "osint": {"$exists": True}})

    countries, domains, points = {}, {}, []
    risk_stats = {"malicioso": 0, "sospechoso": 0, "limpio": 0}
    total_reputation, total_count = 0, 0

    async for doc in cursor:
        for art in doc.get("osint", {}).get("artifacts", []):
            c = (art.get("geo", {}) or {}).get("country", "N/A")
            d = art.get("domain", "-") or "-"
            vt = art.get("virustotal", {}) or {}

            # Clasificación de riesgo (simple) a partir de VT
            if vt.get("malicious", 0) > 0:
                risk = "malicioso"
            elif vt.get("suspicious", 0) > 0:
                risk = "sospechoso"
            else:
                risk = "limpio"

            risk_stats[risk] = risk_stats.get(risk, 0) + 1
            countries[c] = countries.get(c, 0) + 1
            domains[d] = domains.get(d, 0) + 1

            # Para promedio de reputación
            total_reputation += vt.get("reputation", 0) or 0
            total_count += 1

            # Marcadores de mapa si hay lat/lon
            g = art.get("geo", {}) or {}
            if g.get("lat") is not None and g.get("lon") is not None:
                points.append({
                    "lat": g["lat"],
                    "lon": g["lon"],
                    "domain": d,
                    "country": c,
                    "risk": risk,
                    "color": "#ff4d4d" if risk == "malicioso" else "#ffb84d" if risk == "sospechoso" else "#4dff4d",
                })

    # Top-10 ordenados
    top_countries = [{"country": k, "count": v} for k, v in sorted(countries.items(), key=lambda x: -x[1])[:10]]
    top_domains = [{"domain": k, "count": v, "risk": "desconocido", "country": "-"} for k, v in sorted(domains.items(), key=lambda x: -x[1])[:10]]

    return {
        "countries_count": len(countries),
        "domains_count": len(domains),
        "malicious_total": risk_stats.get("malicioso", 0),
        "avg_reputation": round(total_reputation / total_count, 2) if total_count else 0,
        "map_points": points[:200],  # pequeño límite para UI
        "top_countries": top_countries,
        "top_domains": top_domains,
        "risk_stats": [{"type": k, "value": v} for k, v in risk_stats.items()],
    }

# ============================================================
# ✉️ GMAIL INTEGRATION (OAuth2)
# ============================================================

# ⚠️ ESTA SECCIÓN QUEDA COMENTADA YA QUE FUE REEMPLAZADA POR app/gmail_routes.py
# ⚠️ NO ELIMINES, SOLO COMENTADA PARA EVITAR CONFLICTOS DE RUTAS

# SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
# CLIENT_SECRET_FILE = "app/credentials.json"   # coloca aquí tu client_secret_...json renombrado
# REDIRECT_URI = "http://127.0.0.1:8000/gmail/callback"

# # (memoria simple en proceso: puedes persistir en Mongo si prefieres)
# gmail_tokens = {}

# @router.get("/gmail/authorize")
# def gmail_authorize():
#     flow = Flow.from_client_secrets_file(
#         CLIENT_SECRET_FILE,
#         scopes=SCOPES,
#         redirect_uri=REDIRECT_URI
#     )
#     auth_url, _ = flow.authorization_url(
#         prompt="consent",
#         access_type="offline",
#         include_granted_scopes="true"
#     )
#     return RedirectResponse(auth_url)

# @router.get("/gmail/callback")
# def gmail_callback(code: str):
#     flow = Flow.from_client_secrets_file(
#         CLIENT_SECRET_FILE,
#         scopes=SCOPES,
#         redirect_uri=REDIRECT_URI
#     )
#     flow.fetch_token(code=code)
#     creds = flow.credentials
#     gmail_tokens["default"] = creds.to_json()
#     return JSONResponse({"message": "✅ Autenticación con Gmail completada correctamente."})

# @router.get("/gmail/fetch")
# def gmail_fetch_emails():
#     if "default" not in gmail_tokens:
#         raise HTTPException(status_code=401, detail="Usuario no autenticado con Gmail.")
#     creds = Credentials.from_authorized_user_info(json.loads(gmail_tokens["default"]))
#     service = build("gmail", "v1", credentials=creds)
#     results = service.users().messages().list(userId="me", maxResults=5).execute()
#     messages = results.get("messages", [])
#     emails = []
#     for msg in messages:
#         m = service.users().messages().get(userId="me", id=msg["id"], format="full").execute()
#         headers = m.get("payload", {}).get("headers", [])
#         subject = next((h["value"] for h in headers if h["name"] == "Subject"), "(sin asunto)")
#         sender = next((h["value"] for h in headers if h["name"] == "From"), "(desconocido)")
#         snippet = m.get("snippet", "")
#         emails.append({
#             "id": msg["id"],
#             "subject": subject,
#             "sender": sender,
#             "snippet": snippet
#         })
#     return {"emails": emails}

