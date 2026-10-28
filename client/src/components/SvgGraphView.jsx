import React, { useMemo, useState, useRef } from 'react';
import { Truck, Building2, AlertCircle, ZoomIn, ZoomOut, RotateCcw, Compass, MapPin } from 'lucide-react';
import {
  fallbackNodes,
  fallbackEdges,
  fallbackHospitals,
  fallbackAmbulances,
  fallbackIncidents
} from '../data/mockMapData.js';

export default function SvgGraphView({
  nodes = [],
  edges = [],
  ambulances = [],
  hospitals = [],
  incidents = [],
  highlightedRoute = [],
  alternativeRoutes = [],
  onEdgeClick,
  onNodeClick,
  onHospitalClick,
  selectedNodeId,
  selectedHospitalId
}) {
  // Resilient fallback datasets
  const effectiveNodes = Array.isArray(nodes) && nodes.length > 0 ? nodes : fallbackNodes;
  const effectiveEdges = Array.isArray(edges) && edges.length > 0 ? edges : fallbackEdges;
  const effectiveAmbulances = Array.isArray(ambulances) && ambulances.length > 0 ? ambulances : fallbackAmbulances;
  const effectiveHospitals = Array.isArray(hospitals) && hospitals.length > 0 ? hospitals : fallbackHospitals;
  const effectiveIncidents = Array.isArray(incidents) && incidents.length > 0 ? incidents : fallbackIncidents;

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Compute bounding box for projection
  const bounds = useMemo(() => {
    if (effectiveNodes.length === 0) return { minLat: 19.96, maxLat: 20.01, minLon: 73.76, maxLon: 73.80 };
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    effectiveNodes.forEach((n) => {
      const lat = n.latitude || n.lat || 19.98;
      const lon = n.longitude || n.lng || 73.78;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    });
    // Add 8% padding
    const pLat = (maxLat - minLat) * 0.08 || 0.005;
    const pLon = (maxLon - minLon) * 0.08 || 0.005;
    return {
      minLat: minLat - pLat,
      maxLat: maxLat + pLat,
      minLon: minLon - pLon,
      maxLon: maxLon + pLon
    };
  }, [effectiveNodes]);

  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 700;

  // Project lat/lon to SVG (X, Y)
  const project = (lat, lon) => {
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 0.001)) * SVG_WIDTH;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat || 0.001)) * SVG_HEIGHT;
    return {
      x: Math.max(30, Math.min(SVG_WIDTH - 30, x)),
      y: Math.max(30, Math.min(SVG_HEIGHT - 30, y))
    };
  };

  const nodePositions = useMemo(() => {
    const map = new Map();
    effectiveNodes.forEach((n) => {
      const lat = n.latitude || n.lat || 19.98;
      const lon = n.longitude || n.lng || 73.78;
      map.set(n.nodeId, project(lat, lon));
    });
    return map;
  }, [effectiveNodes, bounds]);

  // Set of route edges for highlighting
  const primaryEdgeSet = useMemo(() => {
    const set = new Set();
    if (!highlightedRoute || highlightedRoute.length < 2) return set;
    for (let i = 0; i < highlightedRoute.length - 1; i++) {
      set.add(`${highlightedRoute[i]}->${highlightedRoute[i + 1]}`);
      set.add(`${highlightedRoute[i + 1]}->${highlightedRoute[i]}`);
    }
    return set;
  }, [highlightedRoute]);

  const zoneColors = {
    Campus: '#38bdf8', // Sky
    North: '#a855f7', // Purple
    Central: '#f59e0b', // Amber
    West: '#10b981', // Emerald
    East: '#06b6d4', // Cyan
    South: '#ec4899' // Pink
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(3.0, Math.round((z + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((z) => Math.max(0.5, Math.min(3.0, Math.round((z + delta) * 100) / 100)));
  };

  return (
    <div
      className="relative w-full h-[400px] sm:h-[500px] md:h-[580px] lg:h-[680px] bg-slate-900 rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* SVG Canvas with Zoom & Pan Transformations */}
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.75" strokeDasharray="3 3" />
          </pattern>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="hospitalGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Grid */}
        <rect width="100%" height="100%" fill="#090d16" />
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Transform Group for Zoom & Pan */}
        <g
          transform={`translate(${pan.x + (SVG_WIDTH / 2) * (1 - zoom)}, ${pan.y + (SVG_HEIGHT / 2) * (1 - zoom)}) scale(${zoom})`}
          className="transition-transform duration-75"
        >
          {/* 1. EDGES LAYER */}
          <g id="edges-layer">
            {effectiveEdges.map((edge) => {
              const fromId = edge.fromNodeId || edge.from;
              const toId = edge.toNodeId || edge.to;
              const p1 = nodePositions.get(fromId);
              const p2 = nodePositions.get(toId);
              if (!p1 || !p2) return null;

              const isPrimary = primaryEdgeSet.has(`${fromId}->${toId}`);
              const isBlocked = edge.condition === 'BLOCKED';
              const isCongested = edge.condition === 'CONGESTED';

              let strokeColor = '#334155'; // Dark street line
              let strokeWidth = 1.75;
              let dashArray = 'none';

              if (isBlocked) {
                strokeColor = '#ef4444'; // Red
                strokeWidth = 3;
                dashArray = '6 4';
              } else if (isCongested) {
                strokeColor = '#f59e0b'; // Amber
                strokeWidth = 2.75;
              } else if (isPrimary) {
                strokeColor = '#10b981'; // Bright green route
                strokeWidth = 5;
              }

              return (
                <g
                  key={edge.edgeId}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdgeClick) onEdgeClick(edge);
                  }}
                >
                  {/* Invisible hit line */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="transparent"
                    strokeWidth="16"
                  />
                  {/* Visual street edge */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    strokeLinecap="round"
                    filter={isPrimary ? 'url(#glow)' : undefined}
                    className="transition-all duration-200 group-hover:stroke-emerald-400 group-hover:stroke-[3.5]"
                  />
                  {/* Indicator for blocked or congested road */}
                  {(isBlocked || isCongested) && (
                    <circle
                      cx={(p1.x + p2.x) / 2}
                      cy={(p1.y + p2.y) / 2}
                      r="4.5"
                      fill={isBlocked ? '#ef4444' : '#f59e0b'}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* 2. NODES LAYER */}
          <g id="nodes-layer">
            {effectiveNodes.map((node) => {
              const pos = nodePositions.get(node.nodeId);
              if (!pos) return null;

              const isSelected = selectedNodeId === node.nodeId;
              const inRoute = highlightedRoute.includes(node.nodeId);
              const zColor = zoneColors[node.zone] || '#64748b';

              return (
                <g
                  key={node.nodeId}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNodeClick) onNodeClick(node);
                  }}
                >
                  <circle
                    r={isSelected ? 9 : inRoute ? 7 : 4}
                    fill={inRoute ? '#10b981' : isSelected ? '#38bdf8' : '#1e293b'}
                    stroke={isSelected ? '#38bdf8' : inRoute ? '#059669' : zColor}
                    strokeWidth={isSelected ? 3 : inRoute ? 2.5 : 1.5}
                    className="transition-all duration-150 group-hover:r-7"
                  />
                  {(isSelected || inRoute) && (
                    <text
                      y="-11"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.nodeId}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* 3. HOSPITALS LAYER (Interactive Tap with Full Info) */}
          <g id="hospitals-layer">
            {effectiveHospitals.map((h) => {
              const pos = nodePositions.get(h.nodeId || h.locationNodeId);
              if (!pos) return null;
              const isSelected = selectedHospitalId === h.hospitalId;
              const isOpen = h.status === 'Open' || h.status === 'OPEN';
              const isDiverting = h.status === 'Diverting' || h.status === 'DIVERTING';

              return (
                <g
                  key={h.hospitalId}
                  transform={`translate(${pos.x + 12}, ${pos.y - 12})`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onHospitalClick) onHospitalClick(h);
                  }}
                >
                  {/* Glow circle if selected */}
                  {isSelected && (
                    <circle
                      r="16"
                      fill="#a855f7"
                      fillOpacity="0.3"
                      stroke="#c084fc"
                      strokeWidth="2"
                      filter="url(#hospitalGlow)"
                    />
                  )}
                  {/* Hospital Icon Box */}
                  <rect
                    x="-10"
                    y="-10"
                    width="20"
                    height="20"
                    rx="5"
                    fill={isOpen ? '#581c87' : isDiverting ? '#78350f' : '#831843'}
                    stroke={isOpen ? '#c084fc' : isDiverting ? '#fbbf24' : '#f43f5e'}
                    strokeWidth="1.75"
                    className="transition-all duration-200 group-hover:scale-125"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    H
                  </text>
                  {/* Hospital Name Label */}
                  <text
                    x="0"
                    y="18"
                    textAnchor="middle"
                    fill="#e9d5ff"
                    fontSize="8.5"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none"
                  >
                    {h.name?.split(' ')[0] || h.hospitalId}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 4. AMBULANCES LAYER */}
          <g id="ambulances-layer">
            {effectiveAmbulances.map((a) => {
              const pos = nodePositions.get(a.currentNodeId || a.baseStationNodeId);
              if (!pos) return null;
              const isAvail = a.status === 'Available' || a.status === 'AVAILABLE';

              return (
                <g key={a.ambulanceId} transform={`translate(${pos.x - 14}, ${pos.y + 12})`}>
                  <circle
                    r="8"
                    fill={isAvail ? '#059669' : '#0284c7'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="shadow-sm"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    A
                  </text>
                </g>
              );
            })}
          </g>

          {/* 5. INCIDENTS LAYER */}
          <g id="incidents-layer">
            {effectiveIncidents.map((inc) => {
              const pos = nodePositions.get(inc.locationNodeId || inc.nodeId);
              if (!pos || inc.status === 'Resolved' || inc.status === 'Cancelled') return null;
              const isCrit = inc.severity === 'CRITICAL' || inc.severity === 'Critical';

              return (
                <g key={inc.incidentId} transform={`translate(${pos.x}, ${pos.y + 16})`}>
                  <circle
                    r="10"
                    fill={isCrit ? '#ef4444' : '#f97316'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                  <circle
                    r="8"
                    fill={isCrit ? '#dc2626' : '#ea580c'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    !
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Floating Interactive Zoom Controls in Top-Right Corner */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className="flex flex-col bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2.5 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center border-b border-slate-700/60"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2.5 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center border-b border-slate-700/60"
            title="Reduce Zoom (-)"
          >
            <ZoomOut className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-2.5 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
            title="Reset Zoom to 100%"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Zoom Level Indicator Badge */}
        <div className="px-2.5 py-1 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-lg text-center text-[10px] font-mono font-bold text-emerald-400 shadow">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Bottom Hint Banner */}
      <div className="absolute bottom-3 left-3 bg-slate-800/85 backdrop-blur-md border border-slate-700 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-300 flex items-center gap-3 shadow-md pointer-events-none">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <Compass className="w-3.5 h-3.5" />
          Drag to pan · Scroll / Buttons to zoom
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-purple-300">Tap purple "H" markers for hospital stats</span>
      </div>
    </div>
  );
}
