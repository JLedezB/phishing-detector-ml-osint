// src/api.js
import { jwtDecode } from "jwt-decode";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
let token = null;

/* ======================================================
   🔐 Helpers de autenticación (token JWT)
====================================================== */
export function setToken(t) {
  token = t;
  localStorage.setItem("auth_token", t);
}

export function getToken() {
  if (token) return token;
  return localStorage.getItem("auth_token");
}

export function clearToken() {
  token = null;
  localStorage.removeItem("auth_token");
}

export function getUserFromToken() {
  const t = getToken();
  if (!t) return null;
  try {
    const decoded = jwtDecode(t);
    return {
      username: decoded.sub || decoded.username || "desconocido",
      role: decoded.role || "user",
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

/* ======================================================
   🧩 Helper para requests autenticadas
====================================================== */
async function authFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ Error ${res.status} en ${url}:`, errorText);
    throw new Error(`Error ${res.status}: ${errorText || res.statusText}`);
  }

  // Detectar tipo de contenido / respuesta
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  if (contentType.includes("text/csv") || contentType.includes("octet-stream"))
    return res.blob();
  return res.text();
}

/* ======================================================
   👤 Auth (login / register)
====================================================== */
export async function register(username, password, role = "user") {
  return authFetch(`${API_BASE}/auth/register`, {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

export async function login(username, password) {
  return authFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

/* ======================================================
   📧 Emails (usuario)
====================================================== */
export async function analyzeEmail(payload) {
  return authFetch(`${API_BASE}/analyze`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listEmails(limit = 20) {
  return authFetch(`${API_BASE}/emails?limit=${limit}`);
}

export async function getEmailById(id) {
  return authFetch(`${API_BASE}/emails/${id}`);
}

/* ======================================================
   🧭 Admin
====================================================== */
export async function adminListAllEmails(limit = 100) {
  return authFetch(`${API_BASE}/admin/emails?limit=${limit}`);
}

export async function adminListUsers() {
  return authFetch(`${API_BASE}/auth/users`);
}

export async function adminDeleteUser(username) {
  return authFetch(`${API_BASE}/auth/users/${username}`, {
    method: "DELETE",
  });
}

export async function adminExportMLReport() {
  const blob = await authFetch(`${API_BASE}/ml/export`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ml_report.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ======================================================
   🤖 Machine Learning
====================================================== */
export async function getMLInfo() {
  return authFetch(`${API_BASE}/ml/info`);
}

export async function getMLMetrics() {
  return authFetch(`${API_BASE}/ml/metrics`);
}

/* ======================================================
   🕵️‍♂️ OSINT
====================================================== */
export async function osintScan({ analysis_id, urls }) {
  return authFetch(`${API_BASE}/osint/scan`, {
    method: "POST",
    body: JSON.stringify({ analysis_id, urls }),
  });
}

export async function getOSINT(analysis_id) {
  return authFetch(`${API_BASE}/osint/${analysis_id}`);
}

/* ======================================================
   📊 Dashboard OSINT (Resumen Global)
====================================================== */
export async function getOsintSummary() {
  return authFetch(`${API_BASE}/osint/summary`);
}

/* ======================================================
   📬 Gmail Integration
====================================================== */
export function gmailAuthorize() {
  // Abre la URL del backend FastAPI para autorización OAuth de Gmail
  window.open(`${API_BASE}/gmail/authorize`, "_blank");
}

export async function gmailFetch() {
  // Llama al endpoint del backend que obtiene los correos desde Gmail
  return authFetch(`${API_BASE}/gmail/fetch`);
}

