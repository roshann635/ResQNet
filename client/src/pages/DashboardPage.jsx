import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Truck,
  Building2,
  Clock,
  ArrowRight,
  TrendingUp,
  Cpu,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardPage() {
  const { user, isAdmin, isEvaluator } = useAuth();
  const [summary, setSummary] = useState(null);
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const [sumData, pqData] = await Promise.all([
          api.getAnalyticsSummary(),
          api.getPriorityQueue()
        ]);
        setSummary(sumData);
        setPriorityQueue(pqData.queue || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
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
    eventSource.addEventListener('REROUTE_EVENT', handleEvent);
    eventSource.addEventListener('ROAD_CONDITION_CHANGED', handleEvent);

    return () => {
      eventSource.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-sm text-slate-600 font-mono">Loading operations console metrics...</span>
        </div>
      </div>
    );
  }

  const severityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-emerald-200 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl overflow-hidden border border-emerald-300 shadow-sm bg-emerald-50 hidden sm:block">
            <img
              src="/images/trauma-kit.jpg"
              alt="Emergency Response Kit & AED"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold uppercase ${
                isAdmin
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}>
                {isAdmin ? 'Dispatcher Console' : 'Executive Audit View'}
              </span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                LIVE NETWORK
              </span>
            </div>

            <h1 className="text-2xl font-black text-emerald-950 tracking-tight">
              Emergency Dispatch Command Console
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time DSA optimization engine: MinHeap priority queues, Dijkstra, A*, and greedy fleet allocation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin ? (
            <button
              onClick={() => navigate('/incidents')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20 transition-all hover:scale-[1.02]"
            >
              <AlertCircle className="w-4 h-4" />
              Report Incident
            </button>
          ) : (
            <button
              onClick={() => navigate('/incidents')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
            >
              <Eye className="w-4 h-4 text-emerald-700" />
              Inspect Triage Queue
            </button>
          )}

          <button
            onClick={() => navigate('/algorithms')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition-colors shadow-sm"
          >
            <Cpu className="w-4 h-4 text-emerald-700" />
            Algorithm Lab
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Incidents */}
        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Incidents</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-950">{priorityQueue.length}</span>
            <span className="text-xs text-red-600 font-medium">In Priority Queue</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-slate-700">Total Recorded:</span> {summary?.incidents?.total || 12}
          </div>
        </div>

        {/* Fleet Availability */}
        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Fleet</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-950">{summary?.fleet?.available || 0}</span>
            <span className="text-xs text-slate-500">/ {summary?.fleet?.total || 0} Ambulances</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
            <span className="text-amber-600 font-medium">{summary?.fleet?.busy || 0} Busy</span>
            <span>•</span>
            <span className="text-slate-400">{summary?.fleet?.offline || 0} Offline</span>
          </div>
        </div>

        {/* Hospital Capacity */}
        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Beds</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-950">{summary?.hospitals?.totalAvailableSlots || 0}</span>
            <span className="text-xs text-slate-500">/ {summary?.hospitals?.totalCapacity || 0} Total Beds</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-700 font-semibold">{summary?.hospitals?.facilities?.length || 5}</span>
            <span>Registered Facilities</span>
          </div>
        </div>

        {/* Network & Algorithm Status */}
        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Graph Version</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700 font-mono">v{summary?.graph?.version || 1}</span>
            <span className="text-xs text-slate-500">Dynamic Counter</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            <span>{summary?.graph?.nodes || 40} Vertices • {summary?.graph?.edges || 116} Edges</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Queue (2 Cols) + Status Panels (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Queue Overview (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-emerald-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Live Incident Priority Queue (Min-Heap Order)
              </h2>
              <p className="text-xs text-slate-500">
                Sorted by severity level with microsecond timestamp FIFO tie-breaking (O(log N)).
              </p>
            </div>
            <button
              onClick={() => navigate('/incidents')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 transition-colors"
            >
              Full Queue View
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-emerald-100">
            {priorityQueue.slice(0, 5).map((inc, idx) => (
              <div key={inc.incidentId} className="py-3 flex flex-wrap items-center justify-between gap-3 group">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center text-xs font-mono font-bold">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-950 text-sm">{inc.incidentId}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${severityBadge(inc.severity)}`}>
                        {inc.severity}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">@ {inc.locationNodeId}</span>
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-1 mt-0.5">{inc.description}</p>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      Priority Key: <span className="text-emerald-700 font-semibold">{inc.priorityKey}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/map?incidentId=${inc.incidentId}`)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-300 transition-all flex items-center gap-1 shadow-sm"
                >
                  Optimize Route
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet & Hospital Quick Status (1 Col) */}
        <div className="space-y-6">
          {/* Hospital Readiness */}
          <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-emerald-950 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Hospital Status & Slots
            </h3>
            <div className="space-y-3">
              {summary?.hospitals?.facilities?.map((h) => (
                <div key={h.hospitalId} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-slate-800">{h.name}</span>
                    <span className={h.availableSlots === 0 ? 'text-red-500 font-bold' : 'text-slate-500'}>
                      {h.availableSlots} / {h.capacity} beds
                    </span>
                  </div>
                  <div className="w-full bg-emerald-50 border border-emerald-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        h.availableSlots === 0 ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.round(((h.capacity - h.availableSlots) / h.capacity) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Golden Path Scenario Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
              <MapPin className="w-4 h-4" />
              Interactive Incident Showcase
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Test end-to-end: Select <strong>INC-001</strong> (Critical Arrhythmia at N-01), compute Dijkstra vs A*, then block bridge <strong>E-39-40</strong> to watch reroute and hospital availability change.
            </p>
            <button
              onClick={() => navigate('/map?incidentId=INC-001')}
              className="mt-3 w-full py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-md shadow-emerald-600/20"
            >
              Launch Dispatch Workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
