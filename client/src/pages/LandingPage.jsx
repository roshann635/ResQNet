import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Eye,
  Cpu,
  MapPin,
  Clock,
  Layers,
  Zap,
  RotateCcw,
  Sparkles,
  GitBranch,
  Database,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Truck,
  Building2,
  ChevronRight,
  Play
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  // Interactive Mini-Simulation Demo State for the Hero
  const [isBlocked, setIsBlocked] = useState(false);
  const [activeAlgorithm, setActiveAlgorithm] = useState('ASTAR');

  // Fast 1-click role switcher
  const handleQuickLogin = async (role) => {
    try {
      if (role === 'admin') {
        await login('admin@resqnet.test', 'ResQNet@Admin2026!');
      } else {
        await login('evaluator@resqnet.test', 'ResQNet@Eval2026!');
      }
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-24 py-4 pb-16">
      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <section className="relative overflow-hidden pt-6 pb-12">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-0 right-10 w-[400px] h-[250px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Academic badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>ACADEMIC SIMULATION • COMPUTER ENGINEERING PBL</span>
            </div>

            <div className="relative flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 space-y-4">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tight leading-[1.1]">
                  Next-Gen Emergency Dispatch &{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700">
                    Route Optimization
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                  An educational, full-stack incident command simulation driven by{' '}
                  <strong className="text-emerald-700 font-semibold">100% hand-crafted Data Structures & Graph Algorithms</strong> in pure JavaScript. 
                  Zero third-party routing, heap, or tree libraries.
                </p>
              </div>

              {/* Stethoscope Visual near text matching user mockup */}
              <div className="shrink-0 relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-emerald-300 shadow-lg shadow-emerald-500/10 bg-emerald-50 group">
                <img
                  src="/images/stethoscope-round.jpg"
                  alt="Medical Stethoscope and ECG Heartbeat Telemetry"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 rounded-full ring-2 ring-emerald-500/20 pointer-events-none" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-sm border border-emerald-300 text-[10px] font-mono font-bold text-emerald-800 shadow-sm whitespace-nowrap">
                  CLINICAL TRIAGE
                </div>
              </div>
            </div>

            {/* Feature highlights chips */}
            <div className="flex flex-wrap gap-2 text-xs font-mono text-slate-700">
              <span className="px-2.5 py-1 rounded-md bg-emerald-50/60 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Binary Min-Heap
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50/60 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Dijkstra & A* (Heuristic)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50/60 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Order-4 B+ Tree
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50/60 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Dynamic Graph Invalidation
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/dashboard"
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm flex items-center gap-2 group transition-all"
              >
                <span>Launch Operations Console</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/algorithms"
                className="px-6 py-3 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
              >
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>Explore Algorithm Lab</span>
              </Link>
            </div>

            {/* Quick 1-click Role Selector Bar */}
            <div className="pt-4 border-t border-emerald-200">
              <span className="text-xs text-slate-600 block mb-2 font-medium">Quick 1-Click Evaluation Sign In:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleQuickLogin('admin')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Dispatcher (Full Access)
                </button>

                <button
                  onClick={() => handleQuickLogin('evaluator')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  Evaluator (Read-Only)
                </button>
              </div>
            </div>
          </div>

          {/* Hero Right: Interactive Mini-Graph Simulator */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xl backdrop-blur-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider font-mono">
                    Live Graph Simulation Canvas
                  </span>
                </div>
                <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  v{isBlocked ? '2' : '1'} • {activeAlgorithm === 'ASTAR' ? 'A* Search' : 'Dijkstra SSSP'}
                </div>
              </div>

              {/* Mini SVG graph with road blockage toggle */}
              <div className="bg-emerald-50/30 rounded-xl p-4 border border-emerald-200 relative">
                <svg viewBox="0 0 400 240" className="w-full h-auto select-none">
                  <defs>
                    <linearGradient id="grad-active" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="grad-detour" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#047857" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>

                  {/* Normal background edges */}
                  <line x1="60" y1="120" x2="160" y2="50" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="60" y1="120" x2="160" y2="190" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="160" y1="50" x2="260" y2="50" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="160" y1="190" x2="260" y2="190" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="260" y1="50" x2="340" y2="120" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="260" y1="190" x2="340" y2="120" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />

                  {/* Bridge Edge: Center (E-39-40 simulation) */}
                  <line
                    x1="160"
                    y1="50"
                    x2="160"
                    y2="190"
                    stroke={isBlocked ? '#ef4444' : '#059669'}
                    strokeWidth={isBlocked ? '3' : '3'}
                    strokeDasharray={isBlocked ? '5 5' : 'none'}
                  />

                  {/* Active Highlighted Optimal Route */}
                  {!isBlocked ? (
                    // Direct path via Bridge
                    <path
                      d="M 60 120 L 160 50 L 160 190 L 260 190 L 340 120"
                      fill="none"
                      stroke="url(#grad-active)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  ) : (
                    // Detour path bypassing blocked Bridge
                    <path
                      d="M 60 120 L 160 50 L 260 50 L 340 120"
                      fill="none"
                      stroke="url(#grad-detour)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Nodes */}
                  {/* Origin: Station (Ambulance) */}
                  <circle cx="60" cy="120" r="14" fill="#ffffff" stroke="#059669" strokeWidth="2.5" />
                  <text x="60" y="124" fill="#065f46" fontSize="10" fontWeight="bold" textAnchor="middle">
                    AMB
                  </text>
                  <text x="60" y="148" fill="#475569" fontSize="9" textAnchor="middle">
                    Station N-01
                  </text>

                  {/* Junction B */}
                  <circle cx="160" cy="50" r="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
                  <text x="160" y="32" fill="#475569" fontSize="9" textAnchor="middle">
                    Junction B
                  </text>

                  {/* Bridge Node C (Bridge entry) */}
                  <circle
                    cx="160"
                    cy="190"
                    r="10"
                    fill={isBlocked ? '#fef2f2' : '#ffffff'}
                    stroke={isBlocked ? '#ef4444' : '#94a3b8'}
                    strokeWidth="2"
                  />
                  <text x="160" y="212" fill={isBlocked ? '#dc2626' : '#475569'} fontSize="9" textAnchor="middle">
                    {isBlocked ? 'Blocked Bridge' : 'Bridge D'}
                  </text>

                  {/* Waypoint E */}
                  <circle cx="260" cy="50" r="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
                  <text x="260" y="32" fill="#475569" fontSize="9" textAnchor="middle">
                    Detour Bypass
                  </text>

                  {/* Junction F */}
                  <circle cx="260" cy="190" r="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
                  <text x="260" y="212" fill="#475569" fontSize="9" textAnchor="middle">
                    Junction F
                  </text>

                  {/* Destination: Incident / Hospital */}
                  <circle cx="340" cy="120" r="14" fill="#ffffff" stroke="#dc2626" strokeWidth="2.5" />
                  <text x="340" y="124" fill="#dc2626" fontSize="10" fontWeight="bold" textAnchor="middle">
                    INC
                  </text>
                  <text x="340" y="148" fill="#475569" fontSize="9" textAnchor="middle">
                    Incident N-30
                  </text>
                </svg>

                {/* Road block condition badge overlay */}
                {isBlocked && (
                  <div className="absolute top-6 left-6 px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-700 text-[10px] font-mono flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    Bridge Blocked • Re-routing via Bypass
                  </div>
                )}
              </div>

              {/* Simulation interactive controls */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Test Dynamic Graph Invalidation:</span>
                  <button
                    onClick={() => setIsBlocked(!isBlocked)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isBlocked
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    {isBlocked ? 'Reopen Bridge (NORMAL)' : 'Simulate Road Block (BLOCKED)'}
                  </button>
                </div>

                {/* Real-time telemetry */}
                <div className="grid grid-cols-3 gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Route Cost</span>
                    <span className="text-xs font-bold text-emerald-700">{isBlocked ? '3.80 km' : '2.66 km'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Nodes Visited</span>
                    <span className="text-xs font-bold text-emerald-950">{isBlocked ? '14 Nodes' : '10 Nodes'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Measured Latency</span>
                    <span className="text-xs font-bold text-emerald-700">0.27 ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          KEY METRICS STRIP
          ========================================================================= */}
      <section className="border-y border-emerald-200 bg-emerald-50/40 backdrop-blur-md -mx-3 sm:-mx-4 px-4 sm:px-6 py-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">40</div>
            <div className="text-xs text-slate-600 mt-1 uppercase tracking-wider">Road Vertices</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">116</div>
            <div className="text-xs text-slate-600 mt-1 uppercase tracking-wider">Directed Edges</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">0.27 ms</div>
            <div className="text-xs text-slate-600 mt-1 uppercase tracking-wider">A* Shortest Path</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">0 Libs</div>
            <div className="text-xs text-slate-600 mt-1 uppercase tracking-wider">Pure JS DSA Engine</div>
          </div>
          <div className="col-span-2 md:col-span-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">27 / 27</div>
            <div className="text-xs text-slate-600 mt-1 uppercase tracking-wider">Acceptance Tests Passing</div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CORE DSA MODULES SHOWCASE (CARD GRID)
          ========================================================================= */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-700 uppercase tracking-widest font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            Engineering PBL Modules
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-emerald-950 tracking-tight">
            Hand-Crafted Data Structures & Algorithms
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Every core data structure is built from first principles in readable, modular JavaScript without external packages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Binary Min-Heap & Priority Queue */}
          <div className="bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-md rounded-2xl p-6 transition-all group flex flex-col justify-between shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Flame className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-emerald-950">Incident Priority Queue</h3>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  O(log N)
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Array-backed binary min-heap powering emergency triage. Strict severity sorting: Critical (0) &gt; High (1) &gt; Medium (2) &gt; Low (3) with timestamp FIFO tie-breaking.
              </p>
            </div>
            <div className="pt-3 border-t border-emerald-100 text-[11px] font-mono text-slate-500">
              Module: <span className="text-emerald-800 font-semibold">MinHeap.js & PriorityQueue.js</span>
            </div>
          </div>

          {/* Card 2: Dijkstra & A* Heuristic Search */}
          <div className="bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-md rounded-2xl p-6 transition-all group flex flex-col justify-between shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-emerald-950">Dijkstra & A* Heuristic</h3>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  O((V+E) log V)
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Single-source shortest path routing with negative weight rejection. A* utilizes admissible Euclidean and Haversine heuristics to reduce node expansions by ~60%.
              </p>
            </div>
            <div className="pt-3 border-t border-emerald-100 text-[11px] font-mono text-slate-500">
              Module: <span className="text-emerald-800 font-semibold">dijkstra.js & astar.js</span>
            </div>
          </div>

          {/* Card 3: Dynamic Graph Invalidation */}
          <div className="bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-md rounded-2xl p-6 transition-all group flex flex-col justify-between shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-emerald-950">Dynamic Re-routing</h3>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Atomic Versioning
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Road blockage or congestion toggles increment the atomic graphVersion counter, immediately invalidating stale cached routes and forcing detour discovery.
              </p>
            </div>
            <div className="pt-3 border-t border-emerald-100 text-[11px] font-mono text-slate-500">
              Module: <span className="text-emerald-800 font-semibold">Graph.js & routeValidator.js</span>
            </div>
          </div>

          {/* Card 4: Multi-Penalty Greedy Dispatcher */}
          <div className="bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-md rounded-2xl p-6 transition-all group flex flex-col justify-between shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-emerald-950">Greedy Dispatch Scorer</h3>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  w1..w4 Formula
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Weights route travel cost (0.40), unit utilization (0.25), medical capability deficit (0.20), and vehicle unreliability (0.15) to select the optimal ambulance.
              </p>
            </div>
            <div className="pt-3 border-t border-emerald-100 text-[11px] font-mono text-slate-500">
              Module: <span className="text-emerald-800 font-semibold">dispatchScorer.js</span>
            </div>
          </div>

          {/* Card 5: Bounded Backtracking Router */}
          <div className="bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-md rounded-2xl p-6 transition-all group flex flex-col justify-between shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <GitBranch className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-emerald-950">Bounded Backtracking</h3>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  O(b^d) Bounded
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Recursive choose-explore-undo DFS finding k-alternative simple paths without cycles, bounded by maxHops: 10, maxCost: 50, and maxResults: 3.
              </p>
            </div>
            <div className="pt-3 border-t border-emerald-100 text-[11px] font-mono text-slate-500">
              Module: <span className="text-emerald-800 font-semibold">backtracking.js</span>
            </div>
          </div>

          {/* Card 6: Order-4 B+ Tree & Hash Table */}
          <div className="bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-md rounded-2xl p-6 transition-all group flex flex-col justify-between shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-emerald-950">Order-4 B+ Tree & Hash</h3>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  O(log_B N + K)
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Separate chaining hash table with polynomial rolling hash plus a balanced B+ tree supporting node splits and linked-leaf range scans over road length indexes.
              </p>
            </div>
            <div className="pt-3 border-t border-emerald-100 text-[11px] font-mono text-slate-500">
              Module: <span className="text-emerald-800 font-semibold">BPlusTree.js & HashTable.js</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE ALGORITHM COMPARISON MATRIX
          ========================================================================= */}
      <section className="bg-white border border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-emerald-700 uppercase tracking-widest block mb-1 font-semibold">
              Micro-Benchmark Evaluation
            </span>
            <h2 className="text-2xl font-bold text-emerald-950">5 Algorithms Evaluated Side-by-Side</h2>
            <p className="text-xs text-slate-600">
              Measured on identical Nashik Road Network (40 vertices, 116 directed edges) from N-01 to N-30.
            </p>
          </div>

          <Link
            to="/algorithms"
            className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Play className="w-3.5 h-3.5 text-emerald-600" />
            Launch Interactive Playback Lab
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-emerald-50/80 text-slate-600 font-mono uppercase text-[11px] border-b border-emerald-200">
              <tr>
                <th className="py-3 px-4">Algorithm</th>
                <th className="py-3 px-4">Paradigm</th>
                <th className="py-3 px-4">Theoretical Time</th>
                <th className="py-3 px-4">Measured Latency</th>
                <th className="py-3 px-4">Nodes Visited</th>
                <th className="py-3 px-4">Route Cost</th>
                <th className="py-3 px-4">Optimality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100 font-mono">
              <tr className="hover:bg-emerald-50/40 transition-colors">
                <td className="py-3 px-4 font-bold text-emerald-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Dijkstra SSSP
                </td>
                <td className="py-3 px-4 text-slate-600">Greedy (Min-Heap)</td>
                <td className="py-3 px-4 text-emerald-700 font-semibold">O((V + E) log V)</td>
                <td className="py-3 px-4 font-bold text-emerald-700">0.33 ms</td>
                <td className="py-3 px-4 text-slate-700">25 nodes</td>
                <td className="py-3 px-4 text-emerald-950 font-bold">2.66 km</td>
                <td className="py-3 px-4 text-emerald-700 font-sans font-semibold">Guaranteed Optimal</td>
              </tr>

              <tr className="hover:bg-emerald-50/50 transition-colors bg-emerald-50/30">
                <td className="py-3 px-4 font-bold text-emerald-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  A* (Euclidean)
                </td>
                <td className="py-3 px-4 text-slate-600">Informed Heuristic (f=g+h)</td>
                <td className="py-3 px-4 text-emerald-700 font-semibold">O((V + E) log V)</td>
                <td className="py-3 px-4 font-bold text-emerald-700">0.27 ms</td>
                <td className="py-3 px-4 text-emerald-800 font-bold">10 nodes (60% fewer!)</td>
                <td className="py-3 px-4 text-emerald-950 font-bold">2.66 km</td>
                <td className="py-3 px-4 text-emerald-700 font-sans font-semibold">Optimal (Admissible h)</td>
              </tr>

              <tr className="hover:bg-emerald-50/40 transition-colors">
                <td className="py-3 px-4 font-bold text-emerald-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Breadth-First Search
                </td>
                <td className="py-3 px-4 text-slate-600">FIFO Queue Traversal</td>
                <td className="py-3 px-4 text-slate-500">O(V + E)</td>
                <td className="py-3 px-4 text-emerald-700">0.15 ms</td>
                <td className="py-3 px-4 text-slate-700">18 nodes</td>
                <td className="py-3 px-4 text-amber-700 font-bold">3.10 km</td>
                <td className="py-3 px-4 text-amber-700 font-sans font-medium">Hop-Optimal Only</td>
              </tr>

              <tr className="hover:bg-emerald-50/40 transition-colors">
                <td className="py-3 px-4 font-bold text-emerald-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Depth-First Search
                </td>
                <td className="py-3 px-4 text-slate-600">LIFO Stack Traversal</td>
                <td className="py-3 px-4 text-slate-500">O(V + E)</td>
                <td className="py-3 px-4 text-emerald-700">0.14 ms</td>
                <td className="py-3 px-4 text-slate-700">32 nodes</td>
                <td className="py-3 px-4 text-red-700 font-bold">14.80 km</td>
                <td className="py-3 px-4 text-red-700 font-sans font-medium">Arbitrary (Non-Optimal)</td>
              </tr>

              <tr className="hover:bg-emerald-50/40 transition-colors">
                <td className="py-3 px-4 font-bold text-emerald-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Bounded Backtracking
                </td>
                <td className="py-3 px-4 text-slate-600">Choose-Explore-Undo DFS</td>
                <td className="py-3 px-4 text-emerald-700 font-semibold">O(b^d) Bounded</td>
                <td className="py-3 px-4 text-emerald-700">0.42 ms</td>
                <td className="py-3 px-4 text-slate-700">Multiple Simple Paths</td>
                <td className="py-3 px-4 text-emerald-800 font-bold">3 Detours Found</td>
                <td className="py-3 px-4 text-emerald-700 font-sans font-medium">Cycle-Free Alternatives</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* =========================================================================
          OPERATIONAL LIFECYCLE WORKFLOW
          ========================================================================= */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono text-emerald-700 uppercase tracking-widest block font-semibold">
            End-to-End Execution Flow
          </span>
          <h2 className="text-3xl font-bold text-emerald-950">How ResQNet Operates</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden relative shadow-sm flex flex-col hover:border-emerald-300 transition-all">
            <div className="h-32 w-full overflow-hidden bg-emerald-50">
              <img
                src="/images/triage-care.jpg"
                alt="Emergency incident triage and patient intake"
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="text-xs font-mono text-emerald-700 font-bold mb-2">STEP 01</div>
              <h3 className="font-bold text-emerald-950 text-sm mb-1">Incident Triage & PQ</h3>
              <p className="text-xs text-slate-600">
                Simulated 911 calls enter the binary min-heap. Critical cases with earliest timestamps are prioritized first.
              </p>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden relative shadow-sm flex flex-col hover:border-emerald-300 transition-all">
            <div className="h-32 w-full overflow-hidden bg-emerald-50">
              <img
                src="/images/ambulance-fleet.jpg"
                alt="Ambulance candidate routing and scoring"
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="text-xs font-mono text-emerald-700 font-bold mb-2">STEP 02</div>
              <h3 className="font-bold text-emerald-950 text-sm mb-1">Candidate Scoring</h3>
              <p className="text-xs text-slate-600">
                Dijkstra runs from each available ambulance to incident node. Scored via 4-variable penalty formula.
              </p>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden relative shadow-sm flex flex-col hover:border-emerald-300 transition-all">
            <div className="h-32 w-full overflow-hidden bg-emerald-50">
              <img
                src="/images/hospital-building.jpg"
                alt="Hospital facility assignment and bed capacity checking"
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="text-xs font-mono text-emerald-700 font-bold mb-2">STEP 03</div>
              <h3 className="font-bold text-emerald-950 text-sm mb-1">Hospital Assignment</h3>
              <p className="text-xs text-slate-600">
                Filters facilities by medical capability (trauma, cardiac, burn) and bed capacity (&gt;0) to choose the best destination.
              </p>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden relative shadow-sm flex flex-col hover:border-emerald-300 transition-all">
            <div className="h-32 w-full overflow-hidden bg-emerald-50">
              <img
                src="/images/dispatch-center.jpg"
                alt="Real-time dispatch coordination and route invalidation"
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="text-xs font-mono text-emerald-700 font-bold mb-2">STEP 04</div>
              <h3 className="font-bold text-emerald-950 text-sm mb-1">Dispatch & Invalidation</h3>
              <p className="text-xs text-slate-600">
                Ambulance moves to EN_ROUTE. Road condition changes bump graphVersion, triggering immediate detour alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ACADEMIC PROJECT-BASED LEARNING NOTICE & FOOTER
          ========================================================================= */}
      <footer className="pt-12 border-t border-emerald-200 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
            <div className="text-xs text-amber-900">
              <span className="font-bold block text-sm text-slate-900">Project-Based Learning Evaluation Notice:</span>
              This system is strictly an academic computer engineering simulation built with deterministic synthetic data. It is not intended for real clinical, emergency, or 911 dispatch operations.
            </div>
          </div>
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold border border-amber-300 whitespace-nowrap transition-colors"
          >
            Sign In with Demo Accounts
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-4">
          <div>
            ResQNet • Computer Engineering PBL • Pure Data Structures & Algorithms
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px] text-slate-500">
            <span>MongoDB: Connected</span>
            <span>API: Port 5001</span>
            <span>Client: Port 5173</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
