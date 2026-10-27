import React, { useState, useEffect } from 'react';
import { Truck, Shield, Activity, Wrench, CheckCircle, Clock } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function FleetPage() {
  const { isAdmin } = useAuth();
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFleet();
  }, []);

  async function loadFleet() {
    try {
      const data = await api.getAmbulances();
      setAmbulances(data);
    } catch (err) {
      console.error('Failed to load fleet:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (ambulanceId, newStatus) => {
    if (!isAdmin) {
      alert('Read-only evaluator mode: Cannot modify ambulance fleet state.');
      return;
    }
    try {
      await api.updateAmbulanceStatus(ambulanceId, { status: newStatus });
      await loadFleet();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const statusBadge = (st) => {
    switch (st) {
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DISPATCHED':
      case 'EN_ROUTE':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'MAINTENANCE':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-emerald-200 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            Response Unit Fleet Management & Eligibility
          </h1>
          <p className="text-xs text-slate-500">
            Real-time readiness telemetry, clinical capabilities, utilization balancing, and greedy reliability metrics.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold shadow-sm">
            {ambulances.filter((a) => a.status === 'AVAILABLE').length} Units Available
          </span>
          <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-semibold shadow-sm">
            {ambulances.filter((a) => a.status === 'DISPATCHED' || a.status === 'EN_ROUTE').length} Busy
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ambulances.map((amb) => (
          <div
            key={amb.ambulanceId}
            className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono font-bold text-emerald-950 text-base">{amb.ambulanceId}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusBadge(amb.status)}`}>
                  {amb.status}
                </span>
              </div>

              <div className="text-xs font-semibold text-slate-800">{amb.label}</div>
              <div className="text-[11px] text-emerald-700 font-mono mt-0.5">
                Type: {amb.vehicleType} • Location: @ {amb.currentNodeId}
              </div>

              {/* Metrics */}
              <div className="mt-4 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200 text-[11px] space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reliability Index:</span>
                  <span className="text-emerald-700 font-bold">{Math.round((amb.reliabilityScore || 0.95) * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Utilization Rate:</span>
                  <span className="text-slate-700 font-bold">{Math.round((amb.utilizationRate || 0.20) * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Runs:</span>
                  <span className="text-slate-700">{amb.totalDispatches || 0}</span>
                </div>
              </div>

              {/* Capabilities */}
              <div className="mt-3">
                <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1.5">
                  Clinical Capabilities:
                </div>
                <div className="flex flex-wrap gap-1">
                  {amb.capabilities?.map((cap) => (
                    <span
                      key={cap}
                      className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Modification Controls */}
            <div className="mt-4 pt-3 border-t border-emerald-100">
              <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                Set Vehicle Status:
              </label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => handleStatusChange(amb.ambulanceId, 'AVAILABLE')}
                  className="py-1 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-colors"
                >
                  Available
                </button>
                <button
                  onClick={() => handleStatusChange(amb.ambulanceId, 'DISPATCHED')}
                  className="py-1 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 transition-colors"
                >
                  Busy
                </button>
                <button
                  onClick={() => handleStatusChange(amb.ambulanceId, 'MAINTENANCE')}
                  className="py-1 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors"
                >
                  Offline
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
