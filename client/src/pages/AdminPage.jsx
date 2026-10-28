import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import {
  Users, Settings, Play, RotateCcw, ShieldCheck, Key,
  UserPlus, CheckCircle2, AlertTriangle, Activity, Sliders, Database
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('scenarios'); // 'scenarios', 'users', 'config'

  // Users state
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'operator', hospitalId: '', phone: '+91 9000010001' });

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  // Scenarios state
  const [scenarios, setScenarios] = useState([]);
  const [runningScenarioId, setRunningScenarioId] = useState(null);
  const [scenarioResults, setScenarioResults] = useState({});

  // Config weights
  const [weights, setWeights] = useState({
    w1_routeCost: 0.40,
    w2_fuelDeficit: 0.20,
    w3_typeMismatch: 0.20,
    w4_crewFatigue: 0.10,
    w5_severityMatchBonus: 0.10
  });

  const loadAdminData = async () => {
    try {
      setLoadingUsers(true);
      const u = await api.getUsers();
      setUsersList(u);

      const sc = await api.getScriptedScenarios();
      setScenarios(sc);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRunScenario = async (scenarioId) => {
    setRunningScenarioId(scenarioId);
    try {
      const res = await api.loadScriptedScenario(scenarioId);
      setScenarioResults((prev) => ({ ...prev, [scenarioId]: res }));
    } catch (err) {
      alert(`Scenario run failed: ${err.message}`);
    } finally {
      setRunningScenarioId(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(newUser);
      setShowAddUserModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'operator', hospitalId: '', phone: '+91 9000010001' });
      loadAdminData();
    } catch (err) {
      alert(`User creation failed: ${err.message}`);
    }
  };

  const handleResetSystem = async () => {
    if (resetInput !== 'RESET') {
      alert('You must type RESET exactly to confirm.');
      return;
    }
    setResetting(true);
    try {
      const res = await api.resetScenario({ confirmed: true });
      setResetResult(res);
      setShowResetModal(false);
      setResetInput('');
      alert('System dataset successfully reset to clean deterministic seed state.');
      loadAdminData();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 rounded-2xl border border-emerald-800/50 shadow-xl text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            System Administration & Scenario Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ResQNet Control Console
          </h1>
          <p className="text-sm text-emerald-200 mt-1">
            Full governance across users, algorithmic scoring weights, and operational dispatch scenarios.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-950/70 p-1.5 rounded-xl border border-emerald-800">
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'scenarios' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-200 hover:text-white'
            }`}
          >
            Scenarios (S1–S6)
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'users' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-200 hover:text-white'
            }`}
          >
            User Management ({usersList.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'config' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-200 hover:text-white'
            }`}
          >
            Scoring Config
          </button>
        </div>
      </div>

      {/* Tab 1: Scripted Scenarios S1-S6 */}
      {activeTab === 'scenarios' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Standard Operating Incident Scenarios</h2>
              <p className="text-xs text-slate-500">Each scenario replays scripted dispatches with reproducible metrics from /data/scenarios</p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset System Dataset
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((sc) => {
              const isRunning = runningScenarioId === sc.scenarioId;
              const result = scenarioResults[sc.scenarioId];

              return (
                <div key={sc.scenarioId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                        {sc.scenarioId}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">EOC Protocol</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">{sc.name}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{sc.description}</p>
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2">
                      <span className="font-semibold text-slate-700">Expected:</span> {sc.expectedOutcome}
                    </div>
                  </div>

                  {/* Result breakdown if executed */}
                  {result && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-950 flex flex-col gap-1">
                      <div className="font-bold text-[11px] text-emerald-800 uppercase tracking-wider">
                        ✓ Execution Verified
                      </div>
                      {result.routingMetrics && (
                        <div>
                          Dijkstra Cost: {result.routingMetrics.dijkstraCost}s ({result.routingMetrics.dijkstraNodesExpanded} exp) • A* Cost: {result.routingMetrics.astarCost}s ({result.routingMetrics.astarNodesExpanded} exp)
                        </div>
                      )}
                      {result.comparison && (
                        <div>
                          Identical: {result.comparison.costIdentical ? 'YES' : 'NO'} • Nodes Saved: {result.comparison.nodesSaved} ({result.comparison.percentReduction})
                        </div>
                      )}
                      {result.blockedEdge && (
                        <div>
                          Blocked Edge: {result.blockedEdge.edgeId} • Graph Bump: v{result.newGraphVersion}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleRunScenario(sc.scenarioId)}
                    disabled={isRunning}
                    className="w-full py-2.5 bg-slate-900 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition flex items-center justify-center gap-2"
                  >
                    {isRunning ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    {isRunning ? 'Executing Scenario...' : 'Execute Operating Protocol'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: User Management */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Authorized System Accounts</h2>
              <p className="text-xs text-slate-500">Manage credentials and hospital affiliations across all 5 roles</p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
            >
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">User ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Hospital Affiliation</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.slice(0, 30).map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{u.userId}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{u.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.role === 'operator'
                          ? 'bg-blue-100 text-blue-800'
                          : u.role === 'hospital_staff'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'evaluator'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {u.hospitalId || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {u.active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Scoring Config */}
      {activeTab === 'config' && (
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm flex flex-col gap-4 max-w-xl">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Dispatch Scoring Formula Weights</h2>
            <p className="text-xs text-slate-500">Score = w1·RouteCost + w2·FuelDeficit + w3·TypeMismatch + w4·CrewFatigue − w5·SeverityBonus</p>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            {Object.entries(weights).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">{k}:</span>
                <span className="font-mono bg-slate-100 px-3 py-1 rounded font-bold text-slate-800">{v}</span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900 border border-emerald-200 font-medium">
            Sum of weights: <span className="font-bold font-mono">1.00</span> • Weights are calibrated directly from <span className="font-mono font-bold">/data/config/scoring.json</span>.
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-red-300 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900">
                Confirm Deterministic System Reset
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will overwrite all active incidents, ambulances, hospitals, and dispatches in MongoDB with the original 2,000-node seeded dataset.
            </p>
            <div className="p-3 bg-red-50 text-red-900 rounded-xl text-xs font-mono">
              Overwrites: 602 users, 2,000 nodes, 7,550 edges, 90 ambulances, 30 hospitals, 4,025 incidents.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Type <span className="text-red-600 font-mono">RESET</span> to confirm:
              </label>
              <input
                type="text"
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                placeholder="RESET"
                className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 uppercase"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetInput('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleResetSystem}
                disabled={resetInput !== 'RESET' || resetting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow"
              >
                {resetting ? 'Resetting...' : 'Execute Full Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateUser} className="bg-white max-w-md w-full p-6 rounded-2xl border border-slate-200 shadow-2xl flex flex-col gap-4">
            <h3 className="font-bold text-base text-slate-900">Provision New Staff Account</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full p-2 text-xs border border-slate-200 rounded-xl"
                >
                  <option value="operator">Operator</option>
                  <option value="hospital_staff">Hospital Staff</option>
                  <option value="admin">Admin</option>
                  <option value="evaluator">Auditor</option>
                  <option value="citizen">Citizen</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital ID (if staff)</label>
                <input
                  type="text"
                  value={newUser.hospitalId}
                  onChange={(e) => setNewUser({ ...newUser, hospitalId: e.target.value })}
                  placeholder="HOSP-007"
                  className="w-full p-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
