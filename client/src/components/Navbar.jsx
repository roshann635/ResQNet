import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Activity,
  MapPin,
  AlertCircle,
  Truck,
  Building2,
  Cpu,
  BarChart3,
  LogOut,
  User,
  RotateCcw,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Navbar() {
  const { user, logout, isAdmin, isEvaluator } = useAuth();
  const navigate = useNavigate();

  const handleResetScenario = async () => {
    if (!isAdmin) {
      alert('Read-only evaluator account cannot reset scenario.');
      return;
    }
    const confirmed = window.confirm(
      'Reset Scenario: This will purge active dispatches and restore all nodes, edges, ambulances, hospitals, and incidents to the deterministic seed state. Proceed?'
    );
    if (!confirmed) return;

    try {
      await api.resetScenario({ confirmed: true });
      alert('Scenario successfully reset to clean seed state!');
      window.location.reload();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  // Role-Based Navigation Filtering:
  // - Guests (not logged in): Only Home
  // - Evaluators: Dashboard, Map, Incidents, Hospitals, Algorithm Lab, Analytics
  // - Dispatchers (Admin): All + Fleet Ops + Reset Data
  const navItems = user
    ? [
        { to: '/', label: 'Home', icon: Home },
        { to: '/dashboard', label: 'Dashboard', icon: Activity },
        { to: '/map', label: 'Live Map / Graph', icon: MapPin },
        { to: '/incidents', label: 'Incidents & Queue', icon: AlertCircle },
        ...(isAdmin ? [{ to: '/fleet', label: 'Fleet Ops', icon: Truck }] : []),
        { to: '/hospitals', label: 'Hospitals', icon: Building2 },
        { to: '/algorithms', label: 'Algorithm Lab', icon: Cpu },
        { to: '/analytics', label: 'Analytics & Audit', icon: BarChart3 }
      ]
    : [
        { to: '/', label: 'Home', icon: Home }
      ];

  return (
    <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight group">
              <div className="w-9 h-9 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 group-hover:bg-red-600/30 transition-colors">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="leading-tight text-white font-black tracking-wide flex items-center gap-1.5">
                  ResQNet
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-mono font-normal border border-cyan-500/30">
                    DSA
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal leading-none">
                  Emergency Route Optimization
                </span>
              </div>
            </NavLink>

            {/* Nav links */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Right utility items */}
          <div className="flex items-center gap-3">
            {/* Quick Reset scenario button (Admin/Dispatcher only) */}
            {isAdmin && (
              <button
                onClick={handleResetScenario}
                title="Reset simulation to deterministic seed state"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                Reset Data
              </button>
            )}

            {/* User profile / Role or Login CTA */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-200">{user.displayName}</span>
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${isAdmin ? 'text-emerald-400' : 'text-indigo-400'}`}>
                    {user.role} {isEvaluator && '(Read-Only)'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-600/20 transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                Sign In to Console
              </NavLink>
            )}
          </div>
        </div>

        {/* Mobile Nav items */}
        <div className="lg:hidden flex overflow-x-auto py-2 gap-1 border-t border-slate-800/60 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-3 h-3" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
