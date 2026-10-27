import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MapView from '../components/MapView.jsx';
import EdgeModal from '../components/EdgeModal.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
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
  ArrowRight
} from 'lucide-react';

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const initialIncidentId = searchParams.get('incidentId') || 'INC-001';

  const { isAdmin } = useAuth();

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialIncidentId);

  const [recommendation, setRecommendation] = useState(null);
  const [activeRoute, setActiveRoute] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      loadRecommendation(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  async function loadMapData() {
    try {
      const [nData, eData, aData, hData, iData] = await Promise.all([
        api.getNodes(),
        api.getEdges(),
        api.getAmbulances(),
        api.getHospitals(),
        api.getIncidents()
      ]);
      setNodes(nData);
      setEdges(eData);
      setAmbulances(aData);
      setHospitals(hData);
      setIncidents(iData);
    } catch (err) {
      console.error('Failed to load network data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendation(incId) {
    try {
      const rec = await api.getDispatchRecommendation(incId);
      setRecommendation(rec);
      if (rec.ambulanceSelection?.bestCandidate?.route?.path) {
        setActiveRoute(rec.ambulanceSelection.bestCandidate.route.path);
      }
    } catch (err) {
      console.error('Failed to load recommendation:', err);
      setRecommendation(null);
      setActiveRoute([]);
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
      alert('Read-only evaluator account cannot confirm dispatches.');
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

  return (
    <div className="space-y-4">
      {/* Page Title & Notification */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-emerald-200 p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-600" />
            Live Road Graph & Intelligent Dispatch
          </h1>
          <p className="text-xs text-slate-600">
            Interactive network topology with dynamic road conditions, live vehicle tracking, and automated multi-factor scoring.
          </p>
        </div>

        {notification && (
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{notification.message}</span>
          </div>
        )}
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
                  {inc.incidentId} [{inc.severity}] — {inc.type} @ {inc.locationNodeId}
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
                  <span className="text-slate-600">Required Skills:</span>
                  <span className="text-slate-800">
                    {selectedIncident.requiredCapabilities?.join(', ') || 'basic-life-support'}
                  </span>
                </div>
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
                <div className="flex justify-between items-baseline">
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

              {/* Recommended Hospital */}
              {recommendation.hospitalSelection?.bestHospital && (
                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-slate-600 uppercase font-semibold tracking-wider mb-1">
                    Destination Facility Recommendation:
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-emerald-950 text-xs">
                      {recommendation.hospitalSelection.bestHospital.name}
                    </span>
                    <span className="text-xs text-emerald-700 font-mono">
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

          {/* Quick Road Obstruction Controls (Golden path trigger) */}
          <div className="bg-white border border-emerald-200 rounded-xl p-4 text-xs space-y-2 shadow-sm">
            <span className="font-bold text-emerald-950 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Simulate Bottleneck Road Blockage
            </span>
            <p className="text-[11px] text-slate-600">
              Toggle edge <strong>E-39-40</strong> (St. Jude Island Causeway) to observe automatic route invalidation and hospital reachability cut-off.
            </p>
            <button
              onClick={() => {
                const targetEdge = edges.find((e) => e.edgeId === 'E-39-40' || e.edgeId === 'E-40-39');
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
    </div>
  );
}
