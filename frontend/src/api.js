const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export async function analyzeEmail(payload) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
  return res.json();
}

export async function listEmails(limit = 20) {
  const res = await fetch(`${API_BASE}/emails?limit=${limit}`);
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  return res.json();
}

export async function getEmailById(id) {
  const res = await fetch(`${API_BASE}/emails/${id}`);
  if (!res.ok) throw new Error(`Get by id failed: ${res.status}`);
  return res.json();
}

export async function pingDb() {
  const res = await fetch(`${API_BASE}/db/ping`);
  if (!res.ok) throw new Error(`Ping failed: ${res.status}`);
  return res.json();
}
