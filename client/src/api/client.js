const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

export function getEventSourceUrl(path) {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('resqnet_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : `Request failed with status ${response.status}`);
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.code;
    error.details = data?.details;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => apiRequest('/auth/me'),

  // Incidents
  getIncidents: (params = '') => apiRequest(`/incidents${params ? `?${params}` : ''}`),
  getPriorityQueue: () => apiRequest('/incidents/queue'),
  getIncident: (id) => apiRequest(`/incidents/${id}`),
  createIncident: (incident) => apiRequest('/incidents', { method: 'POST', body: JSON.stringify(incident) }),
  updateIncidentStatus: (id, payload) => apiRequest(`/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),
  cancelIncident: (id, payload = {}) => apiRequest(`/incidents/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) }),
  getIncidentCandidates: (id) => apiRequest(`/incidents/${id}/candidates`, { method: 'POST' }),
  confirmIncidentDispatch: (id, payload) => apiRequest(`/incidents/${id}/dispatch`, { method: 'POST', body: JSON.stringify(payload) }),
  getHospitalRecommendation: (id) => apiRequest(`/incidents/${id}/hospital-recommendation`, { method: 'POST' }),

  // Roads
  getNodes: () => apiRequest('/roads/nodes'),
  getEdges: () => apiRequest('/roads/edges'),
  updateEdgeCondition: (id, payload) => apiRequest(`/roads/edges/${id}/condition`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Fleet & Ambulances
  getAmbulances: () => apiRequest('/ambulances'),
  getAmbulance: (id) => apiRequest(`/ambulances/${id}`),
  updateAmbulanceStatus: (id, payload) => apiRequest(`/ambulances/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Hospitals
  getHospitals: () => apiRequest('/hospitals'),
  getHospital: (id) => apiRequest(`/hospitals/${id}`),
  updateHospitalCapacity: (id, payload) => apiRequest(`/hospitals/${id}/capacity`, { method: 'PATCH', body: JSON.stringify(payload) }),
  updateHospital: (id, payload) => apiRequest(`/hospitals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getIncomingHospitalCases: (id) => apiRequest(`/hospitals/${id}/incoming`),
  acceptHospitalCase: (id, incidentId) => apiRequest(`/hospitals/${id}/incoming/${incidentId}/accept`, { method: 'POST' }),
  rejectHospitalCase: (id, incidentId, payload) => apiRequest(`/hospitals/${id}/incoming/${incidentId}/reject`, { method: 'POST', body: JSON.stringify(payload) }),

  // Routing & Algorithms
  computeRoute: (payload) => apiRequest('/routes/compute', { method: 'POST', body: JSON.stringify(payload) }),
  compareRoutes: (payload) => apiRequest('/routes/compare', { method: 'POST', body: JSON.stringify(payload) }),
  getAlternatives: (payload) => apiRequest('/routes/alternatives', { method: 'POST', body: JSON.stringify(payload) }),
  traverseGraph: (payload) => apiRequest('/lab/traverse', { method: 'POST', body: JSON.stringify(payload) }),
  getDispatchRecommendation: (incidentId) => apiRequest(`/dispatch/recommend/${incidentId}`),
  confirmDispatch: (payload) => apiRequest('/dispatch/confirm', { method: 'POST', body: JSON.stringify(payload) }),

  // Index Demos
  getHashLookup: (id) => apiRequest(`/index/hash/${id}`),
  getBPlusRange: (from, to) => apiRequest(`/index/bplus/range?from=${from}&to=${to}`),
  getDemoKeys: () => apiRequest('/index/demo-keys'),
  loadSampleKeys: () => apiRequest('/index/load-samples', { method: 'POST' }),

  // Analytics & Audit
  getAnalyticsSummary: () => apiRequest('/analytics/summary'),
  getAuditLogs: (params = '') => apiRequest(`/audit${params ? `?${params}` : ''}`),

  // Notifications Outbox
  getNotifications: (params = '') => apiRequest(`/notifications${params ? `?${params}` : ''}`),

  // Users Management (Admin)
  getUsers: (params = '') => apiRequest(`/users${params ? `?${params}` : ''}`),
  getUser: (id) => apiRequest(`/users/${id}`),
  createUser: (payload) => apiRequest('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => apiRequest(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  resetUserPassword: (id, payload) => apiRequest(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteUser: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),

  // Scenario
  getScenarios: () => apiRequest('/scenario/list'),
  getActiveScenario: () => apiRequest('/scenario/active'),
  switchScenario: (payload) => apiRequest('/scenario/switch', { method: 'POST', body: JSON.stringify(payload) }),
  getScriptedScenarios: () => apiRequest('/scenario/scripted'),
  loadScriptedScenario: (scenarioId) => apiRequest('/scenario/load', { method: 'POST', body: JSON.stringify({ scenarioId }) }),
  seedScenario: (payload) => apiRequest('/scenario/seed', { method: 'POST', body: JSON.stringify(payload) }),
  resetScenario: (payload) => apiRequest('/scenario/reset', { method: 'POST', body: JSON.stringify(payload) })
};

export default api;
