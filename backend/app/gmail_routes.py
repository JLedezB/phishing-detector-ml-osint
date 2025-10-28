# =====================================================
# app/routes/gmail_routes.py
# =====================================================
# Integración con Gmail + análisis automático con ML
# =====================================================
# Funcionalidades:
# 1️⃣ Autenticación OAuth2 con Gmail
# 2️⃣ Asociación del Gmail vinculado al usuario autenticado (JWT)
# 3️⃣ Almacenamiento seguro en MongoDB
# 4️⃣ Desvinculación automática si cambia el usuario
# 5️⃣ Descarga y análisis de correos con heurísticas + modelo ML
# =====================================================

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from datetime import datetime
from jose import jwt, JWTError
from .models import EmailIn
from .ml import extract_features, ml_predict_proba
from .db import get_collection
from .auth import get_current_user
import json, re

router = APIRouter(prefix="/gmail", tags=["Gmail"])

# =====================================================
# Configuración base
# =====================================================
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
]
CLIENT_SECRET_FILE = "app/credentials.json"
REDIRECT_URI = "http://127.0.0.1:8000/gmail/callback"

# Memoria temporal (opcional, puedes persistir en DB)
user_tokens = {}


# =====================================================
# 1️⃣ Autorización OAuth
# =====================================================
@router.get("/authorize")
def authorize(request: Request):
    """
    Redirige al usuario a la pantalla de login de Google para conceder
    permiso de lectura a su cuenta de Gmail. El token JWT del usuario
    autenticado se pasa como parámetro en la URL.
    """
    token = request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token JWT faltante")

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI
    )

    auth_url, state = flow.authorization_url(
        prompt="consent", access_type="offline", include_granted_scopes="true"
    )

    # Guardar el token JWT en memoria temporal por estado
    user_tokens[state] = {"jwt": token}

    return RedirectResponse(auth_url)


