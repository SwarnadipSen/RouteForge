const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

export function computeOptimizedRoute(body) {
  return request("/api/routes/compute", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function computeAlternateRoute(body) {
  return request("/api/routes/disruption", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchScenarios() {
  return request("/api/scenarios");
}

export function fetchScenario(scenarioId) {
  return request(`/api/scenarios/${scenarioId}`);
}

export function fetchPlayback(scenarioId) {
  return request(`/api/scenarios/${scenarioId}/playback`);
}

export function fetchReasoning(scenarioId) {
  return request("/api/reasoning", {
    method: "POST",
    body: JSON.stringify({ scenario_id: scenarioId }),
  });
}

export function sendScenarioChat(scenarioId, message) {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ scenario_id: scenarioId, message }),
  });
}
