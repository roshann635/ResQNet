import fs from 'fs';
import path from 'path';

const allNodes = JSON.parse(fs.readFileSync('data/graph/nodes.json', 'utf8'));
const allEdges = JSON.parse(fs.readFileSync('data/graph/edges.json', 'utf8'));
const allHospitals = JSON.parse(fs.readFileSync('data/hospitals/hospitals.json', 'utf8'));
const allAmbulances = JSON.parse(fs.readFileSync('data/ambulances/ambulances.json', 'utf8')).slice(0, 30);
const allIncidents = JSON.parse(fs.readFileSync('data/incidents/incidents_active.json', 'utf8'));

// 1. Identify all key nodes from hospitals, ambulances, and incidents
const keyNodeIds = new Set();
allHospitals.forEach(h => keyNodeIds.add(h.nodeId));
allAmbulances.forEach(a => {
  if (a.currentNodeId) keyNodeIds.add(a.currentNodeId);
  if (a.baseStationNodeId) keyNodeIds.add(a.baseStationNodeId);
});
allIncidents.forEach(i => {
  if (i.locationNodeId) keyNodeIds.add(i.locationNodeId);
});

console.log('Total key nodes required:', keyNodeIds.size);

// 2. Expand network with connected edges and neighbors (2 hops)
const selectedNodeIds = new Set(keyNodeIds);

// Hop 1
allEdges.forEach(e => {
  if (keyNodeIds.has(e.fromNodeId) || keyNodeIds.has(e.toNodeId)) {
    selectedNodeIds.add(e.fromNodeId);
    selectedNodeIds.add(e.toNodeId);
  }
});

// Hop 2 (limit to keep size reasonable)
let hop2Count = 0;
allEdges.forEach(e => {
  if ((selectedNodeIds.has(e.fromNodeId) || selectedNodeIds.has(e.toNodeId)) && hop2Count < 400) {
    if (!selectedNodeIds.has(e.fromNodeId) || !selectedNodeIds.has(e.toNodeId)) {
      selectedNodeIds.add(e.fromNodeId);
      selectedNodeIds.add(e.toNodeId);
      hop2Count++;
    }
  }
});

console.log('Total nodes selected for fallback:', selectedNodeIds.size);

// 3. Filter nodes
const nodeMap = new Map();
allNodes.forEach(n => nodeMap.set(n.nodeId, n));

const fallbackNodes = [];
selectedNodeIds.forEach(id => {
  const node = nodeMap.get(id);
  if (node) {
    fallbackNodes.push({
      nodeId: node.nodeId,
      label: node.label || `Vertex ${node.nodeId}`,
      lat: node.lat || node.latitude || 19.98,
      lng: node.lng || node.longitude || 73.78,
      latitude: node.lat || node.latitude || 19.98,
      longitude: node.lng || node.longitude || 73.78,
      zone: node.zone || 'Central',
      type: node.type || 'intersection',
      active: true
    });
  }
});

// 4. Filter edges connecting selected nodes
const validNodeIdSet = new Set(fallbackNodes.map(n => n.nodeId));
const fallbackEdges = allEdges
  .filter(e => validNodeIdSet.has(e.fromNodeId) && validNodeIdSet.has(e.toNodeId))
  .slice(0, 1200)
  .map(e => ({
    edgeId: e.edgeId,
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    distanceM: e.distanceM || 300,
    baseCost: e.baseCost || 20,
    roadClass: e.roadClass || 'primary',
    speedLimit: e.speedLimit || 50,
    oneWay: Boolean(e.oneWay),
    condition: e.condition || 'normal',
    multiplier: e.multiplier || 1.0,
    active: true
  }));

console.log('Total edges selected for fallback:', fallbackEdges.length);

// 5. Ensure at least one bridge edge exists with easy identifier
if (!fallbackEdges.find(e => e.edgeId === 'E-39-40')) {
  const firstEdge = fallbackEdges[0];
  if (firstEdge) {
    fallbackEdges.unshift({
      edgeId: 'E-39-40',
      fromNodeId: firstEdge.fromNodeId,
      toNodeId: firstEdge.toNodeId,
      distanceM: 450,
      baseCost: 28,
      roadClass: 'bridge',
      speedLimit: 40,
      oneWay: false,
      condition: 'normal',
      multiplier: 1.0,
      active: true
    });
  }
}

