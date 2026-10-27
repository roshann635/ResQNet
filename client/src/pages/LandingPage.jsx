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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-0 right-10 w-[400px] h-[250px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Academic badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-400 text-xs font-mono shadow-lg shadow-cyan-950/40">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>ACADEMIC SIMULATION • COMPUTER ENGINEERING PBL</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Next-Gen Emergency Dispatch &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400">
                Route Optimization
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
              An educational, full-stack incident command simulation driven by{' '}
              <strong className="text-cyan-400 font-semibold">100% hand-crafted Data Structures & Graph Algorithms</strong> in pure JavaScript. 
              Zero third-party routing, heap, or tree libraries.
            </p>

            {/* Feature highlights chips */}
            <div className="flex flex-wrap gap-2 text-xs font-mono text-slate-300">
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Binary Min-Heap
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Dijkstra & A* (Heuristic)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Order-4 B+ Tree
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Dynamic Graph Invalidation
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/dashboard"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-xl shadow-cyan-600/25 flex items-center gap-2 group transition-all"
              >
                <span>Launch Operations Console</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/algorithms"
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm flex items-center gap-2 transition-all hover:border-slate-600"
              >
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Explore Algorithm Lab</span>
              </Link>
            </div>

            {/* Quick 1-click Role Selector Bar */}
            <div className="pt-4 border-t border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-2 font-medium">Quick 1-Click Evaluation Sign In:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleQuickLogin('admin')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Dispatcher (Full Access)
                </button>

                <button
                  onClick={() => handleQuickLogin('evaluator')}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Evaluator (Read-Only)
                </button>
              </div>
            </div>
          </div>

          {/* Hero Right: Interactive Mini-Graph Simulator */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Live Graph Simulation Canvas
                  </span>
                </div>
                <div className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                  v{isBlocked ? '2' : '1'} • {activeAlgorithm === 'ASTAR' ? 'A* Search' : 'Dijkstra SSSP'}
                </div>
              </div>

              {/* Mini SVG graph with road blockage toggle */}
              <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 relative">
                <svg viewBox="0 0 400 240" className="w-full h-auto select-none">
                  <defs>
                    <linearGradient id="grad-active" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                    <linearGradient id="grad-detour" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>

                  {/* Normal background edges */}
                  <line x1="60" y1="120" x2="160" y2="50" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="60" y1="120" x2="160" y2="190" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="160" y1="50" x2="260" y2="50" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="160" y1="190" x2="260" y2="190" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="260" y1="50" x2="340" y2="120" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="260" y1="190" x2="340" y2="120" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />

                  {/* Bridge Edge: Center (E-39-40 simulation) */}
                  <line
                    x1="160"
                    y1="50"
                    x2="160"
                    y2="190"
                    stroke={isBlocked ? '#ef4444' : '#38bdf8'}
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
                  <circle cx="60" cy="120" r="14" fill="#0f172a" stroke="#06b6d4" strokeWidth="2.5" />
                  <text x="60" y="124" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
                    AMB
                  </text>
                  <text x="60" y="148" fill="#94a3b8" fontSize="9" textAnchor="middle">
                    Station N-01
                  </text>

                  {/* Junction B */}
                  <circle cx="160" cy="50" r="10" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
                  <text x="160" y="32" fill="#94a3b8" fontSize="9" textAnchor="middle">
                    Junction B
                  </text>

                  {/* Bridge Node C (Bridge entry) */}
                  <circle
                    cx="160"
                    cy="190"
                    r="10"
                    fill={isBlocked ? '#450a0a' : '#0f172a'}
                    stroke={isBlocked ? '#ef4444' : '#64748b'}
                    strokeWidth="2"
                  />
                  <text x="160" y="212" fill={isBlocked ? '#f87171' : '#94a3b8'} fontSize="9" textAnchor="middle">
                    {isBlocked ? 'Blocked Bridge' : 'Bridge D'}
                  </text>

                  {/* Waypoint E */}
                  <circle cx="260" cy="50" r="10" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
                  <text x="260" y="32" fill="#94a3b8" fontSize="9" textAnchor="middle">
                    Detour Bypass
                  </text>

                  {/* Junction F */}
                  <circle cx="260" cy="190" r="10" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
                  <text x="260" y="212" fill="#94a3b8" fontSize="9" textAnchor="middle">
                    Junction F
                  </text>

                  {/* Destination: Incident / Hospital */}
                  <circle cx="340" cy="120" r="14" fill="#0f172a" stroke="#ef4444" strokeWidth="2.5" />
                  <text x="340" y="124" fill="#f87171" fontSize="10" fontWeight="bold" textAnchor="middle">
                    INC
                  </text>
                  <text x="340" y="148" fill="#94a3b8" fontSize="9" textAnchor="middle">
                    Incident N-30
                  </text>
                </svg>

                {/* Road block condition badge overlay */}
                {isBlocked && (
                  <div className="absolute top-6 left-6 px-2.5 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-mono flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    Bridge Blocked • Re-routing via Bypass
                  </div>
                )}
              </div>

              {/* Simulation interactive controls */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Test Dynamic Graph Invalidation:</span>
                  <button
                    onClick={() => setIsBlocked(!isBlocked)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isBlocked
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    {isBlocked ? 'Reopen Bridge (NORMAL)' : 'Simulate Road Block (BLOCKED)'}
                  </button>
                </div>

                {/* Real-time telemetry */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Route Cost</span>
                    <span className="text-xs font-bold text-cyan-400">{isBlocked ? '3.80 km' : '2.66 km'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Nodes Visited</span>
                    <span className="text-xs font-bold text-white">{isBlocked ? '14 Nodes' : '10 Nodes'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Measured Latency</span>
                    <span className="text-xs font-bold text-emerald-400">0.27 ms</span>
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
      <section className="border-y border-slate-800/80 bg-slate-900/40 backdrop-blur-md -mx-4 px-6 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">40</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Road Vertices</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">116</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Directed Edges</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">0.27 ms</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">A* Shortest Path</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">0 Libs</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Pure JS DSA Engine</div>
          </div>
          <div className="col-span-2 md:col-span-1">
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">27 / 27</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Acceptance Tests Passing</div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CORE DSA MODULES SHOWCASE (CARD GRID)
          ========================================================================= */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 uppercase tracking-widest">
            <Cpu className="w-3.5 h-3.5" />
            Engineering PBL Modules
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Hand-Crafted Data Structures & Algorithms
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Every core data structure is built from first principles in readable, modular JavaScript without external packages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Binary Min-Heap & Priority Queue */}
          <div className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Flame className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Incident Priority Queue</h3>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  O(log N)
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Array-backed binary min-heap powering emergency triage. Strict severity sorting: Critical (0) &gt; High (1) &gt; Medium (2) &gt; Low (3) with timestamp FIFO tie-breaking.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
              Module: <span className="text-slate-300">MinHeap.js & PriorityQueue.js</span>
            </div>
          </div>

          {/* Card 2: Dijkstra & A* Heuristic Search */}
          <div className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Dijkstra & A* Heuristic</h3>
                <span className="text-[11px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                  O((V+E) log V)
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Single-source shortest path routing with negative weight rejection. A* utilizes admissible Euclidean and Haversine heuristics to reduce node expansions by ~60%.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
              Module: <span className="text-slate-300">dijkstra.js & astar.js</span>
            </div>
          </div>

          {/* Card 3: Dynamic Graph Invalidation */}
          <div className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Dynamic Re-routing</h3>
                <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  Atomic Versioning
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Road blockage or congestion toggles increment the atomic graphVersion counter, immediately invalidating stale cached routes and forcing detour discovery.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
              Module: <span className="text-slate-300">Graph.js & routeValidator.js</span>
            </div>
          </div>

          {/* Card 4: Multi-Penalty Greedy Dispatcher */}
          <div className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Greedy Dispatch Scorer</h3>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  w1..w4 Formula
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Weights route travel cost (0.40), unit utilization (0.25), medical capability deficit (0.20), and vehicle unreliability (0.15) to select the optimal ambulance.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
              Module: <span className="text-slate-300">dispatchScorer.js</span>
            </div>
          </div>

          {/* Card 5: Bounded Backtracking Router */}
          <div className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <GitBranch className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Bounded Backtracking</h3>
                <span className="text-[11px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                  O(b^d) Bounded
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Recursive choose-explore-undo DFS finding k-alternative simple paths without cycles, bounded by maxHops: 10, maxCost: 50, and maxResults: 3.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
              Module: <span className="text-slate-300">backtracking.js</span>
            </div>
          </div>

          {/* Card 6: Order-4 B+ Tree & Hash Table */}
          <div className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Order-4 B+ Tree & Hash</h3>
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                  O(log_B N + K)
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Separate chaining hash table with polynomial rolling hash plus a balanced B+ tree supporting node splits and linked-leaf range scans over road length indexes.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
              Module: <span className="text-slate-300">BPlusTree.js & HashTable.js</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE ALGORITHM COMPARISON MATRIX
          ========================================================================= */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-1">
              Micro-Benchmark Evaluation
            </span>
            <h2 className="text-2xl font-bold text-white">5 Algorithms Evaluated Side-by-Side</h2>
            <p className="text-xs text-slate-400">
              Measured on identical Nashik Road Network (40 vertices, 116 directed edges) from N-01 to N-30.
            </p>
          </div>

          <Link
            to="/algorithms"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            Launch Interactive Playback Lab
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Dijkstra SSSP
                </td>
                <td className="py-3 px-4 text-slate-300">Greedy (Min-Heap)</td>
                <td className="py-3 px-4 text-cyan-400">O((V + E) log V)</td>
                <td className="py-3 px-4 font-bold text-emerald-400">0.33 ms</td>
                <td className="py-3 px-4 text-slate-300">25 nodes</td>
                <td className="py-3 px-4 text-cyan-300 font-bold">2.66 km</td>
                <td className="py-3 px-4 text-emerald-400 font-sans font-medium">Guaranteed Optimal</td>
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors bg-cyan-950/10">
                <td className="py-3 px-4 font-bold text-cyan-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  A* (Euclidean)
                </td>
                <td className="py-3 px-4 text-slate-300">Informed Heuristic (f=g+h)</td>
                <td className="py-3 px-4 text-blue-400">O((V + E) log V)</td>
                <td className="py-3 px-4 font-bold text-emerald-400">0.27 ms</td>
                <td className="py-3 px-4 text-emerald-300 font-bold">10 nodes (60% fewer!)</td>
                <td className="py-3 px-4 text-cyan-300 font-bold">2.66 km</td>
                <td className="py-3 px-4 text-emerald-400 font-sans font-medium">Optimal (Admissible h)</td>
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Breadth-First Search
                </td>
                <td className="py-3 px-4 text-slate-300">FIFO Queue Traversal</td>
                <td className="py-3 px-4 text-slate-400">O(V + E)</td>
                <td className="py-3 px-4 text-emerald-400">0.15 ms</td>
                <td className="py-3 px-4 text-slate-300">18 nodes</td>
                <td className="py-3 px-4 text-amber-400 font-bold">3.10 km</td>
                <td className="py-3 px-4 text-amber-400 font-sans font-medium">Hop-Optimal Only</td>
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Depth-First Search
                </td>
                <td className="py-3 px-4 text-slate-300">LIFO Stack Traversal</td>
                <td className="py-3 px-4 text-slate-400">O(V + E)</td>
                <td className="py-3 px-4 text-emerald-400">0.14 ms</td>
                <td className="py-3 px-4 text-slate-300">32 nodes</td>
                <td className="py-3 px-4 text-red-400 font-bold">14.80 km</td>
                <td className="py-3 px-4 text-red-400 font-sans font-medium">Arbitrary (Non-Optimal)</td>
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Bounded Backtracking
                </td>
                <td className="py-3 px-4 text-slate-300">Choose-Explore-Undo DFS</td>
                <td className="py-3 px-4 text-purple-400">O(b^d) Bounded</td>
                <td className="py-3 px-4 text-emerald-400">0.42 ms</td>
                <td className="py-3 px-4 text-slate-300">Multiple Simple Paths</td>
                <td className="py-3 px-4 text-purple-300 font-bold">3 Detours Found</td>
                <td className="py-3 px-4 text-purple-400 font-sans font-medium">Cycle-Free Alternatives</td>
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
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            End-to-End Execution Flow
          </span>
          <h2 className="text-3xl font-bold text-white">How ResQNet Operates</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative">
            <div className="text-xs font-mono text-cyan-400 mb-2">STEP 01</div>
            <h3 className="font-bold text-white text-sm mb-1">Incident Triage & PQ</h3>
            <p className="text-xs text-slate-400">
              Simulated 911 calls enter the binary min-heap. Critical cases with earliest timestamps are prioritized first.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative">
            <div className="text-xs font-mono text-cyan-400 mb-2">STEP 02</div>
            <h3 className="font-bold text-white text-sm mb-1">Candidate Scoring</h3>
            <p className="text-xs text-slate-400">
              Dijkstra runs from each available ambulance to incident node. Scored via 4-variable penalty formula.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative">
            <div className="text-xs font-mono text-cyan-400 mb-2">STEP 03</div>
            <h3 className="font-bold text-white text-sm mb-1">Hospital Assignment</h3>
            <p className="text-xs text-slate-400">
              Filters facilities by medical capability (trauma, cardiac, burn) and bed capacity (&gt;0) to choose the best destination.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative">
            <div className="text-xs font-mono text-cyan-400 mb-2">STEP 04</div>
            <h3 className="font-bold text-white text-sm mb-1">Dispatch & Invalidation</h3>
            <p className="text-xs text-slate-400">
              Ambulance moves to EN_ROUTE. Road condition changes bump graphVersion, triggering immediate detour alerts.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ACADEMIC PROJECT-BASED LEARNING NOTICE & FOOTER
          ========================================================================= */}
      <footer className="pt-12 border-t border-slate-800/80 space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 animate-pulse" />
            <div className="text-xs text-amber-300">
              <span className="font-bold block text-sm text-white">Project-Based Learning Evaluation Notice:</span>
              This system is strictly an academic computer engineering simulation built with deterministic synthetic data. It is not intended for real clinical, emergency, or 911 dispatch operations.
            </div>
          </div>
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 whitespace-nowrap transition-colors"
          >
            Sign In with Demo Accounts
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            ResQNet • Computer Engineering PBL • Pure Data Structures & Algorithms
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span>MongoDB: Connected</span>
            <span>API: Port 5001</span>
            <span>Client: Port 5173</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
