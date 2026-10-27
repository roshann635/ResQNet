import React, { useMemo } from 'react';
import { Truck, Building2, AlertCircle } from 'lucide-react';

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
  selectedNodeId
}) {
  // Compute bounding box for projection
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minLat: 19.96, maxLat: 20.01, minLon: 73.76, maxLon: 73.80 };
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    nodes.forEach((n) => {
      if (n.latitude < minLat) minLat = n.latitude;
      if (n.latitude > maxLat) maxLat = n.latitude;
      if (n.longitude < minLon) minLon = n.longitude;
      if (n.longitude > maxLon) maxLon = n.longitude;
    });
    // Add 10% padding
    const pLat = (maxLat - minLat) * 0.08 || 0.005;
    const pLon = (maxLon - minLon) * 0.08 || 0.005;
    return {
      minLat: minLat - pLat,
      maxLat: maxLat + pLat,
      minLon: minLon - pLon,
      maxLon: maxLon + pLon
    };
  }, [nodes]);

  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 700;

  // Project lat/lon to SVG (X, Y)
  const project = (lat, lon) => {
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * SVG_WIDTH;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * SVG_HEIGHT;
    return { x: Math.max(40, Math.min(SVG_WIDTH - 40, x)), y: Math.max(40, Math.min(SVG_HEIGHT - 40, y)) };
  };

  const nodePositions = useMemo(() => {
    const map = new Map();
    nodes.forEach((n) => {
      map.set(n.nodeId, project(n.latitude, n.longitude));
    });
    return map;
  }, [nodes, bounds]);

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

  return (
    <div className="relative w-full h-[650px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner select-none">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-full cursor-crosshair"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 2" />
          </pattern>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Grid for Offline Graph View */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* 1. EDGES */}
        <g id="edges-layer">
          {edges.map((edge) => {
            const p1 = nodePositions.get(edge.fromNodeId);
            const p2 = nodePositions.get(edge.toNodeId);
            if (!p1 || !p2) return null;

            const isPrimary = primaryEdgeSet.has(`${edge.fromNodeId}->${edge.toNodeId}`);
            const isBlocked = edge.condition === 'BLOCKED';
            const isCongested = edge.condition === 'CONGESTED';

            let strokeColor = '#334155'; // default slate-700
            let strokeWidth = 2;
            let dashArray = 'none';

            if (isBlocked) {
              strokeColor = '#ef4444'; // Red
              strokeWidth = 3;
              dashArray = '6 4';
            } else if (isCongested) {
              strokeColor = '#f59e0b'; // Amber
              strokeWidth = 3;
            } else if (isPrimary) {
              strokeColor = '#06b6d4'; // Cyan primary route
              strokeWidth = 5;
            }

            return (
              <g
                key={edge.edgeId}
                className="cursor-pointer group"
                onClick={() => onEdgeClick && onEdgeClick(edge)}
              >
                {/* Wider invisible line for easy clicking */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="transparent"
                  strokeWidth="16"
                />
                {/* Rendered road segment */}
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
                  className="transition-all duration-300 group-hover:stroke-cyan-400 group-hover:stroke-[4]"
                />
                {/* Midpoint badge for road condition */}
                {(isBlocked || isCongested) && (
                  <circle
                    cx={(p1.x + p2.x) / 2}
                    cy={(p1.y + p2.y) / 2}
                    r="5"
                    fill={isBlocked ? '#dc2626' : '#d97706'}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* 2. NODES */}
        <g id="nodes-layer">
          {nodes.map((node) => {
            const pos = nodePositions.get(node.nodeId);
            if (!pos) return null;

            const isSelected = selectedNodeId === node.nodeId;
            const inRoute = highlightedRoute.includes(node.nodeId);
            const zColor = zoneColors[node.zone] || '#94a3b8';

            return (
              <g
                key={node.nodeId}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer group"
                onClick={() => onNodeClick && onNodeClick(node)}
              >
                {/* Node Ring */}
                <circle
                  r={isSelected ? 10 : inRoute ? 8 : 6}
                  fill={inRoute ? '#06b6d4' : '#0f172a'}
                  stroke={isSelected ? '#38bdf8' : zColor}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all duration-200 group-hover:r-8"
                />

                {/* Node Identifier Label */}
                <text
                  y="-11"
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="9.5"
                  fontWeight="600"
                  className="pointer-events-none drop-shadow"
                >
                  {node.nodeId}
                </text>
              </g>
            );
          })}
        </g>

        {/* 3. AMBULANCES, HOSPITALS, INCIDENTS OVERLAY */}
        <g id="markers-layer">
          {/* Hospitals */}
          {hospitals.map((h) => {
            const pos = nodePositions.get(h.nodeId);
            if (!pos) return null;
            return (
              <g key={h.hospitalId} transform={`translate(${pos.x + 10}, ${pos.y - 10})`}>
                <rect x="-8" y="-8" width="16" height="16" rx="3" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="0" y="3" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold">H</text>
              </g>
            );
          })}

          {/* Ambulances */}
          {ambulances.map((a) => {
            const pos = nodePositions.get(a.currentNodeId);
            if (!pos) return null;
            const isAvail = a.status === 'AVAILABLE';
            return (
              <g key={a.ambulanceId} transform={`translate(${pos.x - 14}, ${pos.y + 10})`}>
                <circle r="7" fill={isAvail ? '#15803d' : '#475569'} stroke="#f8fafc" strokeWidth="1" />
                <text x="0" y="2.5" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold">A</text>
              </g>
            );
          })}

          {/* Incidents */}
          {incidents.map((inc) => {
            const pos = nodePositions.get(inc.locationNodeId);
            if (!pos || inc.status === 'RESOLVED' || inc.status === 'CANCELLED') return null;
            const isCrit = inc.severity === 'CRITICAL';
            return (
              <g key={inc.incidentId} transform={`translate(${pos.x}, ${pos.y + 16})`}>
                <circle r="8" fill={isCrit ? '#dc2626' : '#ea580c'} stroke="#f8fafc" strokeWidth="1.5" className="animate-ping opacity-75" />
                <circle r="7" fill={isCrit ? '#dc2626' : '#ea580c'} stroke="#f8fafc" strokeWidth="1" />
                <text x="0" y="2.5" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">!</text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Offline Indicator */}
      <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 backdrop-blur-sm text-slate-300">
        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
        <span>Offline SVG Canvas Graph (Deterministic Topology)</span>
      </div>
    </div>
  );
}