// 6. Build file content
const output = `// Auto-generated offline fallback data for resilient rendering
export const fallbackNodes = ${JSON.stringify(fallbackNodes, null, 2)};

export const fallbackEdges = ${JSON.stringify(fallbackEdges, null, 2)};

export const fallbackHospitals = ${JSON.stringify(allHospitals, null, 2)};

export const fallbackAmbulances = ${JSON.stringify(allAmbulances, null, 2)};

export const fallbackIncidents = ${JSON.stringify(allIncidents, null, 2)};

export function getFallbackRecommendation(incidentId = 'INC-001') {
  const incident = fallbackIncidents.find((i) => i.incidentId === incidentId) || fallbackIncidents[0];
  const targetNode = incident?.locationNodeId || 'N-0419';

  // Find nearest or first available ambulance
  const ambulance = fallbackAmbulances.find((a) => a.status === 'Available') || fallbackAmbulances[0];
  const hospital = fallbackHospitals.find((h) => (h.availableBeds || h.capacity?.availableBeds || 0) > 0) || fallbackHospitals[0];

  // Build route path connecting nodes
  const ambNode = ambulance?.currentNodeId || fallbackNodes[0]?.nodeId;
  const hospNode = hospital?.nodeId || fallbackNodes[1]?.nodeId;

  // Intermediate path
  const path = [ambNode, targetNode, hospNode].filter(Boolean);

  const rawRouteCost = 3.65;
  const totalScore = 0.175;

  return {
    incident: {
      incidentId: incident.incidentId,
      type: incident.type,
      severity: incident.severity,
      locationNodeId: incident.locationNodeId,
      description: incident.description,
      status: incident.status,
      requiredCapabilities: incident.requiredCapabilities || ['advanced-life-support']
    },
    graphVersion: 1,
    ambulanceSelection: {
      incidentId: incident.incidentId,
      bestCandidate: {
        ambulanceId: ambulance.ambulanceId,
        callSign: ambulance.callSign || ambulance.ambulanceId,
        label: ambulance.callSign || ambulance.ambulanceId,
        type: ambulance.type || 'ALS',
        vehicleType: ambulance.type || 'ALS',
        currentNodeId: ambNode,
        capabilities: ambulance.capabilities || ['advanced-life-support'],
        fuelPct: ambulance.fuelPct ?? 0.88,
        crewFatigue: 2,
        score: totalScore,
        totalScore: totalScore,
        routeCost: rawRouteCost,
        etaMinutes: 4.8,
        breakdown: {
          rawRouteCost,
          normalizedRouteCost: 0.26,
          weightedRouteCost: 0.104,
          utilizationPenalty: 0.12,
          weightedUtilization: 0.03,
          capabilityMismatchPenalty: 0.0,
          weightedCapability: 0.0,
          reliabilityPenalty: 0.27,
          weightedReliability: 0.041
        },
        route: {
          path,
          cost: rawRouteCost,
          distanceM: 3650,
          hops: path.length - 1
        }
      },
      candidates: [
        {
          ambulanceId: ambulance.ambulanceId,
          callSign: ambulance.callSign || ambulance.ambulanceId,
          type: ambulance.type || 'ALS',
          vehicleType: ambulance.type || 'ALS',
          currentNodeId: ambNode,
          totalScore: totalScore,
          routeCost: rawRouteCost
        }
      ],
      rejected: []
    },
    hospitalSelection: {
      bestHospital: {
        hospitalId: hospital.hospitalId,
        name: hospital.name,
        nodeId: hospNode,
        routeCost: 2.84,
        availableSlots: hospital.availableBeds || hospital.capacity?.availableBeds || 15,
        route: {
          path: [targetNode, hospNode],
          cost: 2.84
        }
      },
      eligibleHospitals: [hospital],
      excludedHospitals: []
    },
    isActionable: true
  };
}
`;

fs.writeFileSync('client/src/data/mockMapData.js', output, 'utf8');
console.log('Successfully wrote client/src/data/mockMapData.js');
