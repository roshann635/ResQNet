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
      alert('Read-only auditor mode: Cannot update hospital bed availability.');
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
      <div className="bg-white border border-emerald-200 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Hospital Capacity & Specialty Facility Network
          </h1>
          <p className="text-xs text-slate-500">
            Real-time emergency admissions routing, capacity filtering, and automated diversion management.
          </p>
        </div>

        <div className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-lg shadow-sm font-semibold">
          5 Network Facilities Monitored
        </div>
      </div>

      {/* Hospital Network Showcase Banner */}
      <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row items-stretch">
        <div className="md:w-1/3 min-h-[160px] relative bg-emerald-50">
          <img
            src="/images/hospital-building.jpg"
            alt="Emergency Trauma Care Center"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm border border-emerald-200 text-[10px] font-mono text-emerald-800 font-bold">
            TRAUMA LEVEL 1 & SPECIALTY
          </div>
        </div>
        <div className="md:w-2/3 p-5 flex flex-col justify-center">
          <div className="text-xs font-mono text-emerald-700 uppercase tracking-widest font-semibold mb-1">
            Specialized Facility Directory
          </div>
          <h2 className="text-lg font-bold text-emerald-950 mb-2">
            Nashik Municipal Health Infrastructure & Real-Time Bed Telemetry
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Continuous monitoring of critical care beds, cardiac intensive units, and burn treatment centers. The ResQNet dispatch engine automatically reroutes ambulances when local ER capacity reaches zero.
          </p>
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
              className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-emerald-950 text-base">{hosp.hospitalId}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      isAtCapacity
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {isAtCapacity ? 'AT CAPACITY' : hosp.status}
                  </span>
                </div>

                <h3 className="font-bold text-emerald-950 text-sm">{hosp.name}</h3>
                <div className="text-xs text-emerald-700 font-mono mt-0.5">
                  Node: {hosp.nodeId} {isIslandHospital && '• [Island Sector: Bottleneck Access]'}
                </div>

                {/* Capacity Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Available Bed Slots:</span>
                    <span className={`font-mono font-bold ${isAtCapacity ? 'text-red-500' : 'text-slate-800'}`}>
                      {hosp.availableSlots} / {hosp.capacity} ({occupancy}% full)
                    </span>
                  </div>
                  <div className="w-full bg-emerald-50 rounded-full h-2 overflow-hidden border border-emerald-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isAtCapacity ? 'bg-red-500' : occupancy > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${occupancy}%` }}
                    />
                  </div>
                </div>

                {/* Capabilities */}
                <div className="mt-4">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1.5">
                    Specialty Medical Units:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {hosp.capabilities?.map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {isIslandHospital && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-800">
                    ⚠️ Reachability Warning: Dependent on bridge E-39-40. Blocking causeway makes this facility strictly unreachable.
                  </div>
                )}
              </div>

              {/* Bed Controls */}
              <div className="mt-5 pt-3 border-t border-emerald-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Adjust Free Slots:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleUpdateSlots(hosp.hospitalId, -1)}
                    disabled={!isAdmin || hosp.availableSlots <= 0}
                    className="w-7 h-7 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold disabled:opacity-30 text-xs flex items-center justify-center transition-colors shadow-sm"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => handleUpdateSlots(hosp.hospitalId, 1)}
                    disabled={!isAdmin || hosp.availableSlots >= hosp.capacity}
                    className="w-7 h-7 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold disabled:opacity-30 text-xs flex items-center justify-center transition-colors shadow-sm"
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
