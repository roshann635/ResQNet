import React, { useState, useEffect } from 'react';
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
  Layers
} from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function IncidentsPage() {
  const { isAdmin, isEvaluator } = useAuth();

  const [incidents, setIncidents] = useState([]);
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [type, setType] = useState('cardiac arrest');
  const [severity, setSeverity] = useState('CRITICAL');
  const [locationNodeId, setLocationNodeId] = useState('N-01');
  const [description, setDescription] = useState('');
  const [requiredCapabilities, setRequiredCapabilities] = useState(['cardiac-monitor', 'advanced-life-support']);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [incData, pqData, nodeData] = await Promise.all([
        api.getIncidents(),
        api.getPriorityQueue(),
        api.getNodes()
      ]);
      setIncidents(incData);
      setPriorityQueue(pqData.queue || []);
      setNodes(nodeData);
      if (incData.length > 0 && !selectedIncident) {
        setSelectedIncident(incData[0]);
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  }

  const fillSampleData = () => {
    const samples = [
      {
        type: 'cardiac arrest',
        severity: 'CRITICAL',
        node: 'N-05',
        desc: '62yo patient in ventricular fibrillation, bystander CPR in progress',
        caps: ['cardiac-monitor', 'advanced-life-support']
      },
      {
        type: 'road accident',
        severity: 'CRITICAL',
        node: 'N-15',
        desc: 'Multi-vehicle collision on highway ring road with trapped passengers',
        caps: ['trauma-care', 'pediatric-support']
      },
      {
        type: 'burns',
        severity: 'HIGH',
        node: 'N-22',
        desc: 'Chemical burn exposure in industrial sector, 2nd degree injuries',
        caps: ['burn-unit']
      },
      {
        type: 'breathing difficulty',
        severity: 'MEDIUM',
        node: 'N-08',
        desc: 'Acute asthma exacerbation unresponsive to standard bronchodilators',
        caps: ['advanced-life-support']
      }
    ];
    const pick = samples[Math.floor(Math.random() * samples.length)];
    setType(pick.type);
    setSeverity(pick.severity);
    setLocationNodeId(pick.node);
    setDescription(pick.desc);
    setRequiredCapabilities(pick.caps);
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setFormError('Read-only evaluator mode: Cannot register new incidents.');
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
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusTransition = async (incidentId, newStatus) => {
    if (!isAdmin) {
      alert('Read-only evaluator account cannot change incident lifecycle status.');
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
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const allowedTransitionsMap = {
    REPORTED: ['TRIAGED', 'CANCELLED'],
    TRIAGED: ['DISPATCHED', 'CANCELLED'],
    DISPATCHED: ['EN_ROUTE', 'CANCELLED'],
    EN_ROUTE: ['ON_SCENE', 'CANCELLED'],
    ON_SCENE: ['TRANSPORTING'],
    TRANSPORTING: ['RESOLVED'],
    RESOLVED: [],
    CANCELLED: []
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400 font-mono text-sm">
        Extracting Priority Queue from hand-crafted MinHeap...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Role Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-emerald-200 p-5 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-emerald-950 tracking-tight flex items-center gap-2.5">
            Emergency Incident Management & Priority Queue
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
              Min-Heap O(log N)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hand-crafted multi-level priority queue: Severity tiering + timestamp FIFO tie-breaking with strict RBAC lifecycle validation.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={fillSampleData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-300 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Fill Sample Data
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium">
            <Eye className="w-3.5 h-3.5 text-emerald-700" />
            Evaluator Mode (Read-Only)
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Role-Tailored Panel */}
        {isAdmin ? (
          // Dispatcher: Incident Creation Form
          <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              Register Simulated Emergency
            </h2>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-red-600 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">Emergency Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-emerald-50/30 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-sans"
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
                <label className="block text-xs font-semibold text-emerald-950 mb-1">Severity Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        severity === s
                          ? severityBadge(s) + ' shadow-sm'
                          : 'bg-white border-emerald-200 text-slate-600 hover:bg-emerald-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">Incident Location Node</label>
                <select
                  value={locationNodeId}
                  onChange={(e) => setLocationNodeId(e.target.value)}
                  className="w-full bg-emerald-50/30 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                >
                  {nodes.map((n) => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {n.nodeId} — {n.label} ({n.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">Clinical Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Clinical symptom summary or incident dispatch details..."
                  className="w-full bg-emerald-50/30 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">Required Capabilities</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'advanced-life-support',
                    'cardiac-monitor',
                    'trauma-care',
                    'burn-unit',
                    'pediatric-support',
                    'neonatal-care'
                  ].map((cap) => {
                    const active = requiredCapabilities.includes(cap);
                    return (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => {
                          setRequiredCapabilities((prev) =>
                            active ? prev.filter((c) => c !== cap) : [...prev, cap]
                          );
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-colors ${
                          active
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-400 shadow-sm'
                            : 'bg-white text-slate-600 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {cap}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors shadow-md shadow-red-600/20"
              >
                {submitting ? 'Registering...' : 'Submit Incident to Priority Queue'}
              </button>
            </form>
          </div>
        ) : (
          // Evaluator: Priority Queue Analysis & Invariant Inspection Panel
          <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-600" />
              Priority Queue DSA Inspector
            </h2>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                Evaluator Mode Active
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Emergency registration is restricted to Dispatchers. The hand-crafted Priority Queue order and tie-breaking metrics can be inspected live below.
              </p>
            </div>

            <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200 space-y-2 text-xs font-mono">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Priority Key Calculation
              </div>
              <div className="text-emerald-950 text-[11px] bg-white p-2 rounded border border-emerald-200">
                <code>priorityKey = (severityTier * 1e14) + timestamp</code>
              </div>
              <div className="space-y-1 text-[11px] text-slate-600 pt-1">
                <div className="flex justify-between">
                  <span>CRITICAL (Tier 0):</span>
                  <span className="text-red-600 font-bold">Highest Priority</span>
                </div>
                <div className="flex justify-between">
                  <span>HIGH (Tier 1):</span>
                  <span className="text-orange-600 font-bold">Tier 1</span>
                </div>
                <div className="flex justify-between">
                  <span>MEDIUM (Tier 2):</span>
                  <span className="text-amber-600 font-bold">Tier 2</span>
                </div>
                <div className="flex justify-between">
                  <span>LOW (Tier 3):</span>
                  <span className="text-emerald-700 font-bold">Tier 3</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Incidents:</span>
                <span className="font-bold text-emerald-950">{incidents.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active in MinHeap:</span>
                <span className="font-bold text-emerald-700">{priorityQueue.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resolved / Closed:</span>
                <span className="font-bold text-emerald-700">{incidents.filter((i) => i.status === 'RESOLVED').length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Center: Incident List & Queue */}
        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-emerald-600" />
              Incidents Registry ({incidents.length})
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Queue Size: {priorityQueue.length}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {incidents.map((inc) => {
              const isSelected = selectedIncident?.incidentId === inc.incidentId;
              return (
                <div
                  key={inc.incidentId}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 shadow-md'
                      : 'bg-white border-emerald-200/90 hover:border-emerald-400 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-950">{inc.incidentId}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${severityBadge(inc.severity)}`}>
                      {inc.severity}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 mt-1 line-clamp-1">{inc.description}</div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-1 border-t border-emerald-100">
                    <span className="font-mono text-emerald-700 font-medium">@ {inc.locationNodeId}</span>
                    <span className="text-slate-500 uppercase text-[10px]">{inc.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: State Machine Inspector & History Timeline */}
        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Lifecycle State Machine & Audit
          </h2>

          {selectedIncident ? (
            <div className="space-y-4 text-xs">
              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Incident:</span>
                  <span className="font-bold text-emerald-950">{selectedIncident.incidentId}</span>
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

              {/* State Machine Transition Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">
                  Validate & Advance Lifecycle State:
                </label>
                {isAdmin ? (
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
                  <div className="text-[11px] text-slate-700 font-mono p-2.5 rounded bg-emerald-50/50 border border-emerald-200 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>State transitions restricted to Dispatcher role.</span>
                  </div>
                )}
              </div>

              {/* Status History Timeline */}
              <div>
                <h3 className="font-semibold text-emerald-950 mb-2">Lifecycle History Trail:</h3>
                <div className="space-y-2 border-l-2 border-emerald-200 pl-3">
                  {selectedIncident.statusHistory?.map((hist, idx) => (
                    <div key={idx} className="relative text-[11px]">
                      <div className="font-bold text-emerald-700">{hist.status}</div>
                      <div className="text-slate-500 text-[10px]">
                        {new Date(hist.timestamp).toLocaleTimeString()} • {hist.actorId} (Graph v{hist.routeVersion})
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
    </div>
  );
}
