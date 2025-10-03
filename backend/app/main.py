from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router
from .db import ensure_indexes
from .auth import router as auth_router

app = FastAPI(title="Detector de Phishing - API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    await ensure_indexes()

# Routers
app.include_router(router)
app.include_router(auth_router)

@app.get("/")
def root():
    return {"message": "🚀 API de Detector de Phishing funcionando"}
