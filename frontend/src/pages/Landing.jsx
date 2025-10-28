// ===========================================
// src/pages/Landing.jsx
// ===========================================
// Landing Page de Phishing Detector ML-OSINT
// - Diseño oscuro ciberseguridad
// - React + Bootstrap + Framer Motion
// - Botón “Probar ahora” -> #/login
// - Incluye secciones de Tecnologías, Seguridad e ISO, y Términos
// ===========================================

import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { motion } from "framer-motion";
import dashboardImg from "../assets/dashboard.png";

export default function Landing() {
  return (
    <div style={{ backgroundColor: "#010409", color: "#e6e6e6" }}>
      {/* ===== HERO ===== */}
      <section
        style={{
          background: "linear-gradient(180deg,#0d1117 0%,#010409 100%)",
          padding: "100px 0",
          textAlign: "center",
        }}
      >
        <Container>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{ color: "#00b4d8", fontWeight: 700, fontSize: "3rem" }}
          >
            Phishing Detector ML-OSINT
          </motion.h1>

          <p style={{ maxWidth: 650, margin: "20px auto 40px", color: "#cfd8dc" }}>
            Detecta, analiza y clasifica correos sospechosos con Machine Learning e
            inteligencia OSINT. Potencia tu seguridad digital con análisis automatizado y
            visualización avanzada.
          </p>

          <Button
            href="#/login"
            size="lg"
            style={{
              backgroundColor: "#00b4d8",
              border: "none",
              fontWeight: 600,
              padding: "12px 30px",
            }}
          >
            🚀 Probar ahora
          </Button>
        </Container>
      </section>

      {/* ===== TECNOLOGÍAS ===== */}
      <section style={{ backgroundColor: "#0b1119", padding: "60px 0" }}>
        <Container className="text-center">
          <h3 style={{ color: "#00b4d8", marginBottom: "30px" }}>
            Tecnologías Utilizadas
          </h3>
          <Row className="justify-content-center g-4">
            {[
              { name: "React", icon: "⚛️" },
              { name: "FastAPI", icon: "🐍" },
              { name: "MongoDB", icon: "🍃" },
              { name: "Machine Learning", icon: "🤖" },
              { name: "OSINT APIs", icon: "🌐" },
              { name: "Bootstrap", icon: "🎨" },
            ].map((tech, i) => (
              <Col key={i} xs={6} sm={4} md={2}>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: "#0d1117",
                    border: "1px solid #00b4d8",
                    borderRadius: "10px",
                    padding: "20px",
                    color: "#e6e6e6",
                    boxShadow: "0 0 10px rgba(0,180,216,0.2)",
                  }}
                >
                  <div style={{ fontSize: "2rem" }}>{tech.icon}</div>
                  <div style={{ marginTop: 8, fontSize: "0.95rem" }}>{tech.name}</div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ===== FEATURES ===== */}
      <section style={{ padding: "80px 0", backgroundColor: "#0d1117" }}>
        <Container>
          <h2 className="text-center mb-5" style={{ color: "#00b4d8" }}>
            Características Principales
          </h2>
          <Row className="g-4">
            {[
              {
                title: "🔍 Análisis Automático",
                text: "Analiza correos en segundos, identificando patrones de phishing con IA.",
              },
              {
                title: "🤖 Inteligencia Artificial",
                text: "Modelo ML entrenado para evaluar el nivel de riesgo en cada mensaje.",
              },
              {
                title: "🌐 Fuentes OSINT",
                text: "Verifica dominios con bases como PhishTank, VirusTotal y OpenPhish.",
              },
              {
                title: "📊 Dashboard Interactivo",
                text: "Visualiza resultados y estadísticas en tiempo real con gráficas dinámicas.",
              },
            ].map((f, i) => (
              <Col md={6} lg={3} key={i}>
                <Card
                  className="h-100 text-center"
                  style={{
                    backgroundColor: "#0b1119",
                    border: "1px solid #00b4d8",
                    borderRadius: "12px",
                    color: "#e6e6e6",
                  }}
                >
                  <Card.Body>
                    <Card.Title style={{ color: "#90e0ef", fontWeight: 600 }}>
                      {f.title}
                    </Card.Title>
                    <Card.Text>{f.text}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ===== DEMO SECTION ===== */}
      <section style={{ padding: "80px 0", backgroundColor: "#010409" }}>
        <Container>
          <Row className="align-items-center">
            <Col md={6}>
              <motion.img
                src={dashboardImg}
                alt="Vista del Dashboard"
                whileHover={{ scale: 1.02 }}
                style={{
                  width: "100%",
                  border: "1px solid #00b4d8",
                  borderRadius: "10px",
                  boxShadow: "0 0 20px rgba(0,180,216,0.3)",
                }}
              />
            </Col>
            <Col md={6}>
              <h3 style={{ color: "#00b4d8" }}>Visualiza tus resultados</h3>
              <p style={{ color: "#cfd8dc" }}>
                Dashboard interactivo con etiquetas de riesgo, indicadores heurísticos y
                mapas OSINT geolocalizados.
              </p>
              <ul style={{ color: "#9ba1a6" }}>
                <li>Detección automática de phishing.</li>
                <li>Clasificación por nivel de riesgo.</li>
                <li>OSINT integrado para verificación de URLs.</li>
              </ul>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ===== SEGURIDAD E ISO ===== */}
      <section style={{ padding: "80px 0", backgroundColor: "#0d1117" }}>
        <Container>
          <h2 className="text-center mb-5" style={{ color: "#00b4d8" }}>
            Seguridad y Cumplimiento
          </h2>
          <Row className="justify-content-center g-4">
            {[
              {
                title: "🔐 Cifrado y Autenticación",
                text: "Todos los tokens JWT y credenciales se manejan con cifrado seguro y expiración controlada.",
              },
              {
                title: "🧩 Protección de Datos",
                text: "La información del usuario se almacena en MongoDB con políticas de privacidad y acceso limitado.",
              },
              {
                title: "🧠 Modelos Éticos",
                text: "El análisis automatizado cumple principios de ética en IA, evitando sesgos y respetando la privacidad.",
              },
            ].map((sec, i) => (
              <Col md={4} key={i}>
                <Card
                  className="h-100 text-center"
                  style={{
                    backgroundColor: "#0b1119",
                    border: "1px solid #00b4d8",
                    borderRadius: "10px",
                  }}
                >
                  <Card.Body>
                    <Card.Title style={{ color: "#90e0ef" }}>{sec.title}</Card.Title>
                    <Card.Text>{sec.text}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <div className="text-center mt-5">
            <h5 style={{ color: "#90e0ef" }}>Cumple con Estándares ISO</h5>
            <p style={{ color: "#cfd8dc", maxWidth: 700, margin: "0 auto" }}>
              Este proyecto se desarrolla tomando como referencia las normas internacionales:
            </p>
            <ul
              style={{
                listStyle: "none",
                paddingLeft: 0,
                color: "#9ba1a6",
                marginTop: 15,
              }}
            >
              <li>📘 ISO/IEC 27001 — Seguridad de la Información</li>
              <li>📗 ISO/IEC 27002 — Controles de Ciberseguridad</li>
              <li>📙 ISO/IEC 29100 — Privacidad de Datos Personales</li>
            </ul>
          </div>
        </Container>
      </section>

      {/* ===== TÉRMINOS Y USO ===== */}
      <section style={{ padding: "80px 0", backgroundColor: "#010409" }}>
        <Container className="text-center">
          <h2 style={{ color: "#00b4d8", marginBottom: "30px" }}>
            Términos de Uso y Ética
          </h2>
          <p style={{ maxWidth: 800, margin: "0 auto", color: "#cfd8dc" }}>
            Phishing Detector ML-OSINT es una herramienta académica y educativa. El uso de
            este sistema debe alinearse con buenas prácticas de seguridad informática, ética
            profesional y cumplimiento normativo.  
            No está diseñado para monitorear o analizar información privada sin
            consentimiento. El usuario es responsable del uso adecuado de los datos y del
            cumplimiento de las políticas de privacidad aplicables.
          </p>
        </Container>
      </section>

      {/* ===== EQUIPO ===== */}
      <section style={{ padding: "80px 0", backgroundColor: "#0d1117" }}>
        <Container className="text-center">
          <h2 style={{ color: "#00b4d8", marginBottom: "30px" }}>Equipo</h2>
          <Card
            style={{
              backgroundColor: "#0b1119",
              border: "1px solid #00b4d8",
              borderRadius: "12px",
              maxWidth: "400px",
              margin: "0 auto",
              color: "#e6e6e6",
            }}
          >
            <Card.Body>
              <h5 style={{ color: "#90e0ef" }}>Joaquín Ledezma Barragán</h5>
              <p className="text-muted mb-1">
                Desarrollador Full-Stack & Ciberseguridad
              </p>
              <p className="small">CETI Colomos — Proyecto académico 2025</p>
            </Card.Body>
          </Card>
        </Container>
      </section>
    </div>
  );
}
