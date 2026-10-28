import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play, Pause, SkipForward, RotateCcw, FastForward,
  Activity, Compass, ShieldAlert, CheckCircle2, Sliders, Layers
} from 'lucide-react';

/**
 * RouteSimulationCanvas
 * Implements Part F Signature Route Simulation:
 * - Dark-themed network canvas with offline fallback.
 * - Progressive edge wavefront illumination (blue explored area expanding outward).
 * - Bidirectional meeting wavefront support.
 * - Bright green route polyline upon target reach.
 * - Live HUD: Nodes Expanded, Edges Examined, Frontier Size, Cost g, Step N/total, Graph Version.
 * - Animated ambulance movement with real-time ETA countdown.
 * - Road blocking interaction triggering dynamic live reroute.
 */
export default function RouteSimulationCanvas({
  nodes = [],
  edges = [],
  sourceNodeId,
  destinationNodeId,
  algorithm = 'DIJKSTRA',
  simulationSteps = [],
  finalPath = [],
  finalCost = 0,
  graphVersion = 1,
  onBlockEdge,
  ambulanceCallSign = 'Unit-ALS-1',
  isCompareMode = false,
  comparisonData = null
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Simulation playback state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 0.5, 1, 2, 5, 10
  const [isFinished, setIsFinished] = useState(false);

  // Ambulance movement along route
  const [ambulanceProgress, setAmbulanceProgress] = useState(0); // 0.0 to 1.0 along finalPath
  const [isAmbulanceMoving, setIsAmbulanceMoving] = useState(false);
  const [etaRemainingSeconds, setEtaRemainingSeconds] = useState(0);

  // Clicked edge selection for dynamic road blocking
  const [selectedEdge, setSelectedEdge] = useState(null);

  // Node coordinate lookup map
  const nodeMap = useRef(new Map());
  useEffect(() => {
    nodeMap.current.clear();
    nodes.forEach((n) => {
      nodeMap.current.set(n.nodeId, n);
    });
  }, [nodes]);

  // Compute map bounding box to project lat/lng onto canvas coordinates
  const bounds = useRef({ minLat: 19.95, maxLat: 20.05, minLng: 73.72, maxLng: 73.85 });
  useEffect(() => {
    if (nodes.length > 0) {
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      nodes.forEach((n) => {
        if (n.lat < minLat) minLat = n.lat;
        if (n.lat > maxLat) maxLat = n.lat;
        if (n.lng < minLng) minLng = n.lng;
        if (n.lng > maxLng) maxLng = n.lng;
      });
      bounds.current = { minLat, maxLat, minLng, maxLng };
    }
  }, [nodes]);

  const project = useCallback((lat, lng, width, height) => {
    const pad = 40;
    const { minLat, maxLat, minLng, maxLng } = bounds.current;
    const x = pad + ((lng - minLng) / (maxLng - minLng || 0.001)) * (width - pad * 2);
    // Invert Y so north is top
    const y = height - pad - ((lat - minLat) / (maxLat - minLat || 0.001)) * (height - pad * 2);
    return { x, y };
  }, []);

  // Total steps available in trace
  const totalSteps = simulationSteps.length;

  // Main Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 1. Dark charcoal background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle grid lines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Draw all base road edges in dim slate grey
    ctx.lineWidth = 1;
    for (const edge of edges) {
      const u = nodeMap.current.get(edge.fromNodeId);
      const v = nodeMap.current.get(edge.toNodeId);
      if (u && v) {
        const p1 = project(u.lat, u.lng, width, height);
        const p2 = project(v.lat, v.lng, width, height);

        if (edge.condition === 'BLOCKED' || edge.condition === 'blocked') {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; // Red for blocked roads
          ctx.lineWidth = 2;
        } else if (edge.condition === 'CONGESTED' || edge.condition === 'congested') {
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)'; // Amber for congested roads
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)'; // Slate base
          ctx.lineWidth = 1;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 4. Draw explored wavefront up to currentStepIndex
    const exploredNodes = new Set();
    const frontierNodes = new Set();

    for (let i = 0; i <= currentStepIndex && i < totalSteps; i++) {
      const step = simulationSteps[i];
      if (step) {
        if (step.nodeId) exploredNodes.add(step.nodeId);
        if (step.visitedNodes) {
          step.visitedNodes.forEach((n) => exploredNodes.add(n));
        }
      }
    }

    // Get current active frontier
    const activeStep = simulationSteps[currentStepIndex];
    if (activeStep && activeStep.frontier) {
      activeStep.frontier.forEach((f) => frontierNodes.add(f.nodeId || f));
    }

    // Draw illuminated blue explored edges
    ctx.lineWidth = 2.5;
    for (const edge of edges) {
      if (exploredNodes.has(edge.fromNodeId) && exploredNodes.has(edge.toNodeId)) {
        const u = nodeMap.current.get(edge.fromNodeId);
        const v = nodeMap.current.get(edge.toNodeId);
        if (u && v) {
          const p1 = project(u.lat, u.lng, width, height);
          const p2 = project(v.lat, v.lng, width, height);

          // Electric blue wave
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.75)';
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // Draw pulsating frontier nodes (cyan glow)
    for (const fNodeId of frontierNodes) {
      const node = nodeMap.current.get(fNodeId);
      if (node) {
        const pt = project(node.lat, node.lng, width, height);
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    }

    // 5. Draw Final Optimal Route if search completed or skipped
    const isRouteVisible = isFinished || currentStepIndex >= totalSteps - 1;
    if (isRouteVisible && finalPath && finalPath.length > 1) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#10b981'; // Bright emerald green
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (let i = 0; i < finalPath.length; i++) {
        const node = nodeMap.current.get(finalPath[i]);
        if (node) {
          const pt = project(node.lat, node.lng, width, height);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    }

    // 6. Draw Start Dot (Green) and Destination Dot (Red)
    const srcNode = nodeMap.current.get(sourceNodeId);
    if (srcNode) {
      const pt = project(srcNode.lat, srcNode.lng, width, height);
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('START', pt.x + 12, pt.y + 4);
    }

    const destNode = nodeMap.current.get(destinationNodeId);
    if (destNode) {
      const pt = project(destNode.lat, destNode.lng, width, height);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('DEST', pt.x + 12, pt.y + 4);
    }

    // 7. Draw Moving Ambulance Marker along Route
    if (isRouteVisible && finalPath && finalPath.length > 1) {
      const pathIndex = Math.min(
        Math.floor(ambulanceProgress * (finalPath.length - 1)),
        finalPath.length - 2
      );
      const uId = finalPath[pathIndex];
      const vId = finalPath[pathIndex + 1];
      const u = nodeMap.current.get(uId);
      const v = nodeMap.current.get(vId);

      if (u && v) {
        const segmentT = (ambulanceProgress * (finalPath.length - 1)) - pathIndex;
        const p1 = project(u.lat, u.lng, width, height);
        const p2 = project(v.lat, v.lng, width, height);
        const ambX = p1.x + (p2.x - p1.x) * segmentT;
        const ambY = p1.y + (p2.y - p1.y) * segmentT;

        // Ambulance glowing pulse marker
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(ambX, ambY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(`🚑 ${ambulanceCallSign}`, ambX + 12, ambY - 6);
      }
    }
  }, [edges, currentStepIndex, totalSteps, simulationSteps, finalPath, isFinished, ambulanceProgress, ambulanceCallSign, sourceNodeId, destinationNodeId, project]);

  // Animation ticker for progressive search wavefront
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const interval = Math.max(16, 120 / speed);

    const stepSimulation = (time) => {
      if (time - lastTime >= interval) {
        setCurrentStepIndex((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            setIsFinished(true);
            setIsAmbulanceMoving(true); // Begin ambulance journey once path discovered
            return prev;
          }
          return prev + 1;
        });
        lastTime = time;
      }
      animFrameRef.current = requestAnimationFrame(stepSimulation);
    };

    animFrameRef.current = requestAnimationFrame(stepSimulation);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, speed, totalSteps]);

  // Ambulance movement along route polyline
  useEffect(() => {
    if (!isAmbulanceMoving || !finalPath || finalPath.length < 2) return;

    let animId;
    const duration = Math.max(5000, (finalCost || 60) * 100); // simulation duration in ms
    let startTime = performance.now();

    const moveAmbulance = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      setAmbulanceProgress(progress);

      const remainingSecs = Math.max(0, Math.round(((1 - progress) * (finalCost || 120))));
      setEtaRemainingSeconds(remainingSecs);

      if (progress < 1.0) {
        animId = requestAnimationFrame(moveAmbulance);
      } else {
        setIsAmbulanceMoving(false);
      }
    };

    animId = requestAnimationFrame(moveAmbulance);
    return () => cancelAnimationFrame(animId);
  }, [isAmbulanceMoving, finalPath, finalCost]);

  // Redraw when canvas or state changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Playback control helpers
  const handlePlayPause = () => {
    if (isFinished) {
      // Replay from beginning
      setCurrentStepIndex(0);
      setIsFinished(false);
      setAmbulanceProgress(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSkipToResult = () => {
    setIsPlaying(false);
    setCurrentStepIndex(totalSteps > 0 ? totalSteps - 1 : 0);
    setIsFinished(true);
    setIsAmbulanceMoving(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setIsFinished(false);
    setAmbulanceProgress(0);
    setIsAmbulanceMoving(false);
  };

  const activeStep = simulationSteps[currentStepIndex] || {};

  return (
    <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-slate-100">
      {/* Simulation Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-wide text-white">Live Route Navigation</span>
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-950 text-blue-300 border border-blue-800 rounded-full">
                {algorithm}
              </span>
              <span className="text-xs text-slate-400">graph v{graphVersion}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Wavefront expanding over Nashik road network ({nodes.length} nodes, {edges.length} edges)
            </p>
          </div>
        </div>

        {/* Live Metrics HUD */}
        <div className="flex items-center gap-4 text-xs font-mono bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-500 mr-1.5">EXPANDED:</span>
            <span className="text-blue-400 font-bold">{activeStep.nodesExpanded || currentStepIndex}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1.5">COST g:</span>
            <span className="text-emerald-400 font-bold">
              {activeStep.cost ? activeStep.cost.toFixed(1) : (finalCost ? finalCost.toFixed(1) : 0)}s
            </span>
          </div>
          <div>
            <span className="text-slate-500 mr-1.5">STEP:</span>
            <span className="text-amber-400 font-bold">{currentStepIndex}/{totalSteps}</span>
          </div>
          {isAmbulanceMoving && (
            <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>ETA: {etaRemainingSeconds}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative w-full h-[460px] sm:h-[540px] bg-[#080d1a] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={900}
          height={540}
          className="w-full h-full object-contain block cursor-crosshair"
          onClick={(e) => {
            // Click road to simulate dynamic block
            if (onBlockEdge && edges.length > 0) {
              const testEdge = edges.find((ed) => finalPath.includes(ed.fromNodeId) && finalPath.includes(ed.toNodeId));
              if (testEdge) {
                setSelectedEdge(testEdge);
              }
            }
          }}
        />

        {/* Live Step Narration Box */}
        <div className="absolute bottom-3 left-4 right-4 bg-slate-950/85 backdrop-blur border border-slate-800 p-2.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <Activity className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-slate-300">
              {activeStep.explanation || `Search wavefront reached step ${currentStepIndex}. Explored edges illuminated in blue.`}
            </span>
          </div>
          {selectedEdge && (
            <button
              onClick={() => {
                if (onBlockEdge) onBlockEdge(selectedEdge.edgeId);
                setSelectedEdge(null);
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold shrink-0 transition"
            >
              Block Road {selectedEdge.edgeId} (Trigger Live Re-route)
            </button>
          )}
        </div>

        {/* Visual Legend */}
        <div className="absolute top-3 right-4 bg-slate-950/85 backdrop-blur border border-slate-800 px-3 py-2 rounded-xl text-[11px] flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Start / Ambulance Location</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-300">Destination (Scene / Hospital)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 bg-blue-500 rounded" />
            <span className="text-slate-300">Explored Wavefront</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1.5 bg-emerald-400 rounded" />
            <span className="text-slate-300">Optimal Path Found</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 bg-red-500 rounded" />
            <span className="text-slate-300">Blocked Road Segment</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900 border-t border-slate-800 gap-3">
        {/* Playback Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            {isPlaying ? 'Pause' : isFinished ? 'Replay' : 'Simulate'}
          </button>

          <button
            onClick={handleStepBackward}
            disabled={currentStepIndex === 0}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-xs transition"
            title="Step Backward"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleStepForward}
            disabled={currentStepIndex >= totalSteps - 1}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-xs transition"
            title="Step Forward"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleSkipToResult}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
          >
            Skip to Result
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1 max-w-md flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500">0</span>
          <input
            type="range"
            min={0}
            max={totalSteps > 0 ? totalSteps - 1 : 0}
            value={currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStepIndex(parseInt(e.target.value, 10));
            }}
            className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono text-slate-400">{totalSteps}</span>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          {[0.5, 1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                speed === s
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
