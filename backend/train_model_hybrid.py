# ==============================================================
# train_model_hybrid.py
# ==============================================================
# Entrenamiento híbrido: texto (TF-IDF) + features heurísticos
# Guarda:
#   - app/ml_model.joblib
#   - app/ml_metadata.json
# ==============================================================

import pandas as pd
import numpy as np
import json
import os
import joblib
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import StandardScaler, FunctionTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix
from sklearn.compose import ColumnTransformer

# ==============================================================
# 1️⃣ Configuración general
# ==============================================================
DATA_PATH = "emails_dataset.csv"
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

df = pd.read_csv(DATA_PATH).dropna(subset=["subject", "body", "label"])
df["subject"] = df["subject"].astype(str)
df["body"] = df["body"].astype(str)
df["label"] = df["label"].astype(int)

df["text"] = df["subject"] + " " + df["body"]

print(f"\n📊 Dataset cargado: {len(df)} filas")
print(df.head(3).to_string(index=False))

# ==============================================================
# 3️⃣ Crear features heurísticas adicionales
# ==============================================================
def extract_manual_features(df: pd.DataFrame):
    def count_keywords(text):
        kws = ["verifica", "actualiza", "urgente", "premio", "contraseña", "bloqueada"]
        return sum(k in text.lower() for k in kws)

    def count_urls(text):
        return text.count("http")

    def has_shortener(text):
        return int(any(s in text.lower() for s in ["bit.ly", "tinyurl", "goo.gl", "ow.ly", "t.co"]))

    def has_suspicious_domain(text):
        return int(any(d in text.lower() for d in [".tk", ".ru", ".cn", ".top", ".xyz"]))

    df["kw_count"] = df["body"].apply(count_keywords)
    df["url_count"] = df["body"].apply(count_urls)
    df["shortener"] = df["body"].apply(has_shortener)
    df["sus_domain"] = df["body"].apply(has_suspicious_domain)
    df["subj_len"] = df["subject"].apply(len)
    df["body_len"] = df["body"].apply(len)

    return df

df = extract_manual_features(df)

manual_features = ["kw_count", "url_count", "shortener", "sus_domain", "subj_len", "body_len"]

print("\n🧩 Features heurísticos añadidos:")
print(df[manual_features].head(3))

# ==============================================================
# 4️⃣ Separar train / test
# ==============================================================
X_train, X_test, y_train, y_test = train_test_split(
    df[["text"] + manual_features],
    df["label"],
    test_size=0.2,
    random_state=SEED,
    stratify=df["label"]
)

# ==============================================================
# 5️⃣ Definir pipeline híbrido
# ==============================================================

# 🔹 Procesamiento texto (TF-IDF)
text_pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        max_features=5000
    ))
])

# 🔹 Procesamiento numérico (scaling)
num_pipeline = Pipeline([
    ("scaler", StandardScaler())
])

# 🔹 Unir ambas ramas (texto + numéricas)
preprocessor = ColumnTransformer([
    ("text", text_pipeline, "text"),
    ("num", num_pipeline, manual_features)
])

pipeline = Pipeline([
    ("features", preprocessor),
    ("clf", LogisticRegression(max_iter=2000, solver="lbfgs", random_state=SEED))
])

# ==============================================================
# 6️⃣ Entrenar
# ==============================================================
print("\n🚀 Entrenando modelo híbrido...")
pipeline.fit(X_train, y_train)
print("✅ Entrenamiento completado.")

# ==============================================================
# 7️⃣ Evaluación
# ==============================================================
y_pred = pipeline.predict(X_test)

acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred, zero_division=0)
rec = recall_score(y_test, y_pred, zero_division=0)
f1 = f1_score(y_test, y_pred, zero_division=0)

print("\n📈 Resultados del modelo:")
print(classification_report(y_test, y_pred, digits=3))
print("Matriz de confusión:\n", confusion_matrix(y_test, y_pred))

# ==============================================================
# 8️⃣ Guardar modelo y metadatos
# ==============================================================
os.makedirs("app", exist_ok=True)
joblib.dump(pipeline, OUTPUT_MODEL)

metadata = {
    "model_name": "Hybrid LogisticRegression",
    "components": {
        "text_vectorizer": "TF-IDF (1-2 grams)",
        "numeric_features": manual_features
    },
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
    "notes": "Modelo híbrido TF-IDF + features heurísticos para detección de phishing"
}

with open(OUTPUT_META, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=4, ensure_ascii=False)

print(f"\n💾 Modelo guardado en: {OUTPUT_MODEL}")
print(f"📄 Metadatos guardados en: {OUTPUT_META}")
print("\n✅ Entrenamiento finalizado correctamente.")
