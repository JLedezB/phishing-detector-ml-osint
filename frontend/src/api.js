// src/api.js
import { jwtDecode } from "jwt-decode";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

let token = null;

// ====================
// Helpers de token
// ====================
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
      username: decoded.sub,
      role: decoded.role || "user",
      exp: decoded.exp,
    };
  } catch (err) {
    console.error("Error decoding token:", err);
    return null;
  }
}

// ====================
// AUTH
// ====================
export async function register(username, password, role = "user") {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Error al registrar usuario: ${msg}`);
  }
  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Error al iniciar sesión: ${msg}`);
  }
  return res.json();
}

// ====================
// EMAILS (usuarios normales)
// ====================
export async function analyzeEmail(payload) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken() || ""}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Error al analizar correo (${res.status})`);
  return res.json();
}

export async function listEmails(limit = 20) {
  const res = await fetch(`${API_BASE}/emails?limit=${limit}`, {
    headers: { Authorization: `Bearer ${getToken() || ""}` },
  });
  if (!res.ok) throw new Error(`Error al listar correos (${res.status})`);
  return res.json();
}

export async function getEmailById(id) {
  const res = await fetch(`${API_BASE}/emails/${id}`, {
    headers: { Authorization: `Bearer ${getToken() || ""}` },
  });
  if (!res.ok) throw new Error(`Error al obtener correo (${res.status})`);
  return res.json();
}

// ====================
// ADMIN — Usuarios y correos globales
// ====================
export async function adminListUsers() {
  const res = await fetch(`${API_BASE}/auth/users`, {
    headers: { Authorization: `Bearer ${getToken() || ""}` },
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Error al obtener usuarios: ${msg}`);
  }
  const data = await res.json();
  return { users: data };
}

export async function adminDeleteUser(username) {
  const res = await fetch(`${API_BASE}/auth/users/${username}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken() || ""}` },
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Error al eliminar usuario: ${msg}`);
  }
  return res.json();
}

export async function adminListAllEmails(limit = 50) {
  const res = await fetch(`${API_BASE}/admin/emails?limit=${limit}`, {
    headers: { Authorization: `Bearer ${getToken() || ""}` },
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Error al obtener correos globales: ${msg}`);
  }
  return res.json();
}

// ====================
// Otros
// ====================
export async function pingDb() {
  const res = await fetch(`${API_BASE}/db/ping`);
  if (!res.ok) throw new Error(`Ping failed: ${res.status}`);
  return res.json();
}
