const BASE = '';

export async function triageTicket(ticketText, clientId = 'demo-ui', promptVersion = null) {
  const payload = { ticket_text: ticketText, client_id: clientId };
  if (promptVersion) payload.prompt_version = promptVersion;
  const res = await fetch(`${BASE}/api/v1/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchPromptVersions() {
  const res = await fetch(`${BASE}/api/v1/prompt-versions`);
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${BASE}/healthz`);
  return res.json();
}

export async function fetchReadiness() {
  const res = await fetch(`${BASE}/readyz`);
  return res.json();
}

export async function fetchMetrics() {
  const res = await fetch(`${BASE}/metrics`);
  return res.text();
}

export async function submitFeedback(id, feedback) {
  return fetch(`${BASE}/api/v1/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, feedback }),
  }).then(r => r.json());
}

export async function fetchAnalytics() {
  const res = await fetch(`${BASE}/api/v1/analytics`);
  return res.json();
}

export async function bulkTriage(tickets, promptVersion = null) {
  const payload = { tickets };
  if (promptVersion) payload.prompt_version = promptVersion;
  const res = await fetch(`${BASE}/api/v1/bulk-triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRules() {
  return fetch(`${BASE}/api/v1/rules`).then(r => r.json());
}

export async function createRule(rule) {
  return fetch(`${BASE}/api/v1/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  }).then(r => r.json());
}

export async function deleteRule(id) {
  return fetch(`${BASE}/api/v1/rules/${id}`, { method: 'DELETE' }).then(r => r.json());
}

export async function toggleRule(id, enabled) {
  return fetch(`${BASE}/api/v1/rules/${id}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  }).then(r => r.json());
}

export function parsePrometheusMetrics(raw) {
  const metrics = {};
  for (const line of raw.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;
    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*?)(\{[^}]*\})?\s+([\d.eE+-]+|NaN|Inf|-Inf)$/);
    if (!match) continue;
    const [, name, labels, value] = match;
    if (!metrics[name]) metrics[name] = [];
    const parsedLabels = {};
    if (labels) {
      for (const m of labels.slice(1, -1).matchAll(/(\w+)="([^"]*)"/g)) {
        parsedLabels[m[1]] = m[2];
      }
    }
    metrics[name].push({ labels: parsedLabels, value: parseFloat(value) });
  }
  return metrics;
}
