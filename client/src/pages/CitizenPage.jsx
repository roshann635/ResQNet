import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import {
  AlertCircle, PhoneCall, CheckCircle, Clock, MapPin, Truck,
  ShieldAlert, XCircle, Send, MessageSquare, Compass, Activity,
  Plus, X, Users, AlertTriangle, Stethoscope, Sparkles
} from 'lucide-react';

export default function CitizenPage() {
  const { user } = useAuth();

  // Tab: 'report', 'my-requests', 'outbox'
  const [activeTab, setActiveTab] = useState('report');

  // Form state
  const [incidentType, setIncidentType] = useState('Cardiac');
  const [patientCount, setPatientCount] = useState(1);
  const [customSymptomInput, setCustomSymptomInput] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState(['Chest Pain']);
  const [locationNodeId, setLocationNodeId] = useState('N-0001');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Data states
  const [myIncidents, setMyIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [nodes, setNodes] = useState([]);

  // Suggested quick-add clinical observations
  const commonSuggestions = [
    'Unconscious / Unresponsive',
    'Severe Chest Crushing Pain',
    'Uncontrollable Bleeding',
    'Breathing Difficulty / Gasping',
    'Severe Burns / Scalds',
    'Seizures / Convulsions',
    'Sudden Face Droop / Stroke',
    'Multiple Fractures / Deformity',
    'Head Injury / Concussion',
    'Cold Clammy Skin / Shock'
  ];

  // Helper to add custom typed symptom
  const handleAddCustomSymptom = (symptomToAdd) => {
    const sym = (symptomToAdd || customSymptomInput).trim();
    if (!sym) return;

    // Check if duplicate (case-insensitive)
    const exists = selectedSymptoms.some(
      (s) => s.toLowerCase() === sym.toLowerCase()
    );
    if (!exists) {
      setSelectedSymptoms((prev) => [...prev, sym]);
    }
    setCustomSymptomInput('');
  };

  const handleRemoveSymptom = (indexToRemove) => {
    setSelectedSymptoms((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearAllSymptoms = () => {
    setSelectedSymptoms([]);
  };

  // Automated triage assessment calculation
  const hasCriticalSymptoms = selectedSymptoms.some((s) => {
    const l = s.toLowerCase();
    return (
      l.includes('unconscious') ||
      l.includes('unresponsive') ||
      l.includes('cardiac') ||
      l.includes('stroke') ||
      l.includes('seizure') ||
      l.includes('choking') ||
      l.includes('arrest') ||
      l.includes('head injury')
    );
  });

  const hasHighSymptoms = selectedSymptoms.some((s) => {
    const l = s.toLowerCase();
    return (
      l.includes('bleed') ||
      l.includes('breath') ||
      l.includes('burn') ||
      l.includes('fracture') ||
      l.includes('chest') ||
      l.includes('shock')
    );
  });

  const isCritical =
    incidentType === 'Cardiac' ||
    incidentType === 'Stroke' ||
    hasCriticalSymptoms ||
    patientCount >= 3;

  const isHigh =
    !isCritical &&
    (incidentType === 'Accident' ||
      hasHighSymptoms ||
      patientCount === 2);

  const estimatedSeverity = isCritical ? 'CRITICAL' : isHigh ? 'HIGH' : 'MEDIUM';
  const triageReason = isCritical
    ? patientCount >= 3
      ? `Mass Casualty Incident (${patientCount} patients): Immediate Critical Priority (Rank 4). Multi-unit dispatch required.`
      : 'Critical Triage (Rank 4): Immediate risk of mortality or systemic failure.'
    : isHigh
    ? patientCount === 2
      ? 'Dual Casualty Emergency (2 patients): Elevated High Priority (Rank 3).'
      : 'High Priority (Rank 3): Urgent transport with advanced life support required.'
    : 'Medium Priority (Rank 2): Stabilized urgent care and clinical transport.';

  // Load user incidents & outbox
  const loadMyData = async () => {
    try {
      setLoadingIncidents(true);
      const incData = await api.getIncidents();
      setMyIncidents(incData);

      const notifData = await api.getNotifications('limit=25');
      setNotifications(notifData.items || []);
    } catch (err) {
      console.error('Error loading citizen data:', err);
    } finally {
      setLoadingIncidents(false);
    }
  };

  useEffect(() => {
    loadMyData();
    api.getNodes().then((n) => setNodes(n.slice(0, 50))).catch(() => {});

    // Real-time Server-Sent Events (SSE) listener
    const token = localStorage.getItem('resqnet_token') || '';
    const eventSource = new EventSource(`/api/events?token=${token}`);

    const handleRealTimeEvent = () => {
      loadMyData();
    };

    eventSource.onmessage = handleRealTimeEvent;
    eventSource.addEventListener('INCIDENT_UPDATE', handleRealTimeEvent);
    eventSource.addEventListener('NOTIFICATION', handleRealTimeEvent);
    eventSource.addEventListener('AMBULANCE_MOVED', handleRealTimeEvent);

    return () => {
      eventSource.close();
    };
  }, []);

  const handleReportEmergency = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(null);

    try {
      const res = await api.createIncident({
        type: incidentType,
        locationNodeId,
        patientCount: Math.max(1, parseInt(patientCount, 10) || 1),
        symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : ['Unspecified medical distress'],
        description: description || `Reported by citizen (${user?.name || 'Citizen'})`,
        reportedBy: user?.userId
      });

      setSubmitSuccess(res);
      setDescription('');
      loadMyData();
      setActiveTab('my-requests');
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit emergency request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (incidentId) => {
    if (!window.confirm(`Are you sure you want to cancel request ${incidentId}?`)) return;
    try {
      await api.cancelIncident(incidentId, { reason: 'Cancelled by citizen' });
      loadMyData();
    } catch (err) {
      alert(`Cancellation failed: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-900/90 via-red-900 to-rose-950 p-6 rounded-2xl border border-rose-800/60 shadow-xl text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs tracking-wider uppercase mb-1">
            <PhoneCall className="w-4 h-4 animate-bounce text-rose-400" />
            Citizen Emergency Dispatch Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Report Medical Emergency
          </h1>
          <p className="text-sm text-rose-200/90 mt-1">
            Logged in as <span className="font-semibold text-white">{user?.name}</span> ({user?.phone || user?.email})
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-rose-950/70 p-1.5 rounded-xl border border-rose-800">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'report' ? 'bg-rose-600 text-white shadow-md' : 'text-rose-200 hover:text-white'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            Report Emergency
          </button>
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'my-requests' ? 'bg-rose-600 text-white shadow-md' : 'text-rose-200 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            My Requests ({myIncidents.length})
          </button>
          <button
            onClick={() => setActiveTab('outbox')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'outbox' ? 'bg-rose-600 text-white shadow-md' : 'text-rose-200 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            SMS Alerts ({notifications.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Emergency Report Form */}
      {activeTab === 'report' && (
        <form onSubmit={handleReportEmergency} className="flex flex-col gap-6 bg-white p-6 sm:p-8 rounded-2xl border border-rose-200 shadow-md">
          {submitError && (
            <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Section 1: Emergency Nature */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center">1</span>
              Select Emergency Nature / Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['Cardiac', 'Accident', 'Stroke', 'Burns', 'Maternity', 'Fire-injury', 'Poisoning', 'Other'].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setIncidentType(t)}
                  className={`py-3 px-4 rounded-xl text-xs font-semibold border text-left transition flex flex-col justify-between h-20 ${
                    incidentType === t
                      ? 'border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500 shadow-sm'
                      : 'border-slate-200 hover:border-rose-300 text-slate-700'
                  }`}
                >
                  <span className="text-sm font-bold">{t}</span>
                  <span className="text-[10px] text-slate-500">
                    {t === 'Cardiac' || t === 'Stroke' ? 'Critical Triage Priority' : 'Standard Priority'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Observed Patient Symptoms (Custom Entry) */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center">2</span>
                Add Observed Symptoms (Type Your Observations)
              </label>
              {selectedSymptoms.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllSymptoms}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline"
                >
                  Clear All ({selectedSymptoms.length})
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Type what you see (e.g. difficulty breathing, bleeding from arm, unconscious, sudden collapse) and press Add or Enter.
            </p>

            {/* Input & Add Button */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customSymptomInput}
                  onChange={(e) => setCustomSymptomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomSymptom();
                    }
                  }}
                  placeholder="Type an observed symptom and press Enter..."
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 shadow-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddCustomSymptom()}
                disabled={!customSymptomInput.trim()}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Symptom
              </button>
            </div>

            {/* Dynamic Symptom Chips List */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Currently Recorded Symptoms ({selectedSymptoms.length}):
              </div>
              {selectedSymptoms.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2">
                  No symptoms added yet. Type your observations above or pick from suggestions below.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedSymptoms.map((sym, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300 shadow-xs animate-fadeIn"
                    >
                      <Sparkles className="w-3 h-3 text-rose-600" />
                      {sym}
                      <button
                        type="button"
                        onClick={() => handleRemoveSymptom(idx)}
                        className="w-4 h-4 rounded-full hover:bg-rose-200 text-rose-700 flex items-center justify-center transition"
                        title="Remove symptom"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Suggestions Helper */}
            <div>
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Quick Clinical Suggestions (Click to add):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {commonSuggestions.map((sug) => {
                  const alreadyAdded = selectedSymptoms.some(
                    (s) => s.toLowerCase() === sug.toLowerCase()
                  );
                  return (
                    <button
                      type="button"
                      key={sug}
                      disabled={alreadyAdded}
                      onClick={() => handleAddCustomSymptom(sug)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                        alreadyAdded
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-rose-400 hover:text-rose-700 hover:bg-rose-50/50'
                      }`}
                    >
                      <span>{alreadyAdded ? '✓' : '+'}</span>
                      {sug}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Patient Count & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Number of Patients */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center">3</span>
                  <Users className="w-4 h-4 text-rose-600" />
                  Number of Patients / Injured
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Specify how many individuals require medical attention.
                </p>

                {/* Stepper + Input */}
                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setPatientCount((c) => Math.max(1, c - 1))}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-lg shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={patientCount}
                    onChange={(e) => setPatientCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 text-center font-bold text-lg bg-white border border-slate-300 rounded-xl py-2 focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setPatientCount((c) => c + 1)}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-lg shadow-sm"
                  >
                    +
                  </button>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {[1, 2, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPatientCount(num)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                          patientCount === num
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patient Count Alerts */}
              {patientCount >= 3 ? (
                <div className="p-2.5 bg-red-100/80 border border-red-300 text-red-900 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    <strong>Mass Casualty Incident (MCI):</strong> {patientCount} patients triggers automatic CRITICAL triage and multi-vehicle dispatch protocol.
                  </span>
                </div>
              ) : patientCount === 2 ? (
                <div className="p-2.5 bg-amber-100/80 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Dual Casualty Incident:</strong> Triggers HIGH priority dispatch for secondary stretcher allocation.
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">
                  Single patient standard triage workflow active.
                </div>
              )}
            </div>

            {/* Location Selector */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center">4</span>
                  <MapPin className="w-4 h-4 text-rose-600" />
                  Incident Location (Snaps to Graph Vertex)
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Select the nearest intersection or landmark in the Nashik road network.
                </p>

                <select
                  value={locationNodeId}
                  onChange={(e) => setLocationNodeId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 shadow-sm"
                >
                  {nodes.length > 0 ? (
                    nodes.map((n) => (
                      <option key={n.nodeId} value={n.nodeId}>
                        {n.nodeId} — {n.label || 'Nashik Junction'} ({n.zone || 'Zone'})
                      </option>
                    ))
                  ) : (
                    <option value="N-0001">N-0001 — Panchavati Main Gate</option>
                  )}
                </select>
              </div>

              <div className="text-[11px] text-slate-500 mt-2">
                Dijkstra pathfinding will compute the fastest route from available ambulances to this node.
              </div>
            </div>
          </div>

          {/* Description & Landmark Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Additional Details / Landmark Descriptions (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Near Holkar Bridge south ramp, 2-wheeler collision, crowd gathered..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Real-time Triage Priority Assessment Box */}
          <div className="p-4 bg-gradient-to-r from-rose-50 via-rose-50/60 to-red-50 border border-rose-200 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                estimatedSeverity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
              }`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  DSA Automated Triage Assessment
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                    Priority Queue Evaluator
                  </span>
                </div>
                <div className="text-xs text-slate-700 mt-0.5">{triageReason}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Severity Level</div>
                <div className={`text-sm font-black uppercase ${
                  estimatedSeverity === 'CRITICAL' ? 'text-red-700' : 'text-amber-700'
                }`}>
                  {estimatedSeverity} (Rank {estimatedSeverity === 'CRITICAL' ? 4 : estimatedSeverity === 'HIGH' ? 3 : 2})
                </div>
              </div>
              <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm ${
                estimatedSeverity === 'CRITICAL' ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-500 text-white'
              }`}>
                {estimatedSeverity}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm tracking-wide shadow-lg transition flex items-center justify-center gap-2"
          >
            {submitting ? <Activity className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {submitting ? 'TRANSMITTING & AUTO-TRIAGING EMERGENCY...' : 'DISPATCH EMERGENCY RESPONSE NOW'}
          </button>
        </form>
      )}

      {/* Tab 2: My Emergency Requests */}
      {activeTab === 'my-requests' && (
        <div className="flex flex-col gap-4">
          {submitSuccess && (
            <div className="p-4 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-300 flex items-start justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm text-emerald-950">
                    Emergency Dispatched Successfully! [ID: {submitSuccess.incidentId}]
                  </div>
                  <div className="text-xs text-emerald-800 mt-0.5">
                    Data transferred to backend. Triage Priority: <strong>{submitSuccess.severity}</strong> • Inferred Capabilities: <strong>{submitSuccess.requiredCapabilities?.join(', ') || 'Standard Care'}</strong>.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSubmitSuccess(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {loadingIncidents ? (
            <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Activity className="w-4 h-4 animate-spin text-rose-600" />
              Loading real-time requests...
            </div>
          ) : myIncidents.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
              No emergency incidents reported yet.
            </div>
          ) : (
            myIncidents.map((inc) => {
              const isPreDispatch = ['Registered', 'REGISTERED', 'Prioritized', 'PRIORITIZED', 'TRIAGED', 'AwaitingResource', 'AWAITING_RESOURCE'].includes(inc.status);
              const isDispatched = ['AmbulanceAssigned', 'AMBULANCE_ASSIGNED', 'EnRoute', 'VEHICLE_EN_ROUTE', 'Rerouting', 'RE_ROUTING', 'AtScene', 'AT_SCENE', 'Transporting'].includes(inc.status);

              return (
                <div key={inc.incidentId} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-base text-slate-900">{inc.incidentId}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        inc.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {inc.severity}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                        {inc.type}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {inc.patientCount || 1} {inc.patientCount === 1 ? 'Patient' : 'Patients'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(inc.createdAt).toLocaleTimeString()}
                      </span>
                      {isPreDispatch && (
                        <button
                          onClick={() => handleCancelRequest(inc.incidentId)}
                          className="px-3 py-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-300 rounded text-xs font-medium transition"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      {isDispatched ? (
                        <Truck className="w-5 h-5 text-emerald-600 animate-pulse" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-600 animate-spin" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Current Status: <span className="text-rose-600 font-black">{inc.status}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Location: <strong>{inc.locationNodeId}</strong> • Casualties: <strong>{inc.patientCount || 1}</strong>
                        </div>
                      </div>
                    </div>

                    {inc.assignedAmbulanceId && (
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">
                          Unit: {inc.assignedAmbulanceId}
                        </div>
                        <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                          En Route to Scene
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Symptoms Recorded */}
                  {inc.symptoms && inc.symptoms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-slate-500">Recorded Symptoms:</span>
                      {inc.symptoms.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-medium text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Required Capabilities Inferred */}
                  {inc.requiredCapabilities && inc.requiredCapabilities.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-slate-500">Inferred Capabilities:</span>
                      {inc.requiredCapabilities.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium text-[11px] border border-indigo-100">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Triage Explanation */}
                  {inc.triageExplanation && (
                    <div className="text-xs text-slate-600 bg-rose-50/50 p-3 rounded-lg border border-rose-100">
                      <span className="font-semibold text-rose-900">Triage Assessment:</span> {inc.triageExplanation}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: SMS Alerts Outbox */}
      {activeTab === 'outbox' && (
        <div className="flex flex-col gap-3">
          {notifications.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
              No notifications in outbox.
            </div>
          ) : (
            notifications.map((notif) => (
              <div key={notif.notificationId} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-slate-800">{notif.channel} • {notif.destination}</span>
                    <span className="font-mono">{new Date(notif.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{notif.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
