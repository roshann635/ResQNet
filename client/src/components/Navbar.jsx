import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Lock,
  Layers,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Navbar() {
  const { user, logout, isAdmin, isEvaluator } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState('default');
  const [scenariosList, setScenariosList] = useState([]);
  const moreMenuRef = useRef(null);

  // Close More menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMoreMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function loadScenarios() {
      try {
        const res = await api.getScenarios();
        if (res && res.scenarios) {
          setScenariosList(res.scenarios);
          setActiveScenario(res.activeScenario || 'default');
        }
      } catch (err) {
        // Fallback silently if offline or initial load
      }
    }
    loadScenarios();
  }, []);

  const handleScenarioChange = async (e) => {
    const newScen = e.target.value;
    try {
      await api.switchScenario({ scenario: newScen });
      setActiveScenario(newScen);
      window.location.reload();
    } catch (err) {
      alert(`Failed to switch operational zone: ${err.message}`);
    }
  };

  const handleResetScenario = async () => {
    if (!isAdmin) {
      alert('Read-only auditor account cannot restore baseline.');
      return;
    }
    const confirmed = window.confirm(
      'Restore Baseline: This will purge active dispatches and restore all nodes, edges, ambulances, hospitals, and incidents to baseline operational state. Proceed?'
    );
    if (!confirmed) return;

    try {
      await api.resetScenario({ confirmed: true });
      alert('Operational baseline successfully restored!');
      window.location.reload();
    } catch (err) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  let navItems = [{ to: '/', label: 'Home', icon: Home }];

  if (user) {
    if (user.role === 'citizen') {
      navItems = [
        { to: '/', label: 'Home', icon: Home },
        { to: '/citizen', label: 'Report Emergency', icon: AlertCircle },
        { to: '/outbox', label: 'Alerts', icon: Activity }
      ];
    } else if (user.role === 'hospital_staff') {
      navItems = [
        { to: '/', label: 'Home', icon: Home },
        { to: '/hospital-console', label: 'Console', icon: Building2 },
        { to: '/hospitals', label: 'Directory', icon: Activity },
        { to: '/outbox', label: 'Alerts', icon: Activity }
      ];
    } else if (user.role === 'operator') {
      navItems = [
        { to: '/', label: 'Home', icon: Home },
        { to: '/incidents', label: 'Operations', icon: AlertCircle },
        { to: '/map', label: 'Map', icon: MapPin },
        { to: '/fleet', label: 'Fleet', icon: Truck },
        { to: '/hospitals', label: 'Hospitals', icon: Building2 },
        { to: '/outbox', label: 'Outbox', icon: Activity }
      ];
    } else if (user.role === 'evaluator') {
      navItems = [
        { to: '/', label: 'Home', icon: Home },
        { to: '/algorithms', label: 'Algorithms', icon: Cpu },
        { to: '/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/map', label: 'Map', icon: MapPin },
        { to: '/outbox', label: 'Outbox', icon: Activity }
      ];
    } else {
      // Admin: 5 primary links + 4 grouped in 'More' dropdown
      navItems = [
        { to: '/', label: 'Home', icon: Home },
        { to: '/admin', label: 'Admin', icon: Activity },
        { to: '/incidents', label: 'Operations', icon: AlertCircle },
        { to: '/map', label: 'Map', icon: MapPin },
        { to: '/fleet', label: 'Fleet', icon: Truck },
        { to: '/hospitals', label: 'Hospitals', icon: Building2 },
        { to: '/algorithms', label: 'Algorithms', icon: Cpu },
        { to: '/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/outbox', label: 'Outbox', icon: Activity }
      ];
    }
  }

  // Split into primary links (shown directly) and overflow links (grouped in 'More' dropdown on desktop)
  const MAX_PRIMARY = 5;
  const showMoreDropdown = navItems.length > MAX_PRIMARY;
  const primaryItems = showMoreDropdown ? navItems.slice(0, MAX_PRIMARY) : navItems;
  const secondaryItems = showMoreDropdown ? navItems.slice(MAX_PRIMARY) : [];
  const isSecondaryActive = secondaryItems.some((item) => location.pathname === item.to);

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-emerald-200 sticky top-0 z-50 shadow-sm w-full">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Left: Logo & Navigation */}
          <div className="flex items-center gap-3 xl:gap-5 min-w-0">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2 text-emerald-950 font-bold text-base tracking-tight shrink-0 group">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-200 transition-colors">
                <Activity className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="leading-tight text-emerald-950 font-black tracking-wide flex items-center gap-1">
                  ResQNet
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono font-medium border border-emerald-200">
                    OPS
                  </span>
                </span>
                <span className="text-[9px] text-emerald-700/80 font-normal leading-none hidden md:inline">
                  Fleet & Route Dispatch
                </span>
              </div>
            </NavLink>

            {/* Desktop Nav links */}
            <div className="hidden lg:flex items-center gap-1 min-w-0">
              {primaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm font-semibold'
                          : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/70'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              {/* 'More' dropdown for remaining items (prevents horizontal overflow) */}
              {showMoreDropdown && (
                <div className="relative" ref={moreMenuRef}>
                  <button
                    type="button"
                    onClick={() => setMoreMenuOpen((prev) => !prev)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      isSecondaryActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/70'
                    }`}
                  >
                    <span>More</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {moreMenuOpen && (
                    <div className="absolute left-0 mt-1.5 w-44 bg-white border border-emerald-200 rounded-xl shadow-xl py-1.5 z-50 text-xs">
                      {secondaryItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.to;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMoreMenuOpen(false)}
                            className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-900 font-bold border-l-2 border-emerald-600'
                                : 'text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-900'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls & User Profile (Fixed shrink-0, perfectly fitted) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Zone Selector */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-sm shrink-0">
              <Layers className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <select
                value={activeScenario}
                onChange={handleScenarioChange}
                title="Switch between operational coverage zones"
                className="bg-transparent text-xs font-semibold text-emerald-900 border-none outline-none cursor-pointer max-w-[130px] sm:max-w-[160px] truncate"
              >
                {scenariosList.length > 0 ? (
                  scenariosList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id === 'city-dense' ? '🏙️ Metro (1,520)' : '📍 Sector Alpha (40)'}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="default">📍 Sector Alpha (40)</option>
                    <option value="city-dense">🏙️ Metro (1,520)</option>
                  </>
                )}
              </select>
            </div>

            {/* Restore Baseline button (Admin only, compact) */}
            {isAdmin && (
              <button
                onClick={handleResetScenario}
                title="Restore operational telemetry baseline"
                className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300 transition-colors shadow-sm shrink-0"
              >
                <RotateCcw className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="hidden xl:inline">Restore</span>
              </button>
            )}

            {/* User profile & Logout */}
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-emerald-200 shrink-0">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span
                    className="text-xs font-semibold text-emerald-950 max-w-[90px] md:max-w-[120px] truncate"
                    title={user.displayName}
                  >
                    {user.displayName}
                  </span>
                  <span className={`text-[9px] font-mono uppercase tracking-wider ${isAdmin ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>
                    {user.role} {isEvaluator && '(Auditor)'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all shrink-0"
              >
                <Lock className="w-3.5 h-3.5" />
                Sign In
              </NavLink>
            )}

            {/* Mobile hamburger menu toggle */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-1.5 rounded-lg text-emerald-900 hover:bg-emerald-100 transition-colors border border-emerald-300 bg-emerald-50/70 shrink-0"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 text-emerald-900" /> : <Menu className="w-4 h-4 text-emerald-900" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-emerald-200 py-3 px-2 space-y-3 bg-white rounded-b-2xl shadow-xl">
            {/* Scenario switcher on mobile */}
            <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-1.5">
              <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                Active Road Network Coverage Zone
              </label>
              <select
                value={activeScenario}
                onChange={(e) => {
                  handleScenarioChange(e);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-white text-xs font-semibold text-emerald-950 border border-emerald-300 rounded-lg p-2 outline-none shadow-sm cursor-pointer"
              >
                {scenariosList.length > 0 ? (
                  scenariosList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id === 'city-dense' ? '🏙️ Metropolitan Grid (1,520 nodes)' : '📍 Regional Sector Alpha (40 nodes)'}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="default">📍 Regional Sector Alpha (40 nodes)</option>
                    <option value="city-dense">🏙️ Metropolitan Grid (1,520 nodes)</option>
                  </>
                )}
              </select>
            </div>

            {/* All Nav Links Grid in mobile drawer */}
            <div className="grid grid-cols-2 gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white font-bold shadow-sm'
                          : 'bg-emerald-50/50 text-slate-700 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* Mobile Actions: Reset Data & User info */}
            <div className="pt-2 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              {user && (
                <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-semibold">{user.displayName}</span>
                  <span className="text-[10px] text-emerald-700 font-mono">({user.role})</span>
                </div>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    handleResetScenario();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 shadow-sm ml-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  Restore Baseline
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
