# app/db.py
# -----------------------------
# Conexión a MongoDB usando Motor (async)
# Helpers para obtener DB/colecciones
# y creación de índices recomendados.
# -----------------------------

import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING

# Lee variables de entorno (define defaults para dev)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "phishingdb")

_client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    """Devuelve un cliente singleton de Motor."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    return _client


def get_db():
    """Devuelve el handle a la base configurada."""
    return get_client()[MONGO_DB]


def get_collection(name: str):
    """Atajo para obtener una colección por nombre."""
    return get_db()[name]


# ---- Índices recomendados ----
async def ensure_indexes():
    """
    Crea índices (idempotente). Se llama en el startup de FastAPI.
    Aceleran listados y futuras búsquedas/filtrados.
    """
    db = get_db()
    emails = db["emails"]

    # Recientes primero
    await emails.create_index(
        [("created_at", DESCENDING)], name="ix_created_at_desc"
    )
    # Filtrar por etiqueta (phishing/sospechoso/legitimo)
    await emails.create_index(
        [("result.label", ASCENDING)], name="ix_result_label"
    )
    # Consultas por remitente
    await emails.create_index(
        [("email.sender", ASCENDING)], name="ix_email_sender"
    )
    # Rangos por riesgo
    await emails.create_index(
        [("result.risk_score", DESCENDING)], name="ix_risk_desc"
    )
