# app/main.py
# =====================================================
# Backend principal del proyecto Phishing Detector
# - Configuración de FastAPI + CORS
# - Carga de variables .env
# - Registro de routers (auth, análisis, Gmail, etc.)
# =====================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# ✅ Cargar variables de entorno desde .env antes de todo
load_dotenv()

# Verificar si la API key de VirusTotal está disponible
if os.getenv("VT_API_KEY"):
    print("✅ VirusTotal API key cargada correctamente.")
else:
    print("⚠️ No se encontró VT_API_KEY en .env — revisa tu archivo .env")

# =====================================================
# Importar rutas
# =====================================================
from .routes import router                    # Motor heurístico + ML principal
from .db import ensure_indexes                # MongoDB inicialización
from .auth import router as auth_router       # Autenticación JWT
from .gmail_routes import router as gmail_router  # ✅ correcto


# =====================================================
# Crear instancia principal de FastAPI
# =====================================================
app = FastAPI(title="Detector de Phishing - API")

# =====================================================
# Configuración de CORS
# =====================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"  # ⚠️ Permite todos los orígenes durante desarrollo
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# Evento de inicio
# =====================================================
@app.on_event("startup")
async def on_startup():
    """Asegura que los índices de MongoDB se creen al iniciar."""
    await ensure_indexes()
    print("🚀 Servidor iniciado correctamente y MongoDB conectado.")

# =====================================================
# Registrar Routers
# =====================================================
app.include_router(router)         # Rutas de análisis principal (emails)
app.include_router(auth_router)    # Rutas de autenticación
app.include_router(gmail_router)   # ✅ Rutas de integración con Gmail

# =====================================================
# Ruta base
# =====================================================
@app.get("/")
def root():
    """Endpoint raíz para comprobar el estado de la API."""
    return {"message": "🚀 API de Detector de Phishing funcionando correctamente"}
