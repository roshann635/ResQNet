import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import SvgGraphView from './SvgGraphView.jsx';
import { Map as MapIcon, Network, Layers, AlertTriangle, Truck, Building2 } from 'lucide-react';

export default function MapView({
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
  const [viewMode, setViewMode] = useState('svg'); // 'svg' (offline default) or 'leaflet'

  // Center coordinate
  const center = [19.9860, 73.7810];

  // Map node lookup
  const nodeMap = new Map();
  nodes.forEach((n) => nodeMap.set(n.nodeId, n));

  return (
    <div className="flex flex-col gap-3">
      {/* View Switcher Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Network Visualization
          </span>
          <span className="text-xs text-slate-400">
            ({nodes.length} Vertices, {edges.length} Directed Edges)
          </span>
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('svg')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'svg'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Offline SVG Graph
          </button>
          <button
            onClick={() => setViewMode('leaflet')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'leaflet'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Geographic Map
          </button>
        </div>
      </div>

      {/* Main Graph/Map Canvas */}
      {viewMode === 'svg' ? (
        <SvgGraphView
          nodes={nodes}
          edges={edges}
          ambulances={ambulances}
          hospitals={hospitals}
          incidents={incidents}
          highlightedRoute={highlightedRoute}
          alternativeRoutes={alternativeRoutes}
          onEdgeClick={onEdgeClick}
          onNodeClick={onNodeClick}
          selectedNodeId={selectedNodeId}
        />
      ) : (
        <div className="h-[650px] w-full rounded-xl overflow-hidden border border-slate-800 shadow-inner z-0">
          <MapContainer
            center={center}
            zoom={14}
            scrollWheelZoom={true}
            className="h-full w-full bg-slate-950"
          >
            {/* Dark carto basemap */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Edge polylines */}
            {edges.map((edge) => {
              const u = nodeMap.get(edge.fromNodeId);
              const v = nodeMap.get(edge.toNodeId);
              if (!u || !v) return null;

              const isBlocked = edge.condition === 'BLOCKED';
              const isCongested = edge.condition === 'CONGESTED';
              const inRoute =
                highlightedRoute.includes(edge.fromNodeId) &&
                highlightedRoute.includes(edge.toNodeId);

              let color = '#475569';
              let weight = 2;
              let dashArray = null;

              if (isBlocked) {
                color = '#ef4444';
                weight = 3;
                dashArray = '5, 5';
              } else if (isCongested) {
                color = '#f59e0b';
                weight = 3;
              } else if (inRoute) {
                color = '#06b6d4';
                weight = 4;
              }

              return (
                <Polyline
                  key={edge.edgeId}
                  positions={[
                    [u.latitude, u.longitude],
                    [v.latitude, v.longitude]
                  ]}
                  pathOptions={{ color, weight, dashArray }}
                  eventHandlers={{
                    click: () => onEdgeClick && onEdgeClick(edge)
                  }}
                >
                  <Tooltip sticky>
                    <div className="text-xs font-sans">
                      <div className="font-bold">Edge: {edge.edgeId}</div>
                      <div>From: {edge.fromNodeId} → To: {edge.toNodeId}</div>
                      <div>Base Cost: {edge.baseCost} km</div>
                      <div>Condition: <span className="font-semibold">{edge.condition}</span></div>
                      <div className="text-[10px] text-cyan-400 mt-1">Click to toggle road state</div>
                    </div>
                  </Tooltip>
                </Polyline>
              );
            })}

            {/* Node markers */}
            {nodes.map((node) => {
              const inRoute = highlightedRoute.includes(node.nodeId);
              return (
                <CircleMarker
                  key={node.nodeId}
                  center={[node.latitude, node.longitude]}
                  radius={inRoute ? 7 : 5}
                  pathOptions={{
                    color: inRoute ? '#06b6d4' : '#64748b',
                    fillColor: inRoute ? '#22d3ee' : '#0f172a',
                    fillOpacity: 0.9,
                    weight: 2
                  }}
                  eventHandlers={{
                    click: () => onNodeClick && onNodeClick(node)
                  }}
                >
                  <Tooltip direction="top" offset={[0, -5]}>
                    <div className="text-xs font-sans">
                      <div className="font-bold text-cyan-400">{node.nodeId}: {node.label}</div>
                      <div className="text-slate-400">Zone: {node.zone}</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      )}

      {/* Persistent Visual Legend (Never color alone) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-slate-600 rounded"></span>
            <span>Normal Road</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-amber-500 rounded"></span>
            <span>Congested (1.8×)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 border-t-2 border-dashed border-red-500"></span>
            <span>Blocked (Impassable)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1.5 bg-cyan-400 rounded-full shadow-sm"></span>
            <span>Optimal Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-blue-900 border border-blue-500 flex items-center justify-center font-bold text-[9px] text-blue-300">H</span>
            <span>Hospital</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-900 border border-emerald-500 flex items-center justify-center font-bold text-[9px] text-emerald-300">A</span>
            <span>Ambulance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-red-900 border border-red-500 flex items-center justify-center font-bold text-[9px] text-red-300">!</span>
            <span>Incident</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          Tip: Click on any road segment to toggle its state (Normal / Congested / Blocked).
        </div>
      </div>
    </div>
  );
}
