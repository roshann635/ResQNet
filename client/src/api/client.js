const API_BASE = '/api';

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
  getMe: () => apiRequest('/auth/me'),

  // Incidents
  getIncidents: (params = '') => apiRequest(`/incidents${params ? `?${params}` : ''}`),
  getPriorityQueue: () => apiRequest('/incidents/priority-queue'),
  getIncident: (id) => apiRequest(`/incidents/${id}`),
  createIncident: (incident) => apiRequest('/incidents', { method: 'POST', body: JSON.stringify(incident) }),
  updateIncidentStatus: (id, payload) => apiRequest(`/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Roads
  getNodes: () => apiRequest('/roads/nodes'),
  getEdges: () => apiRequest('/roads/edges'),
  updateEdgeCondition: (id, payload) => apiRequest(`/roads/edges/${id}/condition`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Fleet & Hospitals
  getAmbulances: () => apiRequest('/ambulances'),
  updateAmbulanceStatus: (id, payload) => apiRequest(`/ambulances/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getHospitals: () => apiRequest('/hospitals'),
  updateHospital: (id, payload) => apiRequest(`/hospitals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Routing & Dispatch
  computeRoute: (payload) => apiRequest('/routes/compute', { method: 'POST', body: JSON.stringify(payload) }),
  compareRoutes: (payload) => apiRequest('/routes/compare', { method: 'POST', body: JSON.stringify(payload) }),
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

  // Scenario
  seedScenario: (payload) => apiRequest('/scenario/seed', { method: 'POST', body: JSON.stringify(payload) }),
  resetScenario: (payload) => apiRequest('/scenario/reset', { method: 'POST', body: JSON.stringify(payload) })
};

export default api;
