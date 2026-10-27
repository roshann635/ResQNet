import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sparkles,
  BarChart2,
  Table as TableIcon,
  Search,
  Database,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { api } from '../api/client.js';

export default function AlgorithmLabPage() {
  const [nodes, setNodes] = useState([]);
  const [algorithm, setAlgorithm] = useState('DIJKSTRA');
  const [source, setSource] = useState('N-01');
  const [destination, setDestination] = useState('N-15');
  const [heuristic, setHeuristic] = useState('EUCLIDEAN');
  const [maxHops, setMaxHops] = useState(12);
  const [maxCost, setMaxCost] = useState(50.0);

  // Playback state
  const [executionResult, setExecutionResult] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef(null);

  // Comparative state
  const [comparisonData, setComparisonData] = useState(null);
  const [activeTab, setActiveTab] = useState('runner'); // 'runner', 'comparison', 'hashtable', 'bplustree'

  // Hash table demo state
  const [hashSearchKey, setHashSearchKey] = useState('HOS-001');
  const [hashResult, setHashResult] = useState(null);

  // B+ tree demo state
  const [bplusFrom, setBplusFrom] = useState('HOS-001');
  const [bplusTo, setBplusTo] = useState('HOS-005');
  const [bplusResult, setBplusResult] = useState(null);
  const [sampleKeysStatus, setSampleKeysStatus] = useState(null);

  useEffect(() => {
    async function loadNodes() {
      try {
        const data = await api.getNodes();
        setNodes(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadNodes();
  }, []);

  // Stepper playback logic
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (!executionResult?.steps || prev >= executionResult.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    } else {
      clearInterval(playTimerRef.current);
    }
    return () => clearInterval(playTimerRef.current);
  }, [isPlaying, executionResult]);

  const handleRunAlgorithm = async () => {
    try {
      setIsPlaying(false);
      setCurrentStepIndex(0);
      const res = await api.computeRoute({
        algorithm,
        source,
        destination,
        heuristic,
        limits: { maxHops, maxCost, maxResults: 5 }
      });
      setExecutionResult(res);
      setCurrentStepIndex(0);
    } catch (err) {
      alert(`Algorithm run failed: ${err.message}`);
    }
  };

  const handleRunComparison = async () => {
    try {
      const res = await api.compareRoutes({ source, destination });
      setComparisonData(res.comparison);
      setActiveTab('comparison');
    } catch (err) {
      alert(`Comparison failed: ${err.message}`);
    }
  };

  const handleHashLookup = async () => {
    try {
      const res = await api.getHashLookup(hashSearchKey);
      setHashResult(res);
    } catch (err) {
      alert(`Hash lookup failed: ${err.message}`);
    }
  };

  const handleBPlusQuery = async () => {
    try {
      const res = await api.getBPlusRange(bplusFrom, bplusTo);
      setBplusResult(res);
    } catch (err) {
      alert(`B+ Tree query failed: ${err.message}`);
    }
  };

  const handleLoadSampleKeys = async () => {
    try {
      const res = await api.loadSampleKeys();
      setSampleKeysStatus(res);
      alert(`Success! Loaded ${res.keysLoaded} synthetic demonstration keys into HashTable and B+ Tree.`);
      await handleHashLookup();
      await handleBPlusQuery();
    } catch (err) {
      alert(`Failed to load demo keys: ${err.message}`);
    }
  };

  const currentStep = executionResult?.steps?.[currentStepIndex];

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            DSA Algorithm Lab & Stepper Playback
          </h1>
          <p className="text-xs text-slate-400">
            Interactive step-by-step state playback, theoretical Big-O vs measured runtime, and custom data structure demos.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('runner')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'runner' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Algorithm Stepper
          </button>
          <button
            onClick={() => {
              setActiveTab('comparison');
              if (!comparisonData) handleRunComparison();
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'comparison' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            5-Way Comparison
          </button>
          <button
            onClick={() => {
              setActiveTab('hashtable');
              if (!hashResult) handleHashLookup();
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'hashtable' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hash Table
          </button>
          <button
            onClick={() => {
              setActiveTab('bplustree');
              if (!bplusResult) handleBPlusQuery();
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'bplustree' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            B+ Tree
          </button>
        </div>
      </div>

      {/* TAB 1: RUNNER & STEPPER PLAYBACK */}
      {activeTab === 'runner' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel (1 Col) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-xs">
              Search Parameters
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="DIJKSTRA">Dijkstra's Algorithm (MinHeap)</option>
                <option value="ASTAR">A* Heuristic Search</option>
                <option value="BFS">BFS (Queue Traversal)</option>
                <option value="DFS">DFS (Iterative Stack Traversal)</option>
                <option value="BACKTRACKING">Bounded Backtracking (Alternatives)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Source Vertex</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                >
                  {nodes.map((n) => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {n.nodeId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Vertex</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                >
                  {nodes.map((n) => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {n.nodeId}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {algorithm === 'ASTAR' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  A* Heuristic Strategy
                </label>
                <select
                  value={heuristic}
                  onChange={(e) => setHeuristic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="EUCLIDEAN">Euclidean Projected Distance (Admissible)</option>
                  <option value="HAVERSINE">Haversine Great-Circle (Admissible)</option>
                  <option value="MANHATTAN">Manhattan Grid Distance (Experimental)</option>
                </select>
              </div>
            )}

            {algorithm === 'BACKTRACKING' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Hops ({maxHops})</label>
                  <input
                    type="range"
                    min="4"
                    max="18"
                    value={maxHops}
                    onChange={(e) => setMaxHops(parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Cost ({maxCost} km)</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={maxCost}
                    onChange={(e) => setMaxCost(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleRunAlgorithm}
                className="w-full py-2.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition-all flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Execute & Trace Exploration
              </button>
              <button
                onClick={handleRunComparison}
                className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                Compare All 5 Algorithms
              </button>
            </div>
          </div>

          {/* Stepper Playback & Step Explanation (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            {executionResult ? (
              <>
                {/* Playback Controls & Progress Bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isPlaying
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'bg-cyan-600 text-white hover:bg-cyan-500'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isPlaying ? 'Pause Playback' : 'Play Exploration'}
                      </button>

                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentStepIndex((p) => Math.min((executionResult.steps?.length || 1) - 1, p + 1));
                        }}
                        disabled={currentStepIndex >= (executionResult.steps?.length || 1) - 1}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 text-xs font-semibold flex items-center gap-1"
                      >
                        <SkipForward className="w-4 h-4" />
                        Step
                      </button>

                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentStepIndex(0);
                        }}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold"
                        title="Reset to step 0"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      Step <span className="font-bold text-cyan-400">{currentStepIndex + 1}</span> of{' '}
                      {executionResult.steps?.length || 0}
                    </div>
                  </div>

                  {/* Range slider for scrubbing */}
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, (executionResult.steps?.length || 1) - 1)}
                    value={currentStepIndex}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentStepIndex(parseInt(e.target.value, 10));
                    }}
                    className="w-full accent-cyan-500"
                  />
                </div>

                {/* Plain-English Step Explanation Card */}
                {currentStep && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <Info className="w-4 h-4" />
                        Action: {currentStep.action}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        Node: {currentStep.nodeId}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-sm text-slate-200 leading-relaxed font-sans">
                      {currentStep.explanation}
                    </div>

                    {/* Step details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      {currentStep.g !== undefined && (
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px]">g(n) (Cumulative):</span>
                          <div className="font-bold text-white">{currentStep.g} km</div>
                        </div>
                      )}
                      {currentStep.h !== undefined && (
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px]">h(n) (Heuristic):</span>
                          <div className="font-bold text-amber-400">{currentStep.h} km</div>
                        </div>
                      )}
                      {currentStep.f !== undefined && (
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px]">f(n) = g + h:</span>
                          <div className="font-bold text-cyan-400">{currentStep.f} km</div>
                        </div>
                      )}
                      {currentStep.cost !== undefined && (
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px]">Settled Cost:</span>
                          <div className="font-bold text-emerald-400">{currentStep.cost} km</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Final Execution Summary */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Execution Metrics & Result
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px]">Total Route Cost:</span>
                      <div className="text-base font-bold text-cyan-400">
                        {executionResult.cost !== undefined ? `${executionResult.cost} km` : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px]">Nodes Expanded:</span>
                      <div className="text-base font-bold text-white">{executionResult.nodesExpanded}</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px]">Edges Examined:</span>
                      <div className="text-base font-bold text-white">{executionResult.edgesExamined}</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px]">Measured Runtime:</span>
                      <div className="text-base font-bold text-emerald-400">{executionResult.runtimeMs} ms</div>
                    </div>
                  </div>

                  {executionResult.path && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
                      <span className="text-slate-400 block mb-1">Resulting Path Sequence:</span>
                      <span className="text-cyan-400 font-bold">{executionResult.path.join(' → ')}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
                Select an algorithm and click <strong>"Execute & Trace Exploration"</strong> to launch the step-by-step playback engine.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SIDE-BY-SIDE 5-WAY COMPARISON (AT-17) */}
      {activeTab === 'comparison' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-cyan-400" />
                Algorithm Performance & Complexity Comparison (AT-17)
              </h2>
              <p className="text-xs text-slate-400">
                Executed simultaneously on the identical road network snapshot from {source} to {destination}.
              </p>
            </div>
            <button
              onClick={handleRunComparison}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Re-run Comparative Benchmark
            </button>
          </div>

          {comparisonData ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                    <th className="py-3 px-3">Algorithm</th>
                    <th className="py-3 px-3">Paradigm</th>
                    <th className="py-3 px-3">Theoretical Time Complexity</th>
                    <th className="py-3 px-3">Measured Runtime</th>
                    <th className="py-3 px-3">Nodes Expanded</th>
                    <th className="py-3 px-3">Edges Examined</th>
                    <th className="py-3 px-3">Route Cost</th>
                    <th className="py-3 px-3">Optimal?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {comparisonData.map((item) => (
                    <tr key={item.algorithm} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-white font-sans">{item.algorithm}</td>
                      <td className="py-3 px-3 text-slate-400 font-sans">{item.paradigm}</td>
                      <td className="py-3 px-3 text-cyan-400 font-semibold">{item.theoreticalComplexity}</td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">{item.measuredRuntimeMs} ms</td>
                      <td className="py-3 px-3 text-slate-200">{item.nodesExpanded}</td>
                      <td className="py-3 px-3 text-slate-200">{item.edgesExamined}</td>
                      <td className="py-3 px-3 text-amber-400 font-bold">{item.routeCost}</td>
                      <td className="py-3 px-3">
                        {item.isOptimal ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            YES (Guaranteed)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            NO (Heuristic / Traversal)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-8 text-xs text-slate-400">Loading benchmark...</div>
          )}
        </div>
      )}

      {/* TAB 3: CUSTOM HASH TABLE DEMO (Section 3.10) */}
      {activeTab === 'hashtable' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                Custom Hash Table (Symbol Table) Demo
              </h2>
              <p className="text-xs text-slate-400">
                Implemented with polynomial rolling hash, separate chaining collision resolution, and dynamic resizing (load factor &gt; 0.75).
              </p>
            </div>

            <button
              onClick={handleLoadSampleKeys}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Sparkles className="w-4 h-4" />
              Load 200 Sample Demo Keys
            </button>
          </div>

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={hashSearchKey}
              onChange={(e) => setHashSearchKey(e.target.value)}
              placeholder="Search key (e.g. HOS-001, AMB-001, COLLIDE-A-01)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
            <button
              onClick={handleHashLookup}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700"
            >
              Lookup
            </button>
          </div>

          {hashResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="text-slate-400 font-sans font-bold text-sm mb-2">Hash Metrics:</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Key:</span>
                  <span className="text-white font-bold">{hashResult.key}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Computed Hash Bucket Index:</span>
                  <span className="text-cyan-400 font-bold">{hashResult.hashIndex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bucket Chain Length:</span>
                  <span className="text-slate-200 font-bold">{hashResult.bucketChainLength}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Table Capacity:</span>
                  <span className="text-slate-200">{hashResult.tableMetrics.capacity} buckets</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Load Factor:</span>
                  <span className="text-emerald-400 font-bold">{hashResult.tableMetrics.loadFactor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Recorded Collisions:</span>
                  <span className="text-amber-400">{hashResult.tableMetrics.totalCollisions}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono">
                <div className="text-slate-400 font-sans font-bold text-sm mb-2">Retrieved Record:</div>
                <pre className="text-slate-300 text-[11px] overflow-x-auto p-2 bg-slate-900 rounded border border-slate-800 max-h-48">
                  {JSON.stringify(hashResult.value, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CUSTOM B+ TREE DEMO (Section 3.11) */}
      {activeTab === 'bplustree' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-cyan-400" />
                Custom B+ Tree Index & Range Query Demo
              </h2>
              <p className="text-xs text-slate-400">
                Order-4 balanced tree with recursive node splitting, internal routing keys, and linked leaf nodes for O(log N + K) range searches.
              </p>
            </div>

            <button
              onClick={handleLoadSampleKeys}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Sparkles className="w-4 h-4" />
              Load Sample Keys
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400">Range Query [From → To]:</span>
            <input
              type="text"
              value={bplusFrom}
              onChange={(e) => setBplusFrom(e.target.value)}
              placeholder="From Key (e.g. HOS-001)"
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono w-32"
            />
            <span className="text-slate-500">→</span>
            <input
              type="text"
              value={bplusTo}
              onChange={(e) => setBplusTo(e.target.value)}
              placeholder="To Key (e.g. HOS-005)"
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono w-32"
            />
            <button
              onClick={handleBPlusQuery}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
            >
              Execute Range Scan
            </button>
          </div>

          {bplusResult && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-6 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Tree Order (M):</span>
                  <div className="font-bold text-white">{bplusResult.treeMetrics.order}</div>
                </div>
                <div>
                  <span className="text-slate-400">Tree Height:</span>
                  <div className="font-bold text-cyan-400">{bplusResult.treeMetrics.height} levels</div>
                </div>
                <div>
                  <span className="text-slate-400">Total Indexed Items:</span>
                  <div className="font-bold text-white">{bplusResult.treeMetrics.size}</div>
                </div>
                <div>
                  <span className="text-slate-400">Matches in Range [{bplusFrom}..{bplusTo}]:</span>
                  <div className="font-bold text-emerald-400">{bplusResult.count} items</div>
                </div>
              </div>

              {/* Range Results Table */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-300">
                  Sequential Leaf Scan Results:
                </div>
                <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto">
                  {bplusResult.results.map((item, idx) => (
                    <div key={idx} className="p-2.5 text-xs font-mono flex items-center justify-between">
                      <span className="font-bold text-cyan-400">{item.key}</span>
                      <span className="text-slate-400">{item.value?.name || item.value?.label || item.value?.facility || 'Record'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