# =====================================================
# 2️⃣ Callback OAuth — vincular Gmail con usuario autenticado
# =====================================================
@router.get("/callback", response_class=HTMLResponse)
async def callback(code: str, state: str = None):
    """
    Gmail OAuth callback:
    - Intercambia el código por credenciales válidas
    - Obtiene la cuenta Gmail real del usuario
    - Asocia Gmail al usuario autenticado (por JWT)
    - Muestra alerta con SweetAlert2 y cierra popup
    """
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI
    )
    flow.fetch_token(code=code)
    creds = flow.credentials

    # Recuperar el JWT que enviamos en /authorize
    jwt_token = user_tokens.get(state, {}).get("jwt")
    if not jwt_token:
        raise HTTPException(status_code=401, detail="JWT no encontrado para sesión actual")

    # Decodificar usuario desde JWT
    try:
        payload = jwt.decode(jwt_token, "supersecretkey123", algorithms=["HS256"])
        username = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token JWT inválido")

    # Guardar token OAuth de Gmail
    user_tokens["default"] = creds.to_json()

    # Obtener info del perfil Gmail
    try:
        service = build("oauth2", "v2", credentials=creds)
        user_info = service.userinfo().get().execute()
        gmail_email = user_info.get("email", "(desconocido)")
        gmail_name = user_info.get("name", "")
    except Exception as e:
        print(f"⚠️ Error al obtener perfil Gmail: {e}")
        gmail_email, gmail_name = "(error)", ""

    # Guardar vínculo en MongoDB
    try:
        gmail_users = get_collection("gmail_users")

        # Eliminar vínculos antiguos del mismo usuario JWT
        await gmail_users.delete_many({"owner": username})

        await gmail_users.insert_one({
            "owner": username,
            "email": gmail_email,
            "name": gmail_name,
            "token": json.loads(creds.to_json()),
            "linked_at": datetime.utcnow()
        })
        print(f"✅ Gmail '{gmail_email}' vinculado a {username}")
    except Exception as e:
        print(f"⚠️ Error al guardar vínculo Gmail: {e}")

    # HTML con alerta visual
    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Phishing Detector — Gmail conectado</title>
      <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      <style>
        body {{
          background-color: #010409;
          color: #e6e6e6;
          text-align: center;
          font-family: 'Segoe UI', Roboto, sans-serif;
          margin-top: 15%;
        }}
        h2 {{ color: #00b4d8; font-weight: 600; }}
        .swal2-popup {{
          border: 1px solid #00b4d8 !important;
          box-shadow: 0 0 20px rgba(0,180,216,0.3);
        }}
      </style>
    </head>
    <body>
      <script>
        const email = "{gmail_email}";
        Swal.fire({{
          title: '✅ Gmail vinculado',
          text: 'Cuenta: ' + email,
          icon: 'success',
          background: '#0d1117',
          color: '#e6e6e6',
          confirmButtonColor: '#00b4d8',
          timer: 2500,
          timerProgressBar: true
        }}).then(() => {{
          if (window.opener) {{
            window.opener.postMessage({{
              type: "gmail_authenticated",
              email
            }}, "*");
            window.close();
          }} else {{
            window.location.replace("http://localhost:5173/history");
          }}
        }});
        setTimeout(() => window.location.replace("http://localhost:5173/history"), 4000);
      </script>
      <h2>Conectando con Gmail...</h2>
      <p>Por favor espera mientras finalizamos la autenticación.</p>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


# =====================================================
# 3️⃣ Obtener Gmail vinculado del usuario actual
# =====================================================
@router.get("/me")
async def get_linked_gmail(current_user: dict = Depends(get_current_user)):
    """
    Devuelve la cuenta Gmail asociada al usuario autenticado (JWT actual).
    """
    try:
        gmail_users = get_collection("gmail_users")
        user_doc = await gmail_users.find_one({"owner": current_user["sub"]})
        if not user_doc:
            return {"linked": False}
        return {"linked": True, "email": user_doc["email"], "name": user_doc.get("name")}
    except Exception as e:
        print(f"⚠️ Error /me Gmail: {e}")
        return {"linked": False}


# =====================================================
# 4️⃣ Desvincular Gmail del usuario actual
# =====================================================
@router.post("/disconnect")
async def disconnect_gmail(current_user: dict = Depends(get_current_user)):
    """
    Elimina la vinculación Gmail del usuario actual.
    """
    try:
        gmail_users = get_collection("gmail_users")
        result = await gmail_users.delete_many({"owner": current_user["sub"]})
        if result.deleted_count > 0:
            print(f"🗑️ Gmail desvinculado de {current_user['sub']}")
        user_tokens.pop("default", None)
        return {"message": "Gmail desvinculado correctamente"}
    except Exception as e:
        print(f"⚠️ Error al desvincular Gmail: {e}")
        raise HTTPException(status_code=500, detail="Error al desvincular Gmail")


# =====================================================
# 5️⃣ Obtener y analizar correos del Gmail vinculado
# =====================================================
@router.get("/fetch")
async def fetch_emails(current_user: dict = Depends(get_current_user)):
    """
    Descarga los últimos correos del Gmail vinculado al usuario autenticado,
    los analiza con heurísticas + ML y los guarda en MongoDB.
    """
    gmail_users = get_collection("gmail_users")
    gmail_doc = await gmail_users.find_one({"owner": current_user["sub"]})

    if not gmail_doc:
        raise HTTPException(status_code=401, detail="Usuario no tiene Gmail vinculado")

    creds = Credentials.from_authorized_user_info(gmail_doc["token"])
    service = build("gmail", "v1", credentials=creds)

    try:
        results = service.users().messages().list(userId="me", maxResults=5).execute()
        messages = results.get("messages", [])
        emails = []
        collection = get_collection("emails")

        for msg in messages:
            m = service.users().messages().get(userId="me", id=msg["id"], format="full").execute()
            headers = m.get("payload", {}).get("headers", [])
            subject = next((h["value"] for h in headers if h["name"] == "Subject"), "(sin asunto)")
            sender = next((h["value"] for h in headers if h["name"] == "From"), "(desconocido)")
            snippet = m.get("snippet", "")

            email_data = EmailIn(sender=sender, subject=subject, body=snippet)
            features = extract_features(email_data, {})
            proba = ml_predict_proba(features)

            phishing_keywords = ["verifica", "actualiza", "contraseña", "urgente", "haz clic", "confirmar cuenta"]
            heuristics = sum(1 for k in phishing_keywords if k in snippet.lower())
            risk_score = round(proba * 100 + heuristics * 2, 2)

            if risk_score > 75:
                label = "phishing"
            elif 45 < risk_score <= 75:
                label = "sospechoso"
            else:
                label = "legitimo"

            analysis = {
                "label": label,
                "risk_score": risk_score,
                "indicators": {"found_urls": re.findall(r"https?://[^\s]+", snippet)},
            }

            record = {
                "email": {"subject": subject, "sender": sender, "snippet": snippet},
                "result": analysis,
                "source": "gmail",
                "owner": current_user["sub"],
                "created_at": datetime.utcnow(),
            }

            await collection.insert_one(record)
            emails.append({"subject": subject, "sender": sender, "snippet": snippet, "result": analysis})

        return {"message": f"✅ {len(emails)} correos analizados", "emails": emails}
    except Exception as e:
        print(f"⚠️ Error analizando correos Gmail: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar correos Gmail")
