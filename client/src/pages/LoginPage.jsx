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
      const loggedInUser = await login(email, password);
      if (location.state?.from) {
        navigate(location.state.from, { replace: true });
      } else {
        const roleHome = {
          citizen: '/citizen',
          operator: '/incidents',
          hospital_staff: '/hospital-console',
          admin: '/admin',
          evaluator: '/algorithms'
        }[loggedInUser?.role] || '/dashboard';
        navigate(roleHome, { replace: true });
      }
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

  const demoAccounts = [
    {
      role: 'Citizen',
      email: 'citizen1@resqnet.test',
      pass: 'Demo@1234',
      badge: 'Report & Track',
      color: 'border-red-300 text-red-700 bg-red-50/50'
    },
    {
      role: 'Operator',
      email: 'operator1@resqnet.test',
      pass: 'Demo@1234',
      badge: 'Live Dispatch Console',
      color: 'border-blue-300 text-blue-700 bg-blue-50/50'
    },
    {
      role: 'Hospital Staff',
      email: 'hospital.h007@resqnet.test',
      pass: 'Demo@1234',
      badge: 'HOSP-007 Beds & Triage',
      color: 'border-purple-300 text-purple-700 bg-purple-50/50'
    },
    {
      role: 'System Admin',
      email: 'admin@resqnet.test',
      pass: 'Demo@1234',
      badge: 'Full Access & Scenarios',
      color: 'border-emerald-300 text-emerald-700 bg-emerald-50/50'
    },
    {
      role: 'System Auditor',
      email: 'evaluator@resqnet.test',
      pass: 'Demo@1234',
      badge: 'Read-Only System Audit',
      color: 'border-amber-300 text-amber-700 bg-amber-50/50'
    }
  ];

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full bg-white border border-emerald-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Top Emergency Dispatch Center Image Banner */}
        <div className="relative h-28 w-full bg-emerald-50 overflow-hidden">
          <img
            src="/images/dispatch-center.jpg"
            alt="Emergency Medical Dispatch Operations"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent" />
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm border border-emerald-200 text-[10px] font-mono text-emerald-800 font-bold shadow-sm">
            ENTERPRISE PLATFORM
          </div>
        </div>

        <div className="p-6 pt-3 space-y-5">
          {/* Protected Route Notice if redirected */}
          {location.state?.from && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Authentication required to access this resource. Please sign in below.</span>
            </div>
          )}

          {/* Header */}
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-emerald-950">ResQNet Command Portal</h2>
            <p className="mt-0.5 text-xs text-slate-500 font-mono">
              Role-Based Access Control · Emergency Operations Center
            </p>
          </div>

          {/* 5 Demo Quick-Select Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Authorized System Profiles (5 Roles)
              </label>
              <span className="text-[10px] text-emerald-700 font-mono">Select profile to sign in</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => selectAccount(acc.email, acc.pass)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    email === acc.email
                      ? 'bg-emerald-50 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                      : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-800 truncate mb-0.5">{acc.role}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{acc.email.split('@')[0]}</div>
                  <div className="text-[9px] text-emerald-700 font-medium truncate mt-1">{acc.badge}</div>
                </button>
              ))}
            </div>
          </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-semibold text-emerald-950 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-emerald-50/30 border border-emerald-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                placeholder="name@resqnet.test"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-emerald-950 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-emerald-50/30 border border-emerald-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Authenticating...' : 'Sign In to Command Portal'}
          </button>
        </form>

        {/* Security / RBAC notice */}
        <div className="pt-2 border-t border-emerald-100 text-[11px] text-slate-500 text-center font-mono">
          Security policy: System Auditor accounts maintain strictly read-only access enforced by backend RBAC middleware.
        </div>
      </div>
    </div>
  </div>
);
}
