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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-cyan-400" />
            Live Road Graph & Intelligent Dispatch
          </h1>
          <p className="text-xs text-slate-400">
            Interactive network topology with dynamic road conditions, live vehicle tracking, and automated multi-factor scoring.
          </p>
        </div>

        {notification && (
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <label className="block text-xs font-semibold text-slate-300 mb-2">Select Active Incident</label>
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-cyan-500"
            >
              {incidents.map((inc) => (
                <option key={inc.incidentId} value={inc.incidentId}>
                  {inc.incidentId} [{inc.severity}] — {inc.type} @ {inc.locationNodeId}
                </option>
              ))}
            </select>

            {selectedIncident && (
              <div className="mt-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-semibold text-cyan-400">{selectedIncident.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Location Vertex:</span>
                  <span className="font-mono text-slate-200">{selectedIncident.locationNodeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Required Skills:</span>
                  <span className="text-slate-300">
                    {selectedIncident.requiredCapabilities?.join(', ') || 'basic-life-support'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 mt-1">
                  {selectedIncident.description}
                </p>
              </div>
            )}
          </div>

          {/* Greedy Dispatch Recommendation Panel */}
          {recommendation?.ambulanceSelection?.bestCandidate ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Optimal Ambulance Match
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Score: {recommendation.ambulanceSelection.bestCandidate.totalScore}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-white text-sm">
                    {recommendation.ambulanceSelection.bestCandidate.ambulanceId} ({recommendation.ambulanceSelection.bestCandidate.vehicleType})
                  </span>
                  <span className="text-xs text-cyan-400 font-semibold font-mono">
                    {recommendation.ambulanceSelection.bestCandidate.breakdown.rawRouteCost.toFixed(2)} km
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Stationed at: <span className="text-slate-300 font-mono">{recommendation.ambulanceSelection.bestCandidate.currentNodeId}</span>
                </div>

                {/* Score Breakdown (Section 3.9) */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] space-y-1 font-mono">
                  <div className="text-slate-400 font-sans font-semibold mb-1">Greedy Penalty Breakdown:</div>
                  <div className="flex justify-between text-slate-300">
                    <span>Route Cost (w1=0.40):</span>
                    <span>+{recommendation.ambulanceSelection.bestCandidate.breakdown.weightedRouteCost}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Utilization (w2=0.25):</span>
                    <span>+{recommendation.ambulanceSelection.bestCandidate.breakdown.weightedUtilization}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Capability (w3=0.20):</span>
                    <span>+{recommendation.ambulanceSelection.bestCandidate.breakdown.weightedCapability}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Reliability (w4=0.15):</span>
                    <span>+{recommendation.ambulanceSelection.bestCandidate.breakdown.weightedReliability}</span>
                  </div>
                </div>
              </div>

              {/* Recommended Hospital */}
              {recommendation.hospitalSelection?.bestHospital && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">
                    Destination Facility Recommendation:
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-white text-xs">
                      {recommendation.hospitalSelection.bestHospital.name}
                    </span>
                    <span className="text-xs text-cyan-400 font-mono">
                      {recommendation.hospitalSelection.bestHospital.routeCost.toFixed(2)} km
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Location: <span className="font-mono text-slate-300">{recommendation.hospitalSelection.bestHospital.nodeId}</span> •
                    Slots: <span className="text-emerald-400">{recommendation.hospitalSelection.bestHospital.availableSlots} beds free</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleConfirmDispatch}
                disabled={dispatching || !isAdmin}
                className="w-full py-2.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                {dispatching ? 'Assigning...' : 'Confirm & Dispatch Unit'}
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-white">No Eligible Response Units</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                {recommendation?.ambulanceSelection?.rejected?.[0]?.reason ||
                  'All units are currently dispatched or road access is disconnected.'}
              </p>
            </div>
          )}

          {/* Quick Road Obstruction Controls (Golden path trigger) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Simulate Bottleneck Road Blockage
            </span>
            <p className="text-[11px] text-slate-400">
              Toggle edge <strong>E-39-40</strong> (St. Jude Island Causeway) to observe automatic route invalidation and hospital reachability cut-off.
            </p>
            <button
              onClick={() => {
                const targetEdge = edges.find((e) => e.edgeId === 'E-39-40' || e.edgeId === 'E-40-39');
                if (targetEdge) setSelectedEdge(targetEdge);
              }}
              className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium"
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
