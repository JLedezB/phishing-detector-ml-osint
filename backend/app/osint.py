# app/osint.py
# --------------------------------------------
# OSINT Paso 1: VirusTotal (dominio/IP) + caché Mongo
# - Normaliza URLs -> dominio o IP
# - Consulta VT domain/ip endpoints
# - Cachea resultados por clave (domain/ip) con TTL
# - Devuelve artifacts con resumen de VT
# --------------------------------------------
import os
import re
import asyncio
from datetime import datetime
from typing import List, Dict, Any
import httpx
import tldextract

from .db import get_collection

VT_API_KEY = os.getenv("VT_API_KEY", "").strip()
CACHE_TTL = int(os.getenv("OSINT_CACHE_TTL", "86400"))  # 24h por defecto

IP_REGEX = re.compile(
    r"^((25[0-5]|2[0-4]\d|[01]?\d?\d)(\.|$)){4}$"
)

def _domain_from_url(url: str) -> str:
    """Devuelve dominio registrado o host bruto."""
    if "://" not in url:
        url = "http://" + url
    host = url.split("://", 1)[1].split("/", 1)[0]
    # ¿Es IP literal?
    if IP_REGEX.match(host):
        return host
    ext = tldextract.extract(host)
    if ext.registered_domain:
        return ext.registered_domain
    return host

# ===========================
# Caché en Mongo
# ===========================
async def _cache_get(key: str) -> Dict[str, Any] | None:
    col = get_collection("osint_cache")
    doc = await col.find_one({"key": key})
    if not doc:
        return None
    ts = doc.get("cached_at")
    if ts and (datetime.utcnow() - ts).total_seconds() > CACHE_TTL:
        await col.delete_one({"_id": doc["_id"]})
        return None
    return doc.get("payload")

async def _cache_set(key: str, payload: dict):
    col = get_collection("osint_cache")
    await col.update_one(
        {"key": key},
        {"$set": {"payload": payload, "cached_at": datetime.utcnow()}},
        upsert=True,
    )

# ===========================
# VirusTotal
# ===========================
async def _vt_get(session: httpx.AsyncClient, url: str, headers: dict) -> dict:
    r = await session.get(url, headers=headers, timeout=25)
    if r.status_code == 200:
        return r.json()
    return {"error": f"vt_{r.status_code}", "body": r.text}

async def _vt_domain_report(domain: str) -> dict:
    if not VT_API_KEY:
        return {"error": "missing_vt_api_key"}
    headers = {"x-apikey": VT_API_KEY}
    async with httpx.AsyncClient() as client:
        return await _vt_get(client, f"https://www.virustotal.com/api/v3/domains/{domain}", headers)

async def _vt_ip_report(ip: str) -> dict:
    if not VT_API_KEY:
        return {"error": "missing_vt_api_key"}
    headers = {"x-apikey": VT_API_KEY}
    async with httpx.AsyncClient() as client:
        return await _vt_get(client, f"https://www.virustotal.com/api/v3/ip_addresses/{ip}", headers)

def _summarize_vt(data: dict, kind: str) -> dict:
    """
    Extrae un resumen compacto de la respuesta de VT.
    kind: 'domain' | 'ip'
    """
    if not isinstance(data, dict) or "error" in data:
        return {"kind": kind, "ok": False, "error": data.get("error") if isinstance(data, dict) else "bad_format"}

    attr = None
    if isinstance(data.get("data"), dict):
        attr = data["data"].get("attributes")

    stats = attr.get("last_analysis_stats", {}) if attr else {}
    rep = attr.get("reputation") if attr else None

    return {
        "kind": kind,
        "ok": True,
        "stats": {
            "harmless": stats.get("harmless"),
            "malicious": stats.get("malicious"),
            "suspicious": stats.get("suspicious"),
            "undetected": stats.get("undetected"),
            "timeout": stats.get("timeout"),
        },
        "reputation": rep,
        "raw_ref": bool(attr),  # indica si hubo atributos
    }

# ===========================
# Orquestador público
# ===========================
async def analyze_urls(urls: List[str]) -> Dict[str, Any]:
    """
    Paso 1: por cada URL -> dominio/IP -> pide VirusTotal
    Cachea por clave 'vt:domain:{d}' o 'vt:ip:{ip}'
    Devuelve artifacts: [{ url, domain, ip?, vt, vt_link }]
    """
    # Normalizamos único dominio/ip por grupo de URLs iguales
    normalized: Dict[str, List[str]] = {}
    for u in urls:
        key = _domain_from_url(u)
        normalized.setdefault(key, []).append(u)

    artifacts: List[Dict[str, Any]] = []

    for host, group_urls in normalized.items():
        is_ip = bool(IP_REGEX.match(host))
        cache_key = f"vt:ip:{host}" if is_ip else f"vt:domain:{host}"
        cached = await _cache_get(cache_key)

        if cached:
            vt_summary = cached.get("vt_summary", {})
            vt_raw = cached.get("vt_raw", {})
            src = "cache"
        else:
            if is_ip:
                vt_raw = await _vt_ip_report(host)
                vt_summary = _summarize_vt(vt_raw, "ip")
                vt_link = f"https://www.virustotal.com/gui/ip-address/{host}"
            else:
                vt_raw = await _vt_domain_report(host)
                vt_summary = _summarize_vt(vt_raw, "domain")
                vt_link = f"https://www.virustotal.com/gui/domain/{host}"

            await _cache_set(cache_key, {"vt_summary": vt_summary, "vt_raw": vt_raw, "vt_link": vt_link})
            src = "live"

        # Si venimos de caché, aseguramos vt_link
        vt_link = cached.get("vt_link") if cached else (f"https://www.virustotal.com/gui/ip-address/{host}" if is_ip else f"https://www.virustotal.com/gui/domain/{host}")

        artifacts.append({
            "url": group_urls[0],
            "other_urls": group_urls[1:],
            "domain": None if is_ip else host,
            "ip": host if is_ip else None,
            "vt": vt_summary,
            "vt_link": vt_link,
            # Placeholders para próximos pasos:
            "whois": None,
            "geo": None,
            "urlscan": None,
            "source": src,
            "generated_at": datetime.utcnow().isoformat(),
        })

    return {"artifacts": artifacts}
