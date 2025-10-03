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
    Crea índices idempotentes en la colección 'emails'.
    Mejora rendimiento de búsquedas y filtrados.
    """
    db = get_db()
    emails = db["emails"]

    # Orden por fecha descendente
    await emails.create_index([("created_at", DESCENDING)], name="ix_created_at_desc")

    # Filtrado por etiqueta de resultado
    await emails.create_index([("result.label", ASCENDING)], name="ix_result_label")

    # Consultas por remitente
    await emails.create_index([("email.sender", ASCENDING)], name="ix_email_sender")

    # Orden por puntaje de riesgo descendente
    await emails.create_index([("result.risk_score", DESCENDING)], name="ix_risk_desc")
