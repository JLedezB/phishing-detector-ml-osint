# ==============================================================
# train_model.py
# ==============================================================
# Entrenamiento y evaluación de modelo ML para detección de phishing
# Guarda:
#   - app/ml_model.joblib → modelo entrenado
#   - app/ml_metadata.json → métricas y detalles del modelo
# ==============================================================

import pandas as pd
import numpy as np
import json
import joblib
import os
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)

# ==============================================================
# 1️⃣ Configuración general
# ==============================================================
DATA_PATH = "emails_dataset.csv"        # 🧾 Dataset base
OUTPUT_MODEL = os.path.join("app", "ml_model.joblib")
OUTPUT_META = os.path.join("app", "ml_metadata.json")
SEED = 42

# ==============================================================
# 2️⃣ Cargar dataset
# ==============================================================
if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(
        f"❌ No se encontró el dataset {DATA_PATH}. "
        "Asegúrate de tener un CSV con columnas: subject, body, label"
    )

df = pd.read_csv(DATA_PATH)
df = df.dropna(subset=["subject", "body", "label"])

# Convertir columnas a string por seguridad
df["subject"] = df["subject"].astype(str)
df["body"] = df["body"].astype(str)
df["label"] = df["label"].astype(int)
df["text"] = df["subject"] + " " + df["body"]

print(f"\n📊 Dataset cargado: {len(df)} registros totales")
print("📈 Distribución de clases:")
print(df["label"].value_counts().rename({0: "Legítimo", 1: "Phishing"}))
print("\nEjemplo de muestra:")
print(df.head(2).to_string(index=False))

# ==============================================================
# 3️⃣ Separar train / test
# ==============================================================
X_train, X_test, y_train, y_test = train_test_split(
    df["text"], df["label"],
    test_size=0.2,
    random_state=SEED,
    stratify=df["label"]
)

print(f"\n🧩 Train: {len(X_train)} muestras | Test: {len(X_test)} muestras")

# ==============================================================
# 4️⃣ Definir pipeline TF-IDF + Regresión Logística
# ==============================================================
pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        max_features=10000
    )),
    ("clf", LogisticRegression(
        max_iter=1000,
        solver="lbfgs",
        random_state=SEED
    )),
])

# ==============================================================
# 5️⃣ Entrenar modelo
# ==============================================================
print("\n🚀 Entrenando modelo...")
pipeline.fit(X_train, y_train)
print("✅ Entrenamiento completado.")

# ==============================================================
# 6️⃣ Evaluación y métricas
# ==============================================================
y_pred = pipeline.predict(X_test)

acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred, zero_division=0)
rec = recall_score(y_test, y_pred, zero_division=0)
f1 = f1_score(y_test, y_pred, zero_division=0)

print("\n📊 Resultados del modelo:")
print(f"Accuracy : {acc:.4f}")
print(f"Precision: {prec:.4f}")
print(f"Recall   : {rec:.4f}")
print(f"F1-score : {f1:.4f}")

print("\n📈 Reporte detallado:")
print(classification_report(y_test, y_pred, digits=3))
print("Matriz de confusión:")
print(confusion_matrix(y_test, y_pred))

# ==============================================================
# 7️⃣ Guardar modelo y metadatos
# ==============================================================
os.makedirs("app", exist_ok=True)
joblib.dump(pipeline, OUTPUT_MODEL)

metadata = {
    "model_name": type(pipeline.named_steps['clf']).__name__,
    "vectorizer": "TfidfVectorizer",
    "created_at": datetime.now().isoformat(),
    "dataset_rows": len(df),
    "train_size": len(X_train),
    "test_size": len(X_test),
    "metrics": {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1_score": f1
    },
    "notes": "Modelo ML para detección de phishing usando TF-IDF + Logistic Regression"
}

with open(OUTPUT_META, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=4, ensure_ascii=False)

print(f"\n💾 Modelo guardado en: {OUTPUT_MODEL}")
print(f"🧠 Metadatos guardados en: {OUTPUT_META}")

print("\n✅ Entrenamiento finalizado correctamente.")
