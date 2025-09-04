# 📧 phishing-detector-ml-osint

## 📌 Descripción
Plataforma web para detectar y analizar correos electrónicos de **phishing** mediante **Machine Learning** y consultas **OSINT**.  
Incluye un **backend en FastAPI**, un **frontend en React.js** y una base de datos en **MongoDB**.  
El sistema ofrece un **dashboard interactivo** con puntajes de riesgo, explicabilidad del modelo y estadísticas globales.  

---

## 🚀 Características principales
- 🔍 Análisis de correos electrónicos (cabeceras, cuerpo, enlaces y adjuntos).  
- 🤖 Clasificación con Machine Learning + reglas heurísticas.  
- 🌐 Integración con APIs OSINT (VirusTotal, PhishTank, OpenPhish, GeoIP).  
- 📊 Dashboard web (React) con tablas, gráficas y mapa de servidores sospechosos.  
- ⚡ Alertas en tiempo real para correos de alto riesgo.  
- 📂 Base de datos MongoDB para almacenar correos, resultados y feedback de usuarios.  
- 📑 Reportes descargables (PDF/CSV).  

---

## 🛠️ Tecnologías utilizadas
### Backend
- Python 3.11+  
- FastAPI  
- Scikit-learn, NLTK, spaCy  
- PyJWT, Passlib (seguridad)  
- Requests / httpx  

### Frontend
- React.js + Vite  
- Bootstrap / Material UI  
- Chart.js / Recharts  
- Leaflet.js / Mapbox  

### Base de datos
- MongoDB  

### Infraestructura
- Docker + Docker Compose  
- GitHub Actions (CI/CD opcional)  
git clone https://github.com/tu-usuario/phishing-detector-dashboard.git
cd phishing-detector-dashboard
