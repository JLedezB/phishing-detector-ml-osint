// src/api.js
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

// ====================
// Endpoints de Auth
// ====================
export async function register(username, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`Register failed: ${res.status}`);
  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return res.json();
}

// ====================
// Endpoints de Emails
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
  if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
  return res.json();
}

export async function listEmails(limit = 20) {
  const res = await fetch(`${API_BASE}/emails?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${getToken() || ""}`,
    },
  });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  return res.json();
}

export async function getEmailById(id) {
  const res = await fetch(`${API_BASE}/emails/${id}`, {
    headers: {
      Authorization: `Bearer ${getToken() || ""}`,
    },
  });
  if (!res.ok) throw new Error(`Get by id failed: ${res.status}`);
  return res.json();
}

export async function pingDb() {
  const res = await fetch(`${API_BASE}/db/ping`);
  if (!res.ok) throw new Error(`Ping failed: ${res.status}`);
  return res.json();
}
