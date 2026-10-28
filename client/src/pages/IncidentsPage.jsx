import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  PlusCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  CheckCircle2,
  ListFilter,
  Eye,
  Lock,
  Cpu,
  Layers,
  Truck,
  Hospital,
  Navigation,
  RotateCcw,
  Activity,
  AlertTriangle,
  Compass,
  Sliders,
  Check,
  XCircle,
  Radio
} from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import RouteSimulationCanvas from '../components/RouteSimulationCanvas.jsx';

export default function IncidentsPage() {
  const { isAdmin, isOperator, isEvaluator, user } = useAuth();
  const canOperate = isAdmin || isOperator;

  // View tabs: 'dispatch' (Operations & Simulation) vs 'lifecycle' (Queue & State Machine)
  const [activeTab, setActiveTab] = useState('dispatch');

  // Core Data
  const [incidents, setIncidents] = useState([]);
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dispatch Scorer state
  const [candidatesData, setCandidatesData] = useState(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  // Route Simulation state (Part F)
  const [simulationData, setSimulationData] = useState(null);
  const [loadingSimulation, setLoadingSimulation] = useState(false);

  // Hospital Recommendation state
  const [hospitalsRec, setHospitalsRec] = useState(null);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);

  // Form state
  const [type, setType] = useState('cardiac arrest');
  const [severity, setSeverity] = useState('CRITICAL');
  const [locationNodeId, setLocationNodeId] = useState('N-01');
  const [description, setDescription] = useState('');
  const [requiredCapabilities, setRequiredCapabilities] = useState(['telemetry', 'advanced-life-support']);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const sampleCycleRef = useRef(0);

  useEffect(() => {
    loadData();

    // Real-time SSE listener
    const token = localStorage.getItem('resqnet_token') || '';
    const eventSource = new EventSource(`/api/events?token=${token}`);

    const handleEvent = () => {
      loadData();
    };

    eventSource.onmessage = handleEvent;
    eventSource.addEventListener('INCIDENT_UPDATE', handleEvent);
    eventSource.addEventListener('AMBULANCE_MOVED', handleEvent);

    return () => {
      eventSource.close();
    };
  }, []);

  async function loadData() {
    try {
      const [incData, pqData, nodeData, edgeData] = await Promise.all([
        api.getIncidents(),
        api.getPriorityQueue(),
        api.getNodes(),
        api.getEdges()
      ]);
      setIncidents(incData);
      setPriorityQueue(pqData.queue || []);
      setNodes(nodeData);
      setEdges(edgeData);
      if (incData.length > 0 && !selectedIncident) {
        setSelectedIncident(incData[0]);
      }
    } catch (err) {
      console.error('Failed to load incident operations data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Deterministic cycling presets (ZERO Math.random)
  const fillSampleData = () => {
    const samples = [
      {
        type: 'cardiac arrest',
        severity: 'CRITICAL',
        node: 'N-05',
        desc: '62yo patient in ventricular fibrillation, bystander CPR in progress',
        caps: ['telemetry', 'advanced-life-support']
      },
      {
        type: 'road accident',
        severity: 'CRITICAL',
        node: 'N-15',
        desc: 'Multi-vehicle collision on highway ring road with trapped passengers',
        caps: ['advanced-life-support', 'first-aid']
      },
      {
        type: 'burns',
        severity: 'HIGH',
        node: 'N-22',
        desc: 'Chemical burn exposure in industrial sector, 2nd degree injuries',
        caps: ['advanced-life-support', 'oxygen']
      },
      {
        type: 'breathing difficulty',
        severity: 'MEDIUM',
        node: 'N-08',
        desc: 'Acute asthma exacerbation unresponsive to standard bronchodilators',
        caps: ['advanced-life-support', 'ventilator']
      }
    ];
    const pick = samples[sampleCycleRef.current % samples.length];
    sampleCycleRef.current += 1;
    setType(pick.type);
    setSeverity(pick.severity);
    setLocationNodeId(pick.node);
    setDescription(pick.desc);
    setRequiredCapabilities(pick.caps);
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!canOperate) {
      setFormError('Read-only auditor mode: Cannot register new incidents.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please enter a clinical description for the emergency.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        type,
        severity,
        locationNodeId,
        description,
        requiredCapabilities
      };
      const created = await api.createIncident(payload);
      setDescription('');
      await loadData();
      setSelectedIncident(created);
      setActiveTab('dispatch');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // One-click Find Best Ambulance (E3 Greedy Candidate Scorer & Part F Route Simulation)
  const handleFindAmbulance = async (incident) => {
    if (!incident) return;
    setLoadingCandidates(true);
    setCandidatesData(null);
    setSelectedAmbulanceId(null);
    try {
      const data = await api.getIncidentCandidates(incident.incidentId);
      const rec = data.recommendation;
      setCandidatesData(rec);

      if (rec?.bestCandidate) {
        const best = rec.bestCandidate;
        setSelectedAmbulanceId(best.ambulanceId);

        // Immediately launch Dijkstra route simulation on canvas for the optimal unit
        const fromNode = best.currentNodeId || 'N-01';
        const toNode = incident.locationNodeId;

        setLoadingSimulation(true);
        try {
          const routeData = await api.computeRoute({
            algorithm: 'DIJKSTRA',
            source: fromNode,
            destination: toNode,
            trace: true
          });

          setSimulationData({
            sourceNodeId: fromNode,
            destinationNodeId: toNode,
            algorithm: 'DIJKSTRA',
            simulationSteps: routeData.steps || [],
            finalPath: routeData.route || routeData.path || [],
            finalCost: routeData.cost || 0,
            ambulanceCallSign: best.callSign || best.ambulanceId,
            graphVersion: routeData.graphVersion || 1
          });
        } catch (simErr) {
          console.warn('Simulation route computation warning:', simErr);
        } finally {
          setLoadingSimulation(false);
        }
      }
    } catch (err) {
      alert(`Candidate evaluation failed: ${err.message}`);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Confirm Dispatch & Launch Route Simulation (Part F)
  const handleConfirmDispatch = async () => {
    if (!canOperate) {
      alert('Read-only auditor account cannot confirm dispatch.');
      return;
    }
    if (!selectedIncident || !selectedAmbulanceId) {
      alert('Please select an eligible ambulance before confirming dispatch.');
      return;
    }

    setDispatching(true);
    try {
      const payload = {
        ambulanceId: selectedAmbulanceId,
        algorithm: 'DIJKSTRA',
        reason: overrideReason.trim() || undefined
      };
      const result = await api.confirmIncidentDispatch(selectedIncident.incidentId, payload);
      setDispatchResult(result);

      // Recompute route with trace for the Part F Route Simulation
      const chosenCandidate =
        candidatesData?.eligibleCandidates?.find((c) => c.ambulanceId === selectedAmbulanceId) ||
        candidatesData?.bestCandidate;

      const fromNode = chosenCandidate?.currentNodeId || 'N-01';
      const toNode = selectedIncident.locationNodeId;

      setLoadingSimulation(true);
      const routeData = await api.computeRoute({
        algorithm: 'DIJKSTRA',
        source: fromNode,
        destination: toNode,
        trace: true
      });

      setSimulationData({
        sourceNodeId: fromNode,
        destinationNodeId: toNode,
        algorithm: 'DIJKSTRA',
        simulationSteps: routeData.steps || [],
        finalPath: routeData.route || routeData.path || [],
        finalCost: routeData.cost || 0,
        ambulanceCallSign: chosenCandidate?.callSign || selectedAmbulanceId,
        graphVersion: routeData.graphVersion || 1
      });

      await loadData();
    } catch (err) {
      alert(`Dispatch confirmation failed: ${err.message}`);
    } finally {
      setDispatching(false);
      setLoadingSimulation(false);
    }
  };

  // Hospital Recommendation (E6 Hospital Selector)
  const handleFindHospital = async () => {
    if (!selectedIncident) return;
    setLoadingHospitals(true);
    try {
      const data = await api.getHospitalRecommendation(selectedIncident.incidentId);
      setHospitalsRec(data.recommendation);
      if (data.recommendation?.eligibleHospitals?.length > 0) {
        setSelectedHospital(data.recommendation.eligibleHospitals[0]);
      }
    } catch (err) {
      alert(`Hospital recommendation failed: ${err.message}`);
    } finally {
      setLoadingHospitals(false);
    }
  };

  // Simulate Hospital Route
  const handleSimulateHospitalRoute = async (hosp) => {
    if (!selectedIncident || !hosp) return;
    setLoadingSimulation(true);
    try {
      const routeData = await api.computeRoute({
        algorithm: 'DIJKSTRA',
        source: selectedIncident.locationNodeId,
        destination: hosp.nodeId,
        trace: true
      });

      setSimulationData({
        sourceNodeId: selectedIncident.locationNodeId,
        destinationNodeId: hosp.nodeId,
        algorithm: 'DIJKSTRA',
        simulationSteps: routeData.steps || [],
        finalPath: routeData.route || routeData.path || [],
        finalCost: routeData.cost || 0,
        ambulanceCallSign: selectedAmbulanceId || 'Unit-ALS-1',
        graphVersion: routeData.graphVersion || 1
      });
    } catch (err) {
      alert(`Hospital route computation failed: ${err.message}`);
    } finally {
      setLoadingSimulation(false);
    }
  };

  // Dynamic Road Block on Simulation Canvas (E4 Real-time Road Updates)
  const handleBlockEdge = async (edgeId) => {
    if (!canOperate) {
      alert('Read-only auditor account cannot modify road network conditions.');
      return;
    }
    try {
      const res = await api.updateEdgeCondition(edgeId, {
        condition: 'BLOCKED',
        multiplier: Infinity
      });

      // Update local edge state
      setEdges((prev) =>
        prev.map((e) => (e.edgeId === edgeId ? { ...e, condition: 'BLOCKED', multiplier: Infinity } : e))
      );

      // Re-fetch simulation route to observe immediate live reroute
      if (simulationData) {
        const rerouted = await api.computeRoute({
          algorithm: 'DIJKSTRA',
          source: simulationData.sourceNodeId,
          destination: simulationData.destinationNodeId,
          trace: true
        });

        setSimulationData((prev) => ({
          ...prev,
          simulationSteps: rerouted.steps || [],
          finalPath: rerouted.route || rerouted.path || [],
          finalCost: rerouted.cost || 0,
          graphVersion: res.graphVersion || prev.graphVersion + 1
        }));
      }

      alert(`Road segment ${edgeId} BLOCKED. Graph bumped to v${res.graphVersion}. Dynamic reroute applied!`);
    } catch (err) {
      alert(`Road condition update failed: ${err.message}`);
    }
  };

  const handleStatusTransition = async (incidentId, newStatus) => {
    if (!canOperate) {
      alert('Read-only auditor account cannot change incident lifecycle status.');
      return;
    }
    try {
      const updated = await api.updateIncidentStatus(incidentId, {
        newStatus,
        note: `Manual dispatcher transition to ${newStatus}`
      });
      await loadData();
      setSelectedIncident(updated);
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const severityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-300';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-300';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    }
  };

  const allowedTransitionsMap = {
    Registered: ['Prioritized', 'Cancelled'],
    Prioritized: ['AwaitingResource', 'AmbulanceAssigned', 'Cancelled'],
    AwaitingResource: ['AmbulanceAssigned', 'Cancelled'],
    AmbulanceAssigned: ['EnRoute', 'Cancelled'],
    EnRoute: ['AtScene', 'Cancelled'],
    AtScene: ['Transporting'],
    Transporting: ['Resolved'],
    Resolved: [],
    Cancelled: []
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-500 font-mono text-xs">
        <Activity className="w-5 h-5 text-emerald-600 animate-spin mr-2" />
        Extracting Priority Queue from hand-crafted MinHeap...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-emerald-200 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-emerald-300 bg-emerald-50 shrink-0">
            <img
              src="/images/cardiac-monitor.jpg"
              alt="Cardiac Vitals Monitor"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
              Emergency Operations Console
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                MinHeap O(log N) + Dijkstra O((V+E)log V)
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Intelligent greedy ambulance dispatch, real-time wavefront route navigation, and hospital triage.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs">
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'dispatch'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-emerald-950'
            }`}
          >
            Dispatch Operations & Route Navigation
          </button>
          <button
            onClick={() => setActiveTab('lifecycle')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'lifecycle'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-emerald-950'
            }`}
          >
            Queue & Lifecycle State Machine
          </button>
        </div>
      </div>

      {/* TAB 1: DISPATCH OPERATIONS & ROUTE SIMULATION */}
      {activeTab === 'dispatch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Emergency Queue (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <ListFilter className="w-4 h-4 text-emerald-600" />
                  Live Priority Queue ({priorityQueue.length})
                </h2>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Total: {incidents.length}
                </span>
              </div>

              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {incidents.map((inc) => {
                  const isSelected = selectedIncident?.incidentId === inc.incidentId;
                  return (
                    <div
                      key={inc.incidentId}
                      onClick={() => {
                        setSelectedIncident(inc);
                        setCandidatesData(null);
                        setSimulationData(null);
                        setHospitalsRec(null);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-emerald-950">{inc.incidentId}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${severityBadge(inc.severity)}`}>
                          {inc.severity}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-1 capitalize">{inc.type}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{inc.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1.5 border-t border-slate-100 font-mono">
                        <span className="text-emerald-700 font-semibold">@ {inc.locationNodeId}</span>
                        <span className="uppercase font-bold text-slate-600">{inc.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Dispatch Workbench & Route Simulation (8 Cols) */}
          <div className="lg:col-span-8 space-y-5">
            {selectedIncident ? (
              <>
                {/* Active Incident Summary Banner */}
                <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {selectedIncident.incidentId}
                      </span>
                      <h3 className="text-sm font-bold text-emerald-950 capitalize">{selectedIncident.type}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${severityBadge(selectedIncident.severity)}`}>
                        {selectedIncident.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {selectedIncident.description} · <span className="font-mono text-emerald-700 font-medium">Vertex: {selectedIncident.locationNodeId}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFindAmbulance(selectedIncident)}
                      disabled={loadingCandidates}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                    >
                      <Truck className="w-4 h-4" />
                      {loadingCandidates ? 'Calculating...' : 'Find Best Ambulance'}
                    </button>

                    <button
                      onClick={handleFindHospital}
                      disabled={loadingHospitals}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Hospital className="w-4 h-4" />
                      {loadingHospitals ? 'Evaluating...' : 'Recommend Hospital'}
                    </button>
                  </div>
                </div>

                {/* Candidate Scorer Breakdown (E3 Greedy Dispatch) */}
                {candidatesData && (
                  <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-emerald-600" />
                        Multi-Factor Greedy Dispatch Evaluation
                      </h3>
                      <span className="text-[10px] font-mono text-slate-500">
                        Evaluated {candidatesData.evaluatedCount || 0} fleet units
                      </span>
                    </div>

                    {/* Best Recommended Unit Card */}
                    {candidatesData.bestCandidate ? (
                      <div className="bg-emerald-50/60 border border-emerald-300 rounded-xl p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                              Optimal Recommendation
                            </span>
                            <div className="text-base font-black text-emerald-950 flex items-center gap-2 mt-0.5">
                              {candidatesData.bestCandidate.callSign || candidatesData.bestCandidate.ambulanceId}
                              <span className="text-xs font-normal text-slate-600">({candidatesData.bestCandidate.type})</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-emerald-700 font-mono">
                              Score: {candidatesData.bestCandidate.score?.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              ETA: ~{candidatesData.bestCandidate.etaMinutes?.toFixed(1) || '3.5'} mins ({candidatesData.bestCandidate.routeCost?.toFixed(1)}s)
                            </div>
                          </div>
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/80 text-[11px] font-mono">
                          <div className="p-2 rounded bg-white border border-emerald-200">
                            <span className="text-slate-500 block text-[10px]">Location</span>
                            <span className="font-bold text-slate-800">{candidatesData.bestCandidate.currentNodeId}</span>
                          </div>
                          <div className="p-2 rounded bg-white border border-emerald-200">
                            <span className="text-slate-500 block text-[10px]">Fuel Level</span>
                            <span className="font-bold text-emerald-700">{Math.round((candidatesData.bestCandidate.fuelPct || 0.9) * 100)}%</span>
                          </div>
                          <div className="p-2 rounded bg-white border border-emerald-200">
                            <span className="text-slate-500 block text-[10px]">Fatigue</span>
                            <span className="font-bold text-slate-800">{candidatesData.bestCandidate.crewFatigue || 1}/10</span>
                          </div>
                          <div className="p-2 rounded bg-white border border-emerald-200">
                            <span className="text-slate-500 block text-[10px]">Capabilities</span>
                            <span className="font-bold text-emerald-800">Match (100%)</span>
                          </div>
                        </div>

                        {/* Confirm Dispatch Button */}
                        <div className="pt-2 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-slate-600 font-mono">
                            One active incident per ambulance enforced at DB level.
                          </span>
                          <button
                            onClick={handleConfirmDispatch}
                            disabled={dispatching || !canOperate}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            {dispatching ? 'Assigning Unit...' : 'Confirm Dispatch & Lock In Fleet Unit'}
                          </button>
                        </div>

                        {/* Alternative Eligible Candidate Units */}
                        {candidatesData.eligibleCandidates?.length > 1 && (
                          <div className="pt-3 border-t border-emerald-200">
                            <h4 className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-2">
                              Alternative Eligible Units ({candidatesData.eligibleCandidates.length - 1})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                              {candidatesData.eligibleCandidates.slice(1, 7).map((cand) => {
                                const isSelected = selectedAmbulanceId === cand.ambulanceId;
                                return (
                                  <button
                                    key={cand.ambulanceId}
                                    type="button"
                                    onClick={async () => {
                                      setSelectedAmbulanceId(cand.ambulanceId);
                                      const fromNode = cand.currentNodeId || 'N-01';
                                      const toNode = selectedIncident.locationNodeId;
                                      setLoadingSimulation(true);
                                      try {
                                        const routeData = await api.computeRoute({
                                          algorithm: 'DIJKSTRA',
                                          source: fromNode,
                                          destination: toNode,
                                          trace: true
                                        });
                                        setSimulationData({
                                          sourceNodeId: fromNode,
                                          destinationNodeId: toNode,
                                          algorithm: 'DIJKSTRA',
                                          simulationSteps: routeData.steps || [],
                                          finalPath: routeData.route || routeData.path || [],
                                          finalCost: routeData.cost || 0,
                                          ambulanceCallSign: cand.callSign || cand.ambulanceId,
                                          graphVersion: routeData.graphVersion || 1
                                        });
                                      } catch (e) {
                                        console.warn(e);
                                      } finally {
                                        setLoadingSimulation(false);
                                      }
                                    }}
                                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between text-xs ${
                                      isSelected
                                        ? 'bg-emerald-100 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                                        : 'bg-white hover:bg-emerald-50/50 border-slate-200'
                                    }`}
                                  >
                                    <div>
                                      <div className="font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                                        {cand.callSign || cand.ambulanceId}
                                        <span className="text-[10px] text-slate-500 font-sans">({cand.type})</span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        Node: {cand.currentNodeId} • Cost: {cand.routeCost?.toFixed(1)} km
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono font-bold text-emerald-700 text-xs">
                                        Score: {cand.score?.toFixed(2)}
                                      </div>
                                      <div className="text-[9px] text-emerald-600 font-semibold">Click to simulate</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Awaiting Resource: All compatible ambulances are currently engaged on active incidents.</span>
                      </div>
                    )}

                    {/* Ineligible Ambulances with Explicit Rejection Reasons */}
                    {candidatesData.ineligibleCandidates?.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Excluded Fleet Units ({candidatesData.ineligibleCandidates.length})
                        </h4>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {candidatesData.ineligibleCandidates.slice(0, 6).map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2 font-mono">
                                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                <span className="font-bold text-slate-700">{item.ambulanceId || item.callSign}</span>
                                <span className="text-[10px] text-slate-500">({item.type || 'BLS'})</span>
                              </div>
                              <span className="text-[10px] text-red-600 font-mono bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                {item.reason || 'Lacks ICU capability or currently busy'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hospital Recommendation Panel (E6 Hospital Selector) */}
                {hospitalsRec && (
                  <div className="bg-white border border-purple-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Hospital className="w-4 h-4 text-purple-600" />
                        Hospital Admission Recommendation
                      </h3>
                      <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {hospitalsRec.eligibleHospitals?.length || 0} Eligible
                      </span>
                    </div>

                    <div className="space-y-2">
                      {hospitalsRec.eligibleHospitals?.slice(0, 3).map((hosp, idx) => (
                        <div
                          key={hosp.hospitalId}
                          className="p-3 rounded-xl bg-purple-50/50 border border-purple-200 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-bold text-purple-950 flex items-center gap-2">
                              #{idx + 1} {hosp.name}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-mono font-medium">
                                {hosp.tier}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Node: {hosp.nodeId} · Beds: {hosp.availableBeds}/{hosp.totalBeds} (ICU: {hosp.availableIcu})
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right font-mono text-[11px]">
                              <span className="text-purple-700 font-bold">Cost: {hosp.routeCost?.toFixed(1)}s</span>
                            </div>
                            <button
                              onClick={() => handleSimulateHospitalRoute(hosp)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-sm"
                            >
                              Simulate Route
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {hospitalsRec.ineligibleHospitals?.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Ineligible Hospitals ({hospitalsRec.ineligibleHospitals.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {hospitalsRec.ineligibleHospitals.slice(0, 4).map((h) => (
                            <span
                              key={h.hospitalId}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                            >
                              {h.name}: {h.reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SIGNATURE PART F ROUTE SIMULATION CANVAS */}
                {simulationData ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        Live Route Navigation: Wavefront Expansion & Fleet Telemetry
                      </h3>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {simulationData.sourceNodeId} → {simulationData.destinationNodeId}
                      </span>
                    </div>

                    <RouteSimulationCanvas
                      nodes={nodes}
                      edges={edges}
                      sourceNodeId={simulationData.sourceNodeId}
                      destinationNodeId={simulationData.destinationNodeId}
                      algorithm={simulationData.algorithm}
                      simulationSteps={simulationData.simulationSteps}
                      finalPath={simulationData.finalPath}
                      finalCost={simulationData.finalCost}
                      graphVersion={simulationData.graphVersion}
                      ambulanceCallSign={simulationData.ambulanceCallSign}
                      onBlockEdge={handleBlockEdge}
                    />
                  </div>
                ) : (
                  <div className="bg-white border border-dashed border-emerald-200 rounded-2xl p-10 text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto border border-emerald-200">
                      <Navigation className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-emerald-950">No Active Dispatch Navigation</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Click <strong>"Find Best Ambulance"</strong> and <strong>"Confirm Dispatch"</strong> above to trigger the wavefront pathfinding engine, optimal route polyline, and real-time ambulance tracking.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white border border-emerald-200 rounded-2xl p-12 text-center text-slate-500 text-xs">
                Select an incident from the Priority Queue to begin operations.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: QUEUE & LIFECYCLE STATE MACHINE */}
      {activeTab === 'lifecycle' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dispatcher Incident Creation Form */}
          {canOperate ? (
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  Register Simulated Incident
                </h2>
                <button
                  type="button"
                  onClick={fillSampleData}
                  className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Sample Preset
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateIncident} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">Emergency Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-sans"
                  >
                    <option value="cardiac arrest">cardiac arrest</option>
                    <option value="road accident">road accident</option>
                    <option value="fall injury">fall injury</option>
                    <option value="burns">burns</option>
                    <option value="breathing difficulty">breathing difficulty</option>
                    <option value="maternity emergency">maternity emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">Severity Tier</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSeverity(s)}
                        className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          severity === s
                            ? severityBadge(s) + ' shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-emerald-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">Location Node</label>
                  <select
                    value={locationNodeId}
                    onChange={(e) => setLocationNodeId(e.target.value)}
                    className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                  >
                    {nodes.map((n) => (
                      <option key={n.nodeId} value={n.nodeId}>
                        {n.nodeId} — {n.label} ({n.zone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Clinical triage summary or dispatch note..."
                    className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20"
                >
                  {submitting ? 'Registering...' : 'Submit to Priority Queue'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-600" />
                Priority Queue DSA Inspector
              </h2>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <span className="font-bold block mb-1">Auditor Mode Active</span>
                <p className="text-[11px] text-slate-600">
                  Incident submission is restricted to Dispatchers. The hand-crafted Priority Queue order and tie-breaking metrics are rendered live from MongoDB.
                </p>
              </div>
            </div>
          )}

          {/* Center Column: Registry List */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <ListFilter className="w-4 h-4 text-emerald-600" />
              Incident Registry ({incidents.length})
            </h2>
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {incidents.map((inc) => (
                <div
                  key={inc.incidentId}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedIncident?.incidentId === inc.incidentId
                      ? 'bg-emerald-50 border-emerald-500 shadow-md'
                      : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-emerald-950">{inc.incidentId}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${severityBadge(inc.severity)}`}>
                      {inc.severity}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 mt-1 line-clamp-1">{inc.description}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-100 font-mono">
                    <span className="text-emerald-700 font-medium">@ {inc.locationNodeId}</span>
                    <span className="uppercase">{inc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: State Machine & Audit History */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              Lifecycle State Machine
            </h2>

            {selectedIncident ? (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Incident:</span>
                    <span className="font-mono font-bold text-emerald-950">{selectedIncident.incidentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Status:</span>
                    <span className="font-mono font-bold text-emerald-700">{selectedIncident.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Unit:</span>
                    <span className="font-mono text-slate-800">{selectedIncident.assignedAmbulanceId || 'None'}</span>
                  </div>
                </div>

                {/* State Advance Buttons */}
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1.5">
                    Advance Lifecycle State:
                  </label>
                  {canOperate ? (
                    allowedTransitionsMap[selectedIncident.status]?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {allowedTransitionsMap[selectedIncident.status].map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => handleStatusTransition(selectedIncident.incidentId, nextStatus)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          >
                            Advance to {nextStatus}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic">Terminal state reached ({selectedIncident.status}).</div>
                    )
                  ) : (
                    <div className="text-[11px] text-slate-600 font-mono p-2.5 rounded bg-emerald-50/50 border border-emerald-200 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>State transitions restricted to Operator role.</span>
                    </div>
                  )}
                </div>

                {/* Status History Trail */}
                <div>
                  <h3 className="font-semibold text-emerald-950 mb-2">Audit History Trail:</h3>
                  <div className="space-y-2 border-l-2 border-emerald-200 pl-3">
                    {selectedIncident.statusHistory?.map((hist, idx) => (
                      <div key={idx} className="relative text-[11px]">
                        <div className="font-bold text-emerald-700">{hist.status}</div>
                        <div className="text-slate-500 text-[10px]">
                          {new Date(hist.timestamp).toLocaleTimeString()} • {hist.actorId} (v{hist.routeVersion})
                        </div>
                        <div className="text-slate-700 mt-0.5">{hist.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs">Select an incident to view state machine details.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
