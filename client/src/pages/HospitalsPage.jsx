import React, { useState, useEffect } from 'react';
import { Building2, Activity, AlertTriangle, CheckCircle, ShieldCheck, Bed } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function HospitalsPage() {
  const { isAdmin } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHospitals();
  }, []);

  async function loadHospitals() {
    try {
      const data = await api.getHospitals();
      setHospitals(data);
    } catch (err) {
      console.error('Failed to load hospitals:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateSlots = async (hospitalId, delta) => {
    if (!isAdmin) {
      alert('Read-only evaluator mode: Cannot update hospital bed availability.');
      return;
    }
    const hosp = hospitals.find((h) => h.hospitalId === hospitalId);
    if (!hosp) return;
    const newSlots = Math.max(0, Math.min(hosp.capacity, hosp.availableSlots + delta));

    try {
      await api.updateHospital(hospitalId, { availableSlots: newSlots });
      await loadHospitals();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Hospital Capacity & Specialty Facility Network
          </h1>
          <p className="text-xs text-slate-400">
            Real-time emergency admissions routing, capacity filtering, and automated diversion management.
          </p>
        </div>

        <div className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-lg">
          5 Network Facilities Monitored
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {hospitals.map((hosp) => {
          const isAtCapacity = hosp.availableSlots === 0 || hosp.status === 'AT_CAPACITY';
          const isIslandHospital = hosp.hospitalId === 'HOS-005';
          const occupancy = Math.round(((hosp.capacity - hosp.availableSlots) / hosp.capacity) * 100);

          return (
            <div
              key={hosp.hospitalId}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-white text-base">{hosp.hospitalId}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      isAtCapacity
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {isAtCapacity ? 'AT CAPACITY' : hosp.status}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm">{hosp.name}</h3>
                <div className="text-xs text-cyan-400 font-mono mt-0.5">
                  Node: {hosp.nodeId} {isIslandHospital && '• [Island Sector: Bottleneck Access]'}
                </div>

                {/* Capacity Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Available Bed Slots:</span>
                    <span className={`font-mono font-bold ${isAtCapacity ? 'text-red-400' : 'text-slate-200'}`}>
                      {hosp.availableSlots} / {hosp.capacity} ({occupancy}% full)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isAtCapacity ? 'bg-red-500' : occupancy > 85 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${occupancy}%` }}
                    />
                  </div>
                </div>

                {/* Capabilities */}
                <div className="mt-4">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1.5">
                    Specialty Medical Units:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {hosp.capabilities?.map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] px-2 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-800/60 font-mono"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {isIslandHospital && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-400">
                    ⚠️ Reachability Warning: Dependent on bridge E-39-40. Blocking causeway makes this facility strictly unreachable.
                  </div>
                )}
              </div>

              {/* Bed Controls */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Adjust Free Slots:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleUpdateSlots(hosp.hospitalId, -1)}
                    disabled={!isAdmin || hosp.availableSlots <= 0}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold disabled:opacity-30 text-xs flex items-center justify-center"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => handleUpdateSlots(hosp.hospitalId, 1)}
                    disabled={!isAdmin || hosp.availableSlots >= hosp.capacity}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold disabled:opacity-30 text-xs flex items-center justify-center"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
