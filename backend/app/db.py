# app/db.py
# -----------------------------
# Conexión a MongoDB usando Motor (async)
# Helpers para obtener DB/colecciones
# y creación de índices recomendados
# -----------------------------

import os
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING

# -----------------------------
# Configuración de entorno
# -----------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "phishingdb")

# Singleton del cliente
_client: Optional[AsyncIOMotorClient] = None


# -----------------------------
# Funciones de acceso
# -----------------------------
def get_client() -> AsyncIOMotorClient:
    """Devuelve un cliente singleton de Motor."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    return _client


def get_db():
    """Devuelve la base de datos configurada."""
    return get_client()[MONGO_DB]


def get_collection(name: str):
    """Devuelve una colección por nombre."""
    return get_db()[name]


# -----------------------------
# Creación de índices recomendados
# -----------------------------
async def ensure_indexes():
    """
    Crea índices idempotentes en las colecciones necesarias.
    """
    db = get_db()

    # Índices para colección de correos
    emails = db["emails"]
    await emails.create_index([("created_at", DESCENDING)], name="ix_created_at_desc")
    await emails.create_index([("result.label", ASCENDING)], name="ix_result_label")
    await emails.create_index([("email.sender", ASCENDING)], name="ix_email_sender")
    await emails.create_index([("result.risk_score", DESCENDING)], name="ix_risk_desc")

    # Índices para caché OSINT
    osint_cache = db["osint_cache"]
    await osint_cache.create_index("key", unique=True)
    # TTL opcional (si quieres limpieza automática por MongoDB)
    # from datetime import timedelta
    # await osint_cache.create_index("cached_at", expireAfterSeconds=86400)
