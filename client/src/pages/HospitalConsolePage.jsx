import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import {
  Building2, Bed, Activity, CheckCircle, XCircle, AlertTriangle,
  Clock, ShieldAlert, Save, RefreshCw, Mail, Users
} from 'lucide-react';

export default function HospitalConsolePage() {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || 'HOSP-007';

  // Hospital details
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [availableBeds, setAvailableBeds] = useState(0);
  const [availableIcu, setAvailableIcu] = useState(0);
  const [status, setStatus] = useState('Open');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Incoming cases
  const [incomingCases, setIncomingCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);

  // Rejection modal
  const [rejectModalCase, setRejectModalCase] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Outbox
  const [outbox, setOutbox] = useState([]);

  const loadHospitalData = async () => {
    try {
      setLoading(true);
      const hosp = await api.getHospital(hospitalId);
      setHospital(hosp);
      setAvailableBeds(hosp.availableBeds !== undefined ? hosp.availableBeds : hosp.availableSlots || 0);
      setAvailableIcu(hosp.availableIcu !== undefined ? hosp.availableIcu : 5);
      setStatus(hosp.status || 'Open');

      // Load incoming cases
      const casesRes = await api.getIncomingHospitalCases(hospitalId);
      setIncomingCases(casesRes.cases || []);

      // Load hospital outbox
      const notifs = await api.getNotifications('limit=20');
      setOutbox(notifs.items || []);
    } catch (err) {
      console.error('Error loading hospital console:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitalData();

    // SSE connection for live case alerts
    const sse = new EventSource(`/api/events?token=${localStorage.getItem('resqnet_token') || ''}`);
    sse.onmessage = () => {
      loadHospitalData();
    };
    return () => sse.close();
  }, [hospitalId]);

  const handleSaveCapacity = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await api.updateHospitalCapacity(hospitalId, {
        availableBeds,
        availableIcu,
        status
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadHospitalData();
    } catch (err) {
      alert(`Failed to update hospital capacity: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptCase = async (incidentId) => {
    try {
      await api.acceptHospitalCase(hospitalId, incidentId);
      loadHospitalData();
    } catch (err) {
      alert(`Acceptance failed: ${err.message}`);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason) {
      alert('Please enter an explicit clinical or capacity reason for diversion.');
      return;
    }
    setRejecting(true);
    try {
      await api.rejectHospitalCase(hospitalId, rejectModalCase.incidentId, { reason: rejectReason });
      setRejectModalCase(null);
      setRejectReason('');
      loadHospitalData();
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setRejecting(false);
    }
  };

  if (loading && !hospital) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading hospital console...</div>;
  }

  const totalBeds = hospital?.totalBeds || hospital?.capacity || 100;
  const totalIcu = hospital?.icuBeds || 30;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 rounded-2xl border border-purple-800/50 shadow-xl text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs tracking-wider uppercase mb-1">
            <Building2 className="w-4 h-4" />
            Hospital Resource & Triage Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {hospital?.name || hospitalId}
          </h1>
          <p className="text-sm text-purple-200 mt-1">
            Tier: <span className="font-semibold text-white">{hospital?.tier || 'Tertiary'}</span> • Vertex: <span className="font-mono text-purple-300">{hospital?.locationNodeId}</span> • Staff: <span className="font-semibold text-white">{user?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
            status.toLowerCase() === 'open'
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
              : status.toLowerCase() === 'diverting'
              ? 'bg-amber-950/80 text-amber-400 border-amber-800'
              : 'bg-red-950/80 text-red-400 border-red-800'
          }`}>
            ● Emergency Department {status}
          </div>
          <button
            onClick={loadHospitalData}
            className="p-2 bg-purple-900/60 hover:bg-purple-800 text-white rounded-xl border border-purple-700 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Capacity Controls */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-purple-200 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <Bed className="w-4 h-4 text-purple-600" />
              <span>Bed & ICU Capacity Control</span>
            </div>
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveCapacity} className="flex flex-col gap-4">
            {/* General Beds Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Available General Beds</span>
                <span className="font-mono text-purple-700 font-bold">{availableBeds} / {totalBeds}</span>
              </div>
              <input
                type="range"
                min={0}
                max={totalBeds}
                value={availableBeds}
                onChange={(e) => setAvailableBeds(parseInt(e.target.value, 10))}
                className="w-full accent-purple-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* ICU Beds Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Available ICU / Critical Beds</span>
                <span className="font-mono text-rose-700 font-bold">{availableIcu} / {totalIcu}</span>
              </div>
              <input
                type="range"
                min={0}
                max={totalIcu}
                value={availableIcu}
                onChange={(e) => setAvailableIcu(parseInt(e.target.value, 10))}
                className="w-full accent-rose-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Operational Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Department Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
              >
                <option value="Open">Open (Accepting All Emergencies)</option>
                <option value="Diverting">Diverting (Critical Only)</option>
                <option value="Closed">Closed (Full Diversion)</option>
              </select>
            </div>

            {/* Calculated Load Factor */}
            <div className="p-3 bg-purple-50 rounded-xl text-xs flex justify-between items-center text-purple-950 font-medium">
              <span>Current Facility Load Factor:</span>
              <span className="font-bold font-mono">
                {(((totalBeds - availableBeds) / (totalBeds || 1)) * 100).toFixed(0)}%
              </span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide shadow transition flex items-center justify-center gap-2"
            >
              {saving ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Synchronizing...' : 'Update Facility Status'}
            </button>
          </form>
        </div>

        {/* Right Column: Incoming Cases Table & Outbox */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Incoming Cases */}
          <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Incoming Emergency Transfers ({incomingCases.length})</span>
              </div>
              <span className="text-xs text-slate-500">Live SSE Feed</span>
            </div>

            {incomingCases.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active ambulances currently en route to this facility.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {incomingCases.map((cs) => (
                  <div
                    key={cs.incidentId}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">{cs.incidentId}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            cs.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {cs.severity}
                          </span>
                          <span className="text-xs text-slate-600">{cs.type}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Assigned Unit: <span className="font-semibold text-slate-700">{cs.assignedAmbulance?.ambulanceId || 'AMB'}</span> • Status: <span className="text-purple-700">{cs.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-mono text-purple-950 font-bold">
                          ETA: ~{cs.etaMinutes} mins
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {cs.accepted ? 'Confirmed by Staff' : 'Awaiting Review'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!cs.accepted ? (
                          <>
                            <button
                              onClick={() => handleAcceptCase(cs.incidentId)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => {
                                setRejectModalCase(cs);
                                setRejectReason('');
                              }}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Accepted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admission Email Outbox */}
          <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm pb-2 border-b border-slate-100">
              <Mail className="w-4 h-4 text-purple-600" />
              <span>Hospital Admission Dispatch Notifications</span>
            </div>

            {outbox.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">No notifications yet.</div>
            ) : (
              outbox.slice(0, 5).map((n) => (
                <div key={n.notificationId} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs flex flex-col gap-1">
                  <div className="flex justify-between text-slate-500">
                    <span className="font-semibold text-slate-700">{n.subject || 'Dispatch Notice'}</span>
                    <span className="font-mono">{new Date(n.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-600">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalCase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-red-200 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900">
                Reject Incoming Case {rejectModalCase.incidentId}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Medical diversion requires an explicit clinical or capacity justification. Rejecting will alert dispatch operations to immediately redirect the ambulance to the runner-up facility.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Reason for Diversion / Rejection:
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. ICU at 100% saturation, trauma surgical suite currently occupied..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectModalCase(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={rejecting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow"
              >
                {rejecting ? 'Redirecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
