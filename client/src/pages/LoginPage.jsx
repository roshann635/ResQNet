import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Eye, LogIn, Lock, Mail, AlertTriangle, Cpu, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@resqnet.test');
  const [password, setPassword] = useState('ResQNet@Admin2026!');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selectAccount = (targetEmail, targetPass) => {
    setEmail(targetEmail);
    setPassword(targetPass);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Protected Route Notice if redirected */}
        {location.state?.from && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Authentication required to access operations console. Please sign in below.</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/10">
            <Cpu className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">ResQNet Simulation Portal</h2>
          <p className="mt-1 text-xs text-slate-400 font-mono">
            Role-Based Access Control for PBL Evaluation
          </p>
        </div>

        {/* Demo Quick-Select Cards */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              1-Click Demo Accounts
            </label>
            <span className="text-[10px] text-cyan-400 font-mono">Select to autofill</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => selectAccount('admin@resqnet.test', 'ResQNet@Admin2026!')}
              className={`p-3 rounded-xl border text-left transition-all ${
                email === 'admin@resqnet.test'
                  ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Dispatcher
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">admin@resqnet.test</div>
              <div className="text-[10px] text-emerald-400/80 font-medium mt-1">Full Dispatch & Edit</div>
            </button>

            <button
              type="button"
              onClick={() => selectAccount('evaluator@resqnet.test', 'ResQNet@Eval2026!')}
              className={`p-3 rounded-xl border text-left transition-all ${
                email === 'evaluator@resqnet.test'
                  ? 'bg-indigo-500/15 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-1">
                <Eye className="w-3.5 h-3.5" />
                Evaluator
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">evaluator@resqnet.test</div>
              <div className="text-[10px] text-indigo-400/80 font-medium mt-1">Read-Only Audit Mode</div>
            </button>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                placeholder="name@resqnet.test"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Authenticating...' : 'Sign In to Simulation'}
          </button>
        </form>

        {/* Security / RBAC notice */}
        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 text-center font-mono">
          Security policy: Evaluators are restricted from mutative actions (dispatch confirm, edge updates, scenario reset) by backend Express middleware.
        </div>
      </div>
    </div>
  );
}
