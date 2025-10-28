# app/ml.py
# --------------------------------------------
# Módulo ML con detección robusta de phishing
# Compatible con modelo híbrido (TF-IDF + features)
# Corrige:
#  - 'numpy.ndarray' object has no attribute 'lower'
#  - 'X has 8 features, but ColumnTransformer expects 7'
# --------------------------------------------

import os
import math
from datetime import datetime

try:
    import joblib
except ImportError:
    joblib = None

MODEL_PATH = os.path.join(os.path.dirname(__file__), "ml_model.joblib")

MODEL_INFO = {
    "mode": "fallback",
    "name": "LogisticLite",
    "version": "0.5",
    "loaded_at": None,
}

_WEIGHTS = [0.90, 0.55, 1.30, 1.25, 0.95, 0.55, 0.0010, 0.0004]
_INTERCEPT = -4.25


def _sigmoid(z: float) -> float:
    try:
        return 1.0 / (1.0 + math.exp(-z))
    except OverflowError:
        return 0.0 if z < 0 else 1.0


# ==========================================================
# Helper seguro para conversión de texto
# ==========================================================
def _to_str(x) -> str:
    """Convierte cualquier valor a string (seguro para numpy, None, listas, etc.)."""
    try:
        import numpy as np
        if isinstance(x, np.ndarray):
            if x.size == 1:
                x = x.item()
            else:
                x = " ".join(map(str, x.flatten().tolist()))
        elif isinstance(x, (list, tuple)):
            x = " ".join(map(str, x))
    except Exception:
        pass

    try:
        return str(x or "")
    except Exception:
        return ""


# ==========================================================
# Cargar modelo entrenado (si existe)
# ==========================================================
_MODEL = None

def load_model():
    """Carga un modelo entrenado si existe ml_model.joblib"""
    global _MODEL
    if os.path.exists(MODEL_PATH) and joblib is not None:
        try:
            _MODEL = joblib.load(MODEL_PATH)
            MODEL_INFO.update({
                "mode": "joblib",
                "name": type(_MODEL).__name__,
                "loaded_at": datetime.now().isoformat(),
            })
            print(f"[ML] ✅ Modelo cargado desde {MODEL_PATH} ({MODEL_INFO['name']})")
        except Exception as e:
            print(f"[ML] ⚠️ Error al cargar modelo: {e}")
            _MODEL = None
    else:
        print("[ML] ⚠️ No se encontró modelo entrenado. Usando modo fallback.")

load_model()


# ==========================================================
# Extracción de características (corregida e híbrida)
# ==========================================================
def extract_features(email, indicators: dict) -> list[float]:
    """
    Construye el vector de características de forma robusta.
    Compatible con modelo híbrido (6 features) o clásico (8 features).
    """
    if isinstance(email, dict):
        subject = _to_str(email.get("subject"))
        body = _to_str(email.get("body"))
        sender = _to_str(email.get("sender"))
    else:
        subject = _to_str(getattr(email, "subject", ""))
        body = _to_str(getattr(email, "body", ""))
        sender = _to_str(getattr(email, "sender", ""))

    subject = subject.strip()
    body = body.strip()
    sender = sender.strip()

    try:
        text = (subject + "\n" + body).lower()
    except Exception:
        text = (str(subject) + "\n" + str(body)).lower()

    kw_count = len(indicators.get("keywords", []) or [])
    url_count = len(indicators.get("found_urls", []) or [])
    has_short = 1 if (indicators.get("shorteners") or []) else 0
    has_sus_domain = 1 if (indicators.get("sus_domains") or []) else 0
    auth_fail_count = len(indicators.get("auth_fail", []) or [])

    sender_lower = sender.lower() if isinstance(sender, str) else str(sender).lower()
    sender_generic = 1 if any(
        x in sender_lower for x in ["support@", "soporte@", "help@", "billing@", "facturacion@"]
    ) else 0

    subj_len = len(subject)
    body_len = len(body)

    features = [
        float(kw_count),
        float(url_count),
        float(has_short),
        float(has_sus_domain),
        float(auth_fail_count),
        float(sender_generic),
        float(subj_len),
        float(body_len),
    ]

    # ✅ Si el modelo híbrido usa solo 6 features, adaptamos
    if "Hybrid" in MODEL_INFO["name"] or "ColumnTransformer" in str(type(_MODEL)):
        features = [
            float(kw_count),
            float(url_count),
            float(has_short),
            float(has_sus_domain),
            float(subj_len),
            float(body_len),
        ]

    return features


# ==========================================================
# Predicción (compatible con modelo híbrido TF-IDF)
# ==========================================================
def ml_predict_proba(features: list[float], email_text: str = "") -> float:
    global _MODEL
    if _MODEL is not None:
        try:
            import numpy as np
            import pandas as pd

            # ✅ Si el modelo es híbrido, construimos DataFrame
            if "ColumnTransformer" in str(type(_MODEL)) or "Hybrid" in MODEL_INFO["name"]:
                df = pd.DataFrame([{
                    "text": email_text or "",
                    "kw_count": features[0],
                    "url_count": features[1],
                    "shortener": features[2],
                    "sus_domain": features[3],
                    "subj_len": features[-2],
                    "body_len": features[-1],
                }])
                proba = float(_MODEL.predict_proba(df)[0][1])
                return proba

            # ✅ Si no es híbrido, modo tradicional
            X = np.array([features])
            if hasattr(_MODEL, "predict_proba"):
                return float(_MODEL.predict_proba(X)[0][1])
            elif hasattr(_MODEL, "predict"):
                pred = float(_MODEL.predict(X)[0])
                return 1.0 if pred > 0.5 else 0.0

        except Exception as e:
            print(f"[ML] Error en modelo entrenado: {e}")

    # --- Fallback ---
    z = _INTERCEPT
    for w, x in zip(_WEIGHTS, features):
        z += w * float(x)
    return _sigmoid(z)



def get_model_info() -> dict:
    return dict(MODEL_INFO)
