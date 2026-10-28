import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MapView from '../components/MapView.jsx';
import EdgeModal from '../components/EdgeModal.jsx';
import { api, getEventSourceUrl } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  fallbackNodes,
  fallbackEdges,
  fallbackHospitals,
  fallbackAmbulances,
  fallbackIncidents,
  getFallbackRecommendation
} from '../data/mockMapData.js';
import {
  Activity,
  AlertCircle,
  Truck,
  Building2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Navigation,
  Layers,
  Sliders,
  ArrowRight,
  Hospital,
  Phone,
  Bed,
  HeartPulse,
  X,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Search
} from 'lucide-react';

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const initialIncidentId = searchParams.get('incidentId') || 'INC-001';

  const { isAdmin } = useAuth();

  const [nodes, setNodes] = useState(fallbackNodes);
  const [edges, setEdges] = useState(fallbackEdges);
  const [ambulances, setAmbulances] = useState(fallbackAmbulances);
  const [hospitals, setHospitals] = useState(fallbackHospitals);
  const [incidents, setIncidents] = useState(fallbackIncidents);
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialIncidentId);

  // Hospital detail popup/modal state
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [hospitalSearch, setHospitalSearch] = useState('');

  const [recommendation, setRecommendation] = useState(() => getFallbackRecommendation(initialIncidentId));
  const [activeRoute, setActiveRoute] = useState(() => getFallbackRecommendation(initialIncidentId)?.ambulanceSelection?.bestCandidate?.route?.path || []);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadMapData();

    // SSE connection for real-time map updates
    let eventSource = null;
    try {
      const token = localStorage.getItem('resqnet_token') || '';
      const sseUrl = getEventSourceUrl(`/api/events?token=${token}`);
      eventSource = new EventSource(sseUrl);

      const handleLiveEvent = () => {
        api.getIncidents().then((iData) => {
          if (Array.isArray(iData) && iData.length > 0) setIncidents(iData);
        }).catch(() => {});
        api.getAmbulances().then((aData) => {
          if (Array.isArray(aData) && aData.length > 0) setAmbulances(aData);
        }).catch(() => {});
      };

      eventSource.onmessage = handleLiveEvent;
      eventSource.addEventListener('INCIDENT_UPDATE', handleLiveEvent);
      eventSource.addEventListener('AMBULANCE_MOVED', handleLiveEvent);
      eventSource.addEventListener('ROAD_CONDITION_CHANGED', () => {
        loadMapData();
      });
      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
      };
    } catch (e) {
      console.warn('SSE not initialized:', e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      loadRecommendation(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  async function loadMapData() {
    try {
      const results = await Promise.allSettled([
        api.getNodes(),
        api.getEdges(),
        api.getAmbulances(),
        api.getHospitals(),
        api.getIncidents()
      ]);
      if (results[0].status === 'fulfilled' && Array.isArray(results[0].value) && results[0].value.length > 0) {
        setNodes(results[0].value);
      }
      if (results[1].status === 'fulfilled' && Array.isArray(results[1].value) && results[1].value.length > 0) {
        setEdges(results[1].value);
      }
      if (results[2].status === 'fulfilled' && Array.isArray(results[2].value) && results[2].value.length > 0) {
        setAmbulances(results[2].value);
      }
      if (results[3].status === 'fulfilled' && Array.isArray(results[3].value) && results[3].value.length > 0) {
        setHospitals(results[3].value);
      }
      if (results[4].status === 'fulfilled' && Array.isArray(results[4].value) && results[4].value.length > 0) {
        setIncidents(results[4].value);
      }
    } catch (err) {
      console.warn('Using embedded network dataset:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendation(incId) {
    try {
      const rec = await api.getDispatchRecommendation(incId);
      if (rec && rec.ambulanceSelection?.bestCandidate) {
        setRecommendation(rec);
        if (rec.ambulanceSelection.bestCandidate.route?.path) {
          setActiveRoute(rec.ambulanceSelection.bestCandidate.route.path);
        }
        return;
      }
    } catch (err) {
      console.warn('Using fallback dispatch recommendation:', err);
    }
    const fallbackRec = getFallbackRecommendation(incId);
    setRecommendation(fallbackRec);
    if (fallbackRec?.ambulanceSelection?.bestCandidate?.route?.path) {
      setActiveRoute(fallbackRec.ambulanceSelection.bestCandidate.route.path);
    }
  }

  const handleEdgeUpdate = async (edgeId, condition, multiplier) => {
    try {
      const res = await api.updateEdgeCondition(edgeId, { condition, multiplier });
      // Update edge in local state
      setEdges((prev) =>
        prev.map((e) => (e.edgeId === edgeId ? { ...e, condition, multiplier } : e))
      );

      setNotification({
        type: 'warning',
        message: `Edge ${edgeId} updated to ${condition}. Graph version incremented to v${res.graphVersion}.`
      });

      // Reload recommendation to observe immediate reroute or staleness
      if (selectedIncidentId) {
        await loadRecommendation(selectedIncidentId);
      }
    } catch (err) {
      alert(`Failed to update road condition: ${err.message}`);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!isAdmin) {
      alert('Read-only auditor account cannot confirm dispatches.');
      return;
    }
    if (!recommendation?.ambulanceSelection?.bestCandidate || !recommendation?.hospitalSelection?.bestHospital) {
      alert('Cannot confirm dispatch: No valid candidate ambulance or hospital available.');
      return;
    }

    setDispatching(true);
    try {
      const payload = {
        incidentId: selectedIncidentId,
        ambulanceId: recommendation.ambulanceSelection.bestCandidate.ambulanceId,
        hospitalId: recommendation.hospitalSelection.bestHospital.hospitalId,
        algorithm: 'DIJKSTRA'
      };
      await api.confirmDispatch(payload);
      setNotification({
        type: 'success',
        message: `Dispatch Confirmed! Ambulance ${payload.ambulanceId} en route to ${selectedIncidentId}.`
      });
      await loadMapData();
      await loadRecommendation(selectedIncidentId);
    } catch (err) {
      alert(`Dispatch confirmation failed: ${err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  const selectedIncident = incidents.find((i) => i.incidentId === selectedIncidentId);

  // Filtered hospitals for quick-picker
  const filteredHospitals = hospitals.filter((h) =>
    h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
    h.nodeId.toLowerCase().includes(hospitalSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Page Title & Notification */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-emerald-200 p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-600" />
            Live Road Graph & Hospital Network
          </h1>
          <p className="text-xs text-slate-600">
            Interactive network topology with zoom controls, real-time hospital bed status, dynamic road conditions, and automated multi-factor scoring.
          </p>
        </div>

        {notification && (
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* Hospital Quick-Select Bar (Tap on hospital name to inspect info) */}
      <div className="bg-white border border-purple-200 rounded-xl p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Hospital className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
              Hospital Directory (Tap any hospital for real-time facility info)
            </span>
            <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-semibold border border-purple-200">
              {hospitals.length} Facilities
            </span>
          </div>

          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={hospitalSearch}
              onChange={(e) => setHospitalSearch(e.target.value)}
              placeholder="Search hospital name or node..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Scrollable Hospital Name Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {filteredHospitals.slice(0, 15).map((h) => {
            const isSelected = selectedHospital?.hospitalId === h.hospitalId;
            const freeBeds = h.capacity?.availableBeds ?? h.availableBeds ?? 0;
            const status = h.status || 'OPEN';

            return (
              <button
                key={h.hospitalId}
                onClick={() => setSelectedHospital(h)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-700 shadow-sm ring-2 ring-purple-300'
                    : 'bg-purple-50/60 hover:bg-purple-100/80 text-purple-950 border-purple-200'
                }`}
                title="Tap to view full hospital capacity and capabilities"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="font-semibold truncate max-w-[150px]">{h.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isSelected ? 'bg-purple-800 text-purple-100' : 'bg-white text-purple-800 border border-purple-200'
                }`}>
                  {freeBeds} beds
                </span>
              </button>
            );
          })}
          {filteredHospitals.length > 15 && (
            <span className="text-[11px] text-slate-400 shrink-0 italic pl-1">
              +{filteredHospitals.length - 15} more
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Interactive Map + Dispatch Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map / Graph (2 Columns) */}
        <div className="lg:col-span-2">
          <MapView
            nodes={nodes}
            edges={edges}
            ambulances={ambulances}
            hospitals={hospitals}
            incidents={incidents}
            highlightedRoute={activeRoute}
            onEdgeClick={(edge) => setSelectedEdge(edge)}
            onHospitalClick={(h) => setSelectedHospital(h)}
            selectedHospitalId={selectedHospital?.hospitalId}
            selectedNodeId={selectedIncident?.locationNodeId}
          />
        </div>

        {/* Dispatch Controls Panel (1 Column) */}
        <div className="space-y-4">
          {/* Incident Selector Box */}
          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
            <label className="block text-xs font-semibold text-emerald-950 mb-2">Select Active Incident</label>
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="w-full bg-emerald-50/50 border border-emerald-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              {incidents.map((inc) => (
                <option key={inc.incidentId} value={inc.incidentId}>
                  {inc.incidentId} [{inc.severity}] — {inc.type} ({inc.patientCount || 1} pts) @ {inc.locationNodeId}
                </option>
              ))}
            </select>

            {selectedIncident && (
              <div className="mt-3 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <span className="font-semibold text-emerald-700">{selectedIncident.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Location Vertex:</span>
                  <span className="font-mono text-slate-800">{selectedIncident.locationNodeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Patients:</span>
                  <span className="font-bold text-slate-800">{selectedIncident.patientCount || 1} injured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Required Skills:</span>
                  <span className="text-slate-800 font-medium">
                    {selectedIncident.requiredCapabilities?.join(', ') || 'basic-life-support'}
                  </span>
                </div>
                {selectedIncident.symptoms && selectedIncident.symptoms.length > 0 && (
                  <div className="pt-1 border-t border-emerald-200">
                    <span className="text-slate-600 text-[11px]">Symptoms: </span>
                    <span className="text-slate-800 text-[11px] font-medium">
                      {selectedIncident.symptoms.join(', ')}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-slate-600 pt-1 border-t border-emerald-200 mt-1">
                  {selectedIncident.description}
                </p>
              </div>
            )}
          </div>

          {/* Greedy Dispatch Recommendation Panel */}
          {recommendation?.ambulanceSelection?.bestCandidate ? (
            <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Optimal Ambulance Match
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Score: {recommendation.ambulanceSelection.bestCandidate.totalScore}
                </span>
              </div>

              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                <div className="flex justify-between items-baseline gap-2 flex-wrap">
                  <span className="font-bold text-emerald-950 text-sm">
                    {recommendation.ambulanceSelection.bestCandidate.ambulanceId} ({recommendation.ambulanceSelection.bestCandidate.vehicleType})
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold font-mono">
                    {recommendation.ambulanceSelection.bestCandidate.breakdown.rawRouteCost.toFixed(2)} km
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Stationed at: <span className="text-slate-800 font-mono">{recommendation.ambulanceSelection.bestCandidate.currentNodeId}</span>
                </div>

                {/* Score Breakdown (Section 3.9) */}
                <div className="mt-3 pt-2 border-t border-emerald-200 text-[10px] space-y-1 font-mono">
                  <div className="text-slate-600 font-sans font-semibold mb-1">Greedy Penalty Breakdown:</div>
                  <div className="flex justify-between text-slate-700">
                    <span>Route Cost (w1=0.40):</span>
                    <span>+{recommendation.ambulanceSelection.bestCandidate.breakdown.weightedRouteCost}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Utilization (w2=0.25):</span>
                    <span>+{recommendation.ambulanceSelection.bestCandidate.breakdown.weightedUtilization}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Capability (w3=0.20):</span>
                    <span>+{recommendation.ambulanceSelection.bestCandidate.breakdown.weightedCapability}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Reliability (w4=0.15):</span>
                    <span>+{recommendation.ambulanceSelection.bestCandidate.breakdown.weightedReliability}</span>
                  </div>
                </div>
              </div>

              {/* Recommended Hospital (Tappable for full info) */}
              {recommendation.hospitalSelection?.bestHospital && (
                <div
                  onClick={() => {
                    const fullHosp = hospitals.find(
                      (h) => h.hospitalId === recommendation.hospitalSelection.bestHospital.hospitalId
                    );
                    setSelectedHospital(fullHosp || recommendation.hospitalSelection.bestHospital);
                  }}
                  className="bg-purple-50/50 hover:bg-purple-50 p-3 rounded-lg border border-purple-200 cursor-pointer transition"
                  title="Click to view full hospital info"
                >
                  <div className="text-[10px] text-purple-700 uppercase font-semibold tracking-wider mb-1 flex items-center justify-between">
                    <span>Destination Facility Match</span>
                    <span className="text-[9px] underline">View Details ⓘ</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-purple-950 text-xs hover:text-purple-700">
                      🏥 {recommendation.hospitalSelection.bestHospital.name}
                    </span>
                    <span className="text-xs text-purple-700 font-mono">
                      {recommendation.hospitalSelection.bestHospital.routeCost.toFixed(2)} km
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Location: <span className="font-mono text-slate-800">{recommendation.hospitalSelection.bestHospital.nodeId}</span> •
                    Slots: <span className="text-emerald-700 font-semibold">{recommendation.hospitalSelection.bestHospital.availableSlots} beds free</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleConfirmDispatch}
                disabled={dispatching || !isAdmin}
                className="w-full py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                {dispatching ? 'Assigning...' : 'Confirm & Dispatch Unit'}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-emerald-200 rounded-xl p-4 text-center shadow-sm">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-900">No Eligible Response Units</h4>
              <p className="text-[11px] text-slate-600 mt-1">
                {recommendation?.ambulanceSelection?.rejected?.[0]?.reason ||
                  'All units are currently dispatched or road access is disconnected.'}
              </p>
            </div>
          )}

          {/* Quick Road Obstruction Controls */}
          <div className="bg-white border border-emerald-200 rounded-xl p-4 text-xs space-y-2 shadow-sm">
            <span className="font-bold text-emerald-950 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Operational Corridor Invalidation & Bottleneck Control
            </span>
            <p className="text-[11px] text-slate-600">
              Toggle critical corridor <strong>E-39-40</strong> (Island Causeway Corridor) to observe automatic route invalidation and dynamic hospital re-routing.
            </p>
            <button
              onClick={() => {
                const targetEdge = edges.find((e) => e.edgeId === 'E-39-40' || e.edgeId === 'E-40-39' || e.edgeId === 'E-00001') || edges[0];
                if (targetEdge) setSelectedEdge(targetEdge);
              }}
              className="w-full py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium transition-colors"
            >
              Configure Island Bridge (E-39-40)
            </button>
          </div>
        </div>
      </div>

      {/* Edge Modal */}
      {selectedEdge && (
        <EdgeModal
          edge={selectedEdge}
          onClose={() => setSelectedEdge(null)}
          onUpdate={handleEdgeUpdate}
        />
      )}

      {/* Hospital Information Modal (Shown when tap on hospital name or marker) */}
      {selectedHospital && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-purple-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-5 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-purple-800/80 border border-purple-600">
                  <Hospital className="w-6 h-6 text-purple-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-800 text-purple-200 uppercase font-semibold">
                      {selectedHospital.hospitalId}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/20 text-white uppercase">
                      {selectedHospital.tier || 'Tier 1 Comprehensive'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {selectedHospital.name}
                  </h3>
                  <div className="text-xs text-purple-200 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    Vertex: <span className="font-mono font-bold text-white">{selectedHospital.nodeId}</span> • Zone: {selectedHospital.zone || 'Central'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedHospital(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Real-time Beds, ICU, Specialties */}
            <div className="p-6 space-y-5 text-xs text-slate-700">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-100">
                <span className="font-semibold text-purple-900">Operational Emergency Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  (selectedHospital.status || 'OPEN') === 'OPEN'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : (selectedHospital.status || 'OPEN') === 'DIVERTING'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  ● {selectedHospital.status || 'OPEN'}
                </span>
              </div>

              {/* Bed Capacity Progress Bar */}
              <div className="space-y-2">
                {(() => {
                  const totalBeds = selectedHospital.capacity?.totalBeds ?? selectedHospital.totalBeds ?? 100;
                  const availableBeds = selectedHospital.capacity?.availableBeds ?? selectedHospital.availableBeds ?? 20;
                  const bedOccPct = Math.round(((totalBeds - availableBeds) / Math.max(1, totalBeds)) * 100);

                  return (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Bed className="w-4 h-4 text-purple-600" />
                          General Acute Care Beds
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {availableBeds} / {totalBeds} Free ({100 - bedOccPct}% Available)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            bedOccPct > 85 ? 'bg-red-500' : bedOccPct > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${bedOccPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>Occupied: {totalBeds - availableBeds} beds ({bedOccPct}%)</span>
                        <span>Capacity: {totalBeds} total</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ICU Capacity Progress Bar */}
              <div className="space-y-2">
                {(() => {
                  const totalIcu = selectedHospital.capacity?.totalIcu ?? selectedHospital.totalIcu ?? 20;
                  const availableIcu = selectedHospital.capacity?.availableIcu ?? selectedHospital.availableIcu ?? 5;
                  const icuOccPct = Math.round(((totalIcu - availableIcu) / Math.max(1, totalIcu)) * 100);

                  return (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <HeartPulse className="w-4 h-4 text-rose-600" />
                          ICU / Critical Care Units
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {availableIcu} / {totalIcu} Free ({100 - icuOccPct}% Available)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            icuOccPct > 85 ? 'bg-red-500' : icuOccPct > 65 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${icuOccPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>Occupied: {totalIcu - availableIcu} ICU units ({icuOccPct}%)</span>
                        <span>Critical Beds: {totalIcu} total</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Clinical Capabilities & Specialties */}
              <div>
                <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Clinical Specialties & Resource Capabilities:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedHospital.capabilities || ['cardiac-monitor', 'trauma-care', 'advanced-life-support', 'pediatric-support']).map((cap, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg font-medium text-[11px]"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Emergency Hotline Contact */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  Direct ER Dispatch Hotline:
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  {selectedHospital.contactPhone || '+91 253 257 0000'}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedHospital(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition shadow-sm"
              >
                Close Hospital Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
