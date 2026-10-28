import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import SvgGraphView from './SvgGraphView.jsx';
import { Map as MapIcon, Network, Layers, AlertTriangle, Truck, Building2, Hospital } from 'lucide-react';
import {
  fallbackNodes,
  fallbackEdges,
  fallbackHospitals,
  fallbackAmbulances,
  fallbackIncidents
} from '../data/mockMapData.js';

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
  onHospitalClick,
  selectedHospitalId,
  selectedNodeId
}) {
  const [viewMode, setViewMode] = useState('svg'); // 'svg' (offline default) or 'leaflet'

  // Resilient fallback datasets
  const effectiveNodes = Array.isArray(nodes) && nodes.length > 0 ? nodes : fallbackNodes;
  const effectiveEdges = Array.isArray(edges) && edges.length > 0 ? edges : fallbackEdges;
  const effectiveAmbulances = Array.isArray(ambulances) && ambulances.length > 0 ? ambulances : fallbackAmbulances;
  const effectiveHospitals = Array.isArray(hospitals) && hospitals.length > 0 ? hospitals : fallbackHospitals;
  const effectiveIncidents = Array.isArray(incidents) && incidents.length > 0 ? incidents : fallbackIncidents;

  // Center coordinate for Nashik
  const center = [19.9860, 73.7810];

  // Map node lookup
  const nodeMap = new Map();
  effectiveNodes.forEach((n) => nodeMap.set(n.nodeId, n));

  return (
    <div className="flex flex-col gap-3">
      {/* View Switcher Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-emerald-200 p-2.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-950 uppercase tracking-wider">
            Network Topology & Geographic Routing
          </span>
          <span className="text-xs text-slate-500">
            ({effectiveNodes.length} Vertices, {effectiveEdges.length} Directed Edges, {effectiveHospitals.length} Hospitals)
          </span>
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center bg-emerald-50/70 p-1 rounded-lg border border-emerald-200">
          <button
            onClick={() => setViewMode('svg')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'svg'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-emerald-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Interactive SVG Graph
          </button>
          <button
            onClick={() => setViewMode('leaflet')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'leaflet'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-emerald-800'
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
          nodes={effectiveNodes}
          edges={effectiveEdges}
          ambulances={effectiveAmbulances}
          hospitals={effectiveHospitals}
          incidents={effectiveIncidents}
          highlightedRoute={highlightedRoute}
          alternativeRoutes={alternativeRoutes}
          onEdgeClick={onEdgeClick}
          onNodeClick={onNodeClick}
          onHospitalClick={onHospitalClick}
          selectedHospitalId={selectedHospitalId}
          selectedNodeId={selectedNodeId}
        />
      ) : (
        <div className="h-[380px] sm:h-[480px] md:h-[550px] lg:h-[650px] w-full rounded-xl overflow-hidden border border-emerald-200 shadow-inner z-0 relative">
          <MapContainer
            center={center}
            zoom={14}
            scrollWheelZoom={true}
            className="h-full w-full bg-white"
          >
            {/* Light Carto basemap */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {/* Edge polylines */}
            {effectiveEdges.map((edge) => {
              const u = nodeMap.get(edge.fromNodeId || edge.from);
              const v = nodeMap.get(edge.toNodeId || edge.to);
              if (!u || !v) return null;

              const uLat = u.latitude || u.lat;
              const uLng = u.longitude || u.lng;
              const vLat = v.latitude || v.lat;
              const vLng = v.longitude || v.lng;
              if (!uLat || !uLng || !vLat || !vLng) return null;

              const isBlocked = edge.condition === 'BLOCKED';
              const isCongested = edge.condition === 'CONGESTED';
              const inRoute =
                highlightedRoute.includes(edge.fromNodeId || edge.from) &&
                highlightedRoute.includes(edge.toNodeId || edge.to);

              let color = '#94a3b8';
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
                color = '#059669';
                weight = 5;
              }

              return (
                <Polyline
                  key={edge.edgeId}
                  positions={[
                    [uLat, uLng],
                    [vLat, vLng]
                  ]}
                  pathOptions={{ color, weight, dashArray }}
                  eventHandlers={{
                    click: () => onEdgeClick && onEdgeClick(edge)
                  }}
                >
                  <Tooltip sticky>
                    <div className="text-xs font-sans">
                      <div className="font-bold text-emerald-950">Edge: {edge.edgeId}</div>
                      <div>From: {edge.fromNodeId || edge.from} → To: {edge.toNodeId || edge.to}</div>
                      <div>Base Cost: {edge.baseCost} km</div>
                      <div>Condition: <span className="font-semibold">{edge.condition}</span></div>
                      <div className="text-[10px] text-emerald-600 mt-1">Click to toggle road state</div>
                    </div>
                  </Tooltip>
                </Polyline>
              );
            })}

            {/* Road Network Nodes */}
            {effectiveNodes.map((node) => {
              const inRoute = highlightedRoute.includes(node.nodeId);
              const nLat = node.latitude || node.lat;
              const nLng = node.longitude || node.lng;
              if (!nLat || !nLng) return null;

              return (
                <CircleMarker
                  key={node.nodeId}
                  center={[nLat, nLng]}
                  radius={inRoute ? 6 : 4}
                  pathOptions={{
                    color: inRoute ? '#059669' : '#94a3b8',
                    fillColor: inRoute ? '#10b981' : '#ffffff',
                    fillOpacity: 0.9,
                    weight: 2
                  }}
                  eventHandlers={{
                    click: () => onNodeClick && onNodeClick(node)
                  }}
                >
                  <Tooltip direction="top" offset={[0, -5]}>
                    <div className="text-xs font-sans">
                      <div className="font-bold text-emerald-700">{node.nodeId}: {node.label}</div>
                      <div className="text-slate-600">Zone: {node.zone}</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* Hospital Markers on Leaflet Map */}
            {effectiveHospitals.map((h) => {
              const hNode = nodeMap.get(h.nodeId);
              if (!hNode) return null;
              const hLat = hNode.latitude || hNode.lat;
              const hLng = hNode.longitude || hNode.lng;
              if (!hLat || !hLng) return null;
              const isSelected = selectedHospitalId === h.hospitalId;

              return (
                <CircleMarker
                  key={h.hospitalId}
                  center={[hLat, hLng]}
                  radius={isSelected ? 12 : 9}
                  pathOptions={{
                    color: isSelected ? '#4338ca' : '#7c3aed',
                    fillColor: isSelected ? '#a855f7' : '#8b5cf6',
                    fillOpacity: 0.95,
                    weight: isSelected ? 4 : 2
                  }}
                  eventHandlers={{
                    click: () => onHospitalClick && onHospitalClick(h)
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]} permanent={isSelected}>
                    <div className="text-xs font-sans p-1">
                      <div className="font-bold text-purple-900 flex items-center gap-1">
                        🏥 {h.name}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Beds: <strong>{h.capacity?.availableBeds ?? h.availableBeds ?? 0}</strong> free • Status: <strong className="text-emerald-700">{h.status || 'OPEN'}</strong>
                      </div>
                      <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                        👉 Click to inspect hospital details
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* Incident Markers */}
            {effectiveIncidents.map((inc) => {
              const iNode = nodeMap.get(inc.locationNodeId || inc.nodeId);
              if (!iNode) return null;
              const iLat = iNode.latitude || iNode.lat;
              const iLng = iNode.longitude || iNode.lng;
              if (!iLat || !iLng) return null;

              return (
                <CircleMarker
                  key={inc.incidentId}
                  center={[iLat, iLng]}
                  radius={8}
                  pathOptions={{
                    color: '#dc2626',
                    fillColor: inc.severity === 'CRITICAL' || inc.severity === 'Critical' ? '#ef4444' : '#f59e0b',
                    fillOpacity: 1,
                    weight: 3
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]}>
                    <div className="text-xs font-sans">
                      <div className="font-bold text-red-700">🚨 {inc.incidentId} [{inc.severity}]</div>
                      <div>Type: {inc.type} • Patients: {inc.patientCount || 1}</div>
                      <div>Status: {inc.status}</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      )}

      {/* Persistent Visual Legend */}
      <div className="bg-white border border-emerald-200 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-700 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-slate-400 rounded"></span>
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
            <span className="w-3.5 h-1.5 bg-emerald-500 rounded-full shadow-sm"></span>
            <span>Optimal Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-purple-100 border border-purple-500 flex items-center justify-center font-bold text-[9px] text-purple-800 shadow-xs">H</span>
            <span className="font-semibold text-purple-900">Hospital (Click for Info)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-500 flex items-center justify-center font-bold text-[9px] text-emerald-800">A</span>
            <span>Ambulance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-red-100 border border-red-500 flex items-center justify-center font-bold text-[9px] text-red-700">!</span>
            <span>Emergency Incident</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Tip: Tap on any hospital name or marker to view real-time bed capacity and specialty capabilities.
        </div>
      </div>
    </div>
  );
}
