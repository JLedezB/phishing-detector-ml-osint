# app/main.py
# -----------------------------
# Punto de entrada de FastAPI:
# - CORS para frontend
# - Hook de startup para crear índices
# - Monta el router con los endpoints
# -----------------------------

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router
from .db import ensure_indexes

app = FastAPI(title="Detector de Phishing - API")

# CORS: habilita llamadas desde el frontend (React en dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",  # durante desarrollo. En prod, elimina "*" y deja tu dominio.
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # Crea índices en MongoDB (idempotente)
    await ensure_indexes()


# Monta las rutas de la API (status, db/ping, analyze, emails, etc.)
app.include_router(router)


@app.get("/")
def root():
    return {"message": "🚀 API de Detector de Phishing funcionando"}
