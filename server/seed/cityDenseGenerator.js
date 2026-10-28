import { createPRNG } from './prng.js';
import config from '../config/index.js';

/**
 * Calculates approximate Euclidean / Haversine distance in kilometers between two coordinates.
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * 111.0;
  const dLon = (lon2 - lon1) * 111.0 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const dist = Math.sqrt(dLat * dLat + dLon * dLon);
  return Math.round(dist * 100) / 100;
}

/**
 * Generates the "City-Dense" synthetic scenario deterministically.
 * Topology:
 *  - 1,520 nodes (38 rows × 40 columns) with organic coordinate jitter.
 *  - Circumferential outer Ring Road (arterial).
 *  - Two major diagonal arterial expressways.
 *  - River barrier with only 3 main bridges: West Bridge, Central Suspension Bridge, East Highway Bridge.
 *  - St. Jude River Island Sanctuary accessible solely via 1 causeway bridge.
 *  - Irregular blocks with dead-ends and cul-de-sacs.
 *  - Road classes: arterial, collector, local with derived base costs.
 *  - ~25 landmark nodes, 5 hospitals, 8 ambulances, 12 sample incidents.
 *  - 6 preset showcase pairs.
 */
export function generateCityDenseGraph(seed = 1337) {
  const prng = createPRNG(seed);
  const startTime = performance.now();

  const ROWS = 38;
  const COLS = 40;
  const vertexCount = ROWS * COLS; // 1,520 nodes

  const baseLat = 19.9800;
  const baseLon = 73.7500;
  const maxLat = 20.0200;
  const maxLon = 73.8100;

  const latStep = (maxLat - baseLat) / (ROWS - 1);
  const lonStep = (maxLon - baseLon) / (COLS - 1);

  const nodes = [];
  const nodeGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  // River & Bridge Topology
  const RIVER_NORTH_ROW = 18;
  const RIVER_ISLAND_ROW = 19;
  const RIVER_SOUTH_ROW = 20;

  const WEST_BRIDGE_COL = 8;
  const CENTRAL_BRIDGE_COL = 26;
  const EAST_BRIDGE_COL = 33;
  const ISLAND_COLS = [18, 19, 20, 21, 22];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c + 1;
      const nodeId = `CD-N-${String(idx).padStart(4, '0')}`;

      let lat = baseLat + r * latStep;
      let lon = baseLon + c * lonStep;

      // Jitter interior nodes for organic city layout
      const isBoundary = r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1;
      if (!isBoundary) {
        lat += (prng.next() - 0.5) * latStep * 0.45;
        lon += (prng.next() - 0.5) * lonStep * 0.45;
      }

      lat = Math.round(lat * 10000) / 10000;
      lon = Math.round(lon * 10000) / 10000;

      let zone = 'Local-Sector';
      if (isBoundary) {
        zone = 'Ring-Corridor';
      } else if (r === RIVER_ISLAND_ROW && ISLAND_COLS.includes(c)) {
        zone = 'River-Island';
      } else if (r < RIVER_NORTH_ROW) {
        zone = c < 20 ? 'Northwest-District' : 'Northeast-District';
      } else if (r > RIVER_SOUTH_ROW) {
        zone = c < 20 ? 'Southwest-District' : 'Southeast-District';
      } else {
        zone = 'Riverfront-Center';
      }

      const node = {
        nodeId,
        label: `City Node CD-${idx}`,
        latitude: lat,
        longitude: lon,
        zone,
        active: true,
        isSynthetic: true,
        scenario: 'city-dense',
        landmark: false,
        row: r,
        col: c
      };

      nodes.push(node);
      nodeGrid[r][c] = node;
    }
  }

  // 25 Key Landmarks
  const landmarkDefs = [
    { r: 0, c: 0, label: 'Northwest Ring Interchange' },
    { r: 0, c: 20, label: 'North Gateway Toll Plaza' },
    { r: 0, c: 39, label: 'Northeast Express Terminal' },
    { r: 37, c: 0, label: 'Southwest Freight Junction' },
    { r: 37, c: 20, label: 'South Ring Transit Center' },
    { r: 37, c: 39, label: 'Aerodrome Highway Terminal' },
    { r: 18, c: 8, label: 'West River Bridge (North Pier)' },
    { r: 20, c: 8, label: 'West River Bridge (South Pier)' },
    { r: 18, c: 26, label: 'Central Suspension Bridge (North)' },
    { r: 20, c: 26, label: 'Central Suspension Bridge (South)' },
    { r: 18, c: 33, label: 'East Highway Bridge (North)' },
    { r: 20, c: 33, label: 'East Highway Bridge (South)' },
    { r: 17, c: 20, label: 'Central Railway Station' },
    { r: 16, c: 22, label: 'Civic Center & City Hall' },
    { r: 10, c: 10, label: 'University North Campus' },
    { r: 8, c: 30, label: 'Highland Medical Park' },
    { r: 28, c: 12, label: 'Tech Valley Industrial Park' },
    { r: 30, c: 30, label: 'Eastport Maritime Logistics' },
    { r: 19, c: 20, label: 'St. Jude Island Sanctuary' },
    // 5 Hospitals
    { r: 15, c: 20, label: 'Mercy General Trauma Center (HOS-001)', hospitalId: 'CD-HOS-001' },
    { r: 18, c: 35, label: 'East Riverside Cardiac Hospital (HOS-002)', hospitalId: 'CD-HOS-002' },
    { r: 7, c: 32, label: 'Highland Specialty Hospital (HOS-003)', hospitalId: 'CD-HOS-003' },
    { r: 24, c: 6, label: 'Westside Emergency Pavilion (HOS-004)', hospitalId: 'CD-HOS-004' },
    { r: 19, c: 22, label: 'St. Jude Island Hospital (HOS-005)', hospitalId: 'CD-HOS-005' },
    // Ambulance Stations
    { r: 10, c: 12, label: 'Ambulance Station Alpha (AMB-001)', ambulanceId: 'CD-AMB-001' },
    { r: 17, c: 21, label: 'Ambulance Station Beta (AMB-002)', ambulanceId: 'CD-AMB-002' },
    { r: 27, c: 10, label: 'Ambulance Station Gamma (AMB-003)', ambulanceId: 'CD-AMB-003' }
  ];

  for (const lm of landmarkDefs) {
    const node = nodeGrid[lm.r][lm.c];
    if (node) {
      node.label = lm.label;
      node.landmark = true;
      if (lm.hospitalId) node.hospitalId = lm.hospitalId;
      if (lm.ambulanceId) node.ambulanceId = lm.ambulanceId;
    }
  }

  // Generate Edges
  const edges = [];
  const edgeSet = new Set();
  let edgeCounter = 1;

  function addBidirectionalEdge(uNode, vNode, roadClass, roadName, customCost = null, condition = 'NORMAL') {
    const u = uNode.nodeId;
    const v = vNode.nodeId;
    const keyUV = `${u}->${v}`;
    const keyVU = `${v}->${u}`;

    if (edgeSet.has(keyUV) || edgeSet.has(keyVU)) return;

    const dist = calculateDistanceKm(uNode.latitude, uNode.longitude, vNode.latitude, vNode.longitude);
    const speedMultiplier = roadClass === 'arterial' ? 0.75 : roadClass === 'collector' ? 1.0 : 1.4;
    const cost = customCost !== null ? customCost : Math.max(0.15, Math.round(dist * speedMultiplier * 100) / 100);

    const isCongested = condition === 'CONGESTED';
    const multiplier = isCongested ? 2.5 : 1.0;

    // Forward edge
    const id1 = `CD-E-${String(edgeCounter++).padStart(5, '0')}`;
    edges.push({
      edgeId: id1,
      fromNodeId: u,
      toNodeId: v,
      baseCost: cost,
      condition,
      multiplier,
      roadClass,
      roadName,
      active: true,
      isSynthetic: true,
      scenario: 'city-dense'
    });
    edgeSet.add(keyUV);

    // Reverse edge
    const id2 = `CD-E-${String(edgeCounter++).padStart(5, '0')}`;
    edges.push({
      edgeId: id2,
      fromNodeId: v,
      toNodeId: u,
      baseCost: cost,
      condition,
      multiplier,
      roadClass,
      roadName,
      active: true,
      isSynthetic: true,
      scenario: 'city-dense'
    });
    edgeSet.add(keyVU);
  }

  // 1. OUTER RING ROAD (Arterial Perimeter)
  for (let c = 0; c < COLS - 1; c++) {
    addBidirectionalEdge(nodeGrid[0][c], nodeGrid[0][c + 1], 'arterial', 'North Ring Expressway');
    addBidirectionalEdge(nodeGrid[ROWS - 1][c], nodeGrid[ROWS - 1][c + 1], 'arterial', 'South Ring Expressway');
  }
  for (let r = 0; r < ROWS - 1; r++) {
    addBidirectionalEdge(nodeGrid[r][0], nodeGrid[r + 1][0], 'arterial', 'West Ring Parkway');
    addBidirectionalEdge(nodeGrid[r][COLS - 1], nodeGrid[r + 1][COLS - 1], 'arterial', 'East Ring Parkway');
  }

  // 2. DIAGONAL ARTERIAL ROADS
  for (let k = 2; k < 18; k += 2) {
    addBidirectionalEdge(nodeGrid[k][k], nodeGrid[k + 2][k + 2], 'arterial', 'Grand Boulevard Diagonal');
  }
  for (let k = 20; k < 36; k += 2) {
    if (k + 2 < ROWS && k + 2 < COLS) {
      addBidirectionalEdge(nodeGrid[k][k], nodeGrid[k + 2][k + 2], 'arterial', 'Metro Parkway Diagonal');
    }
  }

  // 3. BRIDGES OVER RIVER
  // West River Bridge
  addBidirectionalEdge(nodeGrid[RIVER_NORTH_ROW][WEST_BRIDGE_COL], nodeGrid[RIVER_ISLAND_ROW][WEST_BRIDGE_COL], 'arterial', 'West River Bridge Approach');
  addBidirectionalEdge(nodeGrid[RIVER_ISLAND_ROW][WEST_BRIDGE_COL], nodeGrid[RIVER_SOUTH_ROW][WEST_BRIDGE_COL], 'arterial', 'West River Bridge Span');

  // Central Suspension Bridge
  addBidirectionalEdge(nodeGrid[RIVER_NORTH_ROW][CENTRAL_BRIDGE_COL], nodeGrid[RIVER_ISLAND_ROW][CENTRAL_BRIDGE_COL], 'arterial', 'Central Suspension Bridge North');
  addBidirectionalEdge(nodeGrid[RIVER_ISLAND_ROW][CENTRAL_BRIDGE_COL], nodeGrid[RIVER_SOUTH_ROW][CENTRAL_BRIDGE_COL], 'arterial', 'Central Suspension Bridge South');

  // East Highway Bridge
  addBidirectionalEdge(nodeGrid[RIVER_NORTH_ROW][EAST_BRIDGE_COL], nodeGrid[RIVER_ISLAND_ROW][EAST_BRIDGE_COL], 'arterial', 'East Highway Bridge North');
  addBidirectionalEdge(nodeGrid[RIVER_ISLAND_ROW][EAST_BRIDGE_COL], nodeGrid[RIVER_SOUTH_ROW][EAST_BRIDGE_COL], 'arterial', 'East Highway Bridge South');

  // 4. ST. JUDE RIVER ISLAND & CAUSEWAY BRIDGE
  for (let c = 18; c < 22; c++) {
    addBidirectionalEdge(nodeGrid[RIVER_ISLAND_ROW][c], nodeGrid[RIVER_ISLAND_ROW][c + 1], 'local', 'Sanctuary Island Path');
  }
  // Single bridge connecting River Island to North Bank
  addBidirectionalEdge(nodeGrid[RIVER_NORTH_ROW][20], nodeGrid[RIVER_ISLAND_ROW][20], 'collector', 'St. Jude Island Causeway Bridge');

  // 5. REGULAR STREET NETWORK (Probabilistic for irregular blocks & dead ends)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const u = nodeGrid[r][c];
      const isRiverBarrier = (r === RIVER_NORTH_ROW && r + 1 === RIVER_ISLAND_ROW) ||
                             (r === RIVER_ISLAND_ROW && r + 1 === RIVER_SOUTH_ROW);

      // Horizontal connection to (r, c + 1)
      if (c + 1 < COLS) {
        const v = nodeGrid[r][c + 1];
        const isIslandRow = r === RIVER_ISLAND_ROW;
        const validHorizontal = !isIslandRow || (ISLAND_COLS.includes(c) && ISLAND_COLS.includes(c + 1));

        if (validHorizontal) {
          const isMajor = r % 6 === 0 || r === 0 || r === ROWS - 1;
          const keep = isMajor || prng.next() < 0.65;
          if (keep) {
            const roadClass = isMajor ? 'collector' : 'local';
            const name = isMajor ? `Avenue ${r + 1}` : `Street ${r + 1}-${c + 1}`;
            addBidirectionalEdge(u, v, roadClass, name);
          }
        }
      }

      // Vertical connection to (r + 1, c)
      if (r + 1 < ROWS && !isRiverBarrier) {
        const v = nodeGrid[r + 1][c];
        const isMajor = c % 6 === 0 || c === 0 || c === COLS - 1;
        const keep = isMajor || prng.next() < 0.63;
        if (keep) {
          const roadClass = isMajor ? 'collector' : 'local';
          const name = isMajor ? `Boulevard ${c + 1}` : `Lane ${r + 1}-${c + 1}`;
          addBidirectionalEdge(u, v, roadClass, name);
        }
      }
    }
  }

  // 6. CONNECTIVITY GUARANTEE
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.fromNodeId)) adj.set(e.fromNodeId, []);
    adj.get(e.fromNodeId).push(e.toNodeId);
  }

  const visited = new Set();
  const queue = [nodes[0].nodeId];
  visited.add(nodes[0].nodeId);

  while (queue.length > 0) {
    const curr = queue.shift();
    const neighbors = adj.get(curr) || [];
    for (const nbr of neighbors) {
      if (!visited.has(nbr)) {
        visited.add(nbr);
        queue.push(nbr);
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.nodeId)) {
      const r = node.row;
      const c = node.col;
      const candidates = [
        r > 0 ? nodeGrid[r - 1][c] : null,
        r + 1 < ROWS ? nodeGrid[r + 1][c] : null,
        c > 0 ? nodeGrid[r][c - 1] : null,
        c + 1 < COLS ? nodeGrid[r][c + 1] : null
      ].filter(Boolean);

      for (const cand of candidates) {
        if ((r === RIVER_NORTH_ROW && cand.row === RIVER_ISLAND_ROW) ||
            (r === RIVER_ISLAND_ROW && cand.row === RIVER_SOUTH_ROW)) {
          continue;
        }
        addBidirectionalEdge(node, cand, 'local', 'Connector Lane');
        visited.add(node.nodeId);
        break;
      }
    }
  }

  // Find the exact Causeway Bridge edge ID for the island
  const causewayBridgeEdge = edges.find(e => e.roadName === 'St. Jude Island Causeway Bridge');

  // 6 Preset Showcase Pairs
  const showcasePairs = [
    {
      id: 'pair-short',
      name: 'Short Neighborhood Transit',
      description: 'Quick local dispatch through residential grid streets in Northwest district (~1.2 km).',
      sourceNodeId: 'CD-N-0105',
      destinationNodeId: 'CD-N-0148',
      category: 'short'
    },
    {
      id: 'pair-medium',
      name: 'Medium Commercial Corridor',
      description: 'Route from North University Campus across arterial boulevards to Civic Center (~4.8 km).',
      sourceNodeId: 'CD-N-0410',
      destinationNodeId: 'CD-N-0662',
      category: 'medium'
    },
    {
      id: 'pair-long',
      name: 'Long City Cross-Transit',
      description: 'Long-distance transit from Northwest Ring Plaza across the city to Southeast Ring (~11.5 km).',
      sourceNodeId: 'CD-N-0001',
      destinationNodeId: 'CD-N-1520',
      category: 'long'
    },
    {
      id: 'pair-river',
      name: 'Trans-River Crossing',
      description: 'Route from North District across the river to South Hospital Hub, forcing bridge traversal (~6.2 km).',
      sourceNodeId: 'CD-N-0490',
      destinationNodeId: 'CD-N-1100',
      category: 'across-river'
    },
    {
      id: 'pair-deadend',
      name: 'Dead-End Cul-de-Sac Maze',
      description: 'Origin placed deep inside a maze of disconnected local street dead-ends requiring path backtracking (~3.4 km).',
      sourceNodeId: 'CD-N-0895',
      destinationNodeId: 'CD-N-0660',
      category: 'near-dead-end'
    },
    {
      id: 'pair-unreachable',
      name: 'St. Jude Island (Bridge Block Cutoff)',
      description: 'Target is on St. Jude Island. When the St. Jude Causeway Bridge is BLOCKED, destination becomes isolated and unreachable.',
      sourceNodeId: 'CD-N-0660',
      destinationNodeId: 'CD-N-0782',
      bridgeEdgeId: causewayBridgeEdge ? causewayBridgeEdge.edgeId : 'CD-E-00055',
      category: 'unreachable-when-bridge-blocked'
    }
  ];

  // 5 Hospitals on City-Dense nodes
  const hospitals = [
    {
      hospitalId: 'CD-HOS-001',
      name: 'Mercy General Trauma Center (City-Dense)',
      nodeId: 'CD-N-0620',
      capabilities: ['trauma-care', 'cardiac-monitor', 'burn-unit', 'advanced-life-support', 'pediatric-support'],
      capacity: 50,
      availableSlots: 14,
      status: 'NORMAL_OPS',
      scenario: 'city-dense',
      isSynthetic: true
    },
    {
      hospitalId: 'CD-HOS-002',
      name: 'East Riverside Cardiac Hospital (City-Dense)',
      nodeId: 'CD-N-0755',
      capabilities: ['cardiac-monitor', 'advanced-life-support', 'ventilator'],
      capacity: 35,
      availableSlots: 6,
      status: 'NORMAL_OPS',
      scenario: 'city-dense',
      isSynthetic: true
    },
    {
      hospitalId: 'CD-HOS-003',
      name: 'Highland Specialty Hospital (City-Dense)',
      nodeId: 'CD-N-0312',
      capabilities: ['pediatric-support', 'ventilator', 'advanced-life-support'],
      capacity: 25,
      availableSlots: 8,
      status: 'NORMAL_OPS',
      scenario: 'city-dense',
      isSynthetic: true
    },
    {
      hospitalId: 'CD-HOS-004',
      name: 'Westside Emergency Pavilion (City-Dense)',
      nodeId: 'CD-N-0966',
      capabilities: ['burn-unit', 'trauma-care', 'basic-life-support'],
      capacity: 40,
      availableSlots: 0,
      status: 'AT_CAPACITY',
      scenario: 'city-dense',
      isSynthetic: true
    },
    {
      hospitalId: 'CD-HOS-005',
      name: 'St. Jude Island Sanctuary Hospital (City-Dense)',
      nodeId: 'CD-N-0782',
      capabilities: ['trauma-care', 'cardiac-monitor', 'advanced-life-support'],
      capacity: 20,
      availableSlots: 5,
      status: 'NORMAL_OPS',
      scenario: 'city-dense',
      isSynthetic: true
    }
  ];

  // 8 Ambulances stationed across City-Dense
  const ambulances = [
    {
      ambulanceId: 'CD-AMB-001',
      label: 'City Medic One (ALS Unit)',
      currentNodeId: 'CD-N-0412',
      status: 'AVAILABLE',
      vehicleType: 'ALS',
      capabilities: ['basic-life-support', 'advanced-life-support', 'ventilator', 'cardiac-monitor'],
      utilizationRate: 0.15,
      reliabilityScore: 0.98,
      totalDispatches: 20,
      scenario: 'city-dense',
      isSynthetic: true
    },
    {
      ambulanceId: 'CD-AMB-002',
      label: 'Rapid Response BLS-A',
      currentNodeId: 'CD-N-0701',
      status: 'AVAILABLE',
      vehicleType: 'BLS',
      capabilities: ['basic-life-support'],
      utilizationRate: 0.28,
      reliabilityScore: 0.95,
      totalDispatches: 25,
      scenario: 'city-dense',
      isSynthetic: true
    },
    {
      ambulanceId: 'CD-AMB-003',
      label: 'Critical Mobile ICU-Alpha',
      currentNodeId: 'CD-N-1090',
      status: 'AVAILABLE',
      vehicleType: 'ICU-mobile',
      capabilities: ['basic-life-support', 'advanced-life-support', 'ventilator', 'cardiac-monitor'],
      utilizationRate: 0.35,
      reliabilityScore: 0.94,
      totalDispatches: 32,
      scenario: 'city-dense',
      isSynthetic: true
    },
    {
      ambulanceId: 'CD-AMB-004',
      label: 'Specialty Neonatal Unit',
      currentNodeId: 'CD-N-0210',
      status: 'AVAILABLE',
      vehicleType: 'neonatal',
      capabilities: ['basic-life-support', 'advanced-life-support', 'neonatal-care', 'ventilator'],
      utilizationRate: 0.12,
      reliabilityScore: 0.99,
      totalDispatches: 15,
      scenario: 'city-dense',
      isSynthetic: true
    },
    {
      ambulanceId: 'CD-AMB-005',
      label: 'City Medic Five (ALS Unit)',
      currentNodeId: 'CD-N-0850',
      status: 'AVAILABLE',
      vehicleType: 'ALS',
      capabilities: ['basic-life-support', 'advanced-life-support', 'cardiac-monitor'],
      utilizationRate: 0.22,
      reliabilityScore: 0.96,
      totalDispatches: 27,
      scenario: 'city-dense',
      isSynthetic: true
    },
    {
      ambulanceId: 'CD-AMB-006',
      label: 'South Metro BLS-B',
      currentNodeId: 'CD-N-1340',
      status: 'AVAILABLE',
      vehicleType: 'BLS',
      capabilities: ['basic-life-support'],
      utilizationRate: 0.30,
      reliabilityScore: 0.92,
      totalDispatches: 30,
      scenario: 'city-dense',
      isSynthetic: true
    },
    {
      ambulanceId: 'CD-AMB-007',
      label: 'Downtown Rapid Responder',
      currentNodeId: 'CD-N-0560',
      status: 'AVAILABLE',
      vehicleType: 'ALS',
      capabilities: ['basic-life-support', 'advanced-life-support', 'ventilator'],
      utilizationRate: 0.18,
      reliabilityScore: 0.97,
      totalDispatches: 22,
      scenario: 'city-dense',
      isSynthetic: true
    },
    {
      ambulanceId: 'CD-AMB-008',
      label: 'Airport & Highway Standby',
      currentNodeId: 'CD-N-1200',
      status: 'AVAILABLE',
      vehicleType: 'ICU-mobile',
      capabilities: ['basic-life-support', 'advanced-life-support', 'ventilator', 'cardiac-monitor'],
      utilizationRate: 0.25,
      reliabilityScore: 0.95,
      totalDispatches: 28,
      scenario: 'city-dense',
      isSynthetic: true
    }
  ];

  // 12 Sample Incidents across City-Dense
  const incidentDefs = [
    { id: 'CD-INC-001', type: 'cardiac arrest', sev: 'CRITICAL', node: 'CD-N-0640', desc: 'Patient in acute ventricular fibrillation' },
    { id: 'CD-INC-002', type: 'road accident', sev: 'CRITICAL', node: 'CD-N-0020', desc: 'Multi-vehicle collision on North Ring Expressway' },
    { id: 'CD-INC-003', type: 'burns', sev: 'HIGH', node: 'CD-N-1120', desc: 'Chemical burn exposure in South Industrial corridor' },
    { id: 'CD-INC-004', type: 'breathing difficulty', sev: 'MEDIUM', node: 'CD-N-0415', desc: 'Severe asthma crisis in University neighborhood' },
    { id: 'CD-INC-005', type: 'stroke', sev: 'CRITICAL', node: 'CD-N-0760', desc: 'Sudden onset hemiparesis and speech loss' },
    { id: 'CD-INC-006', type: 'fall from height', sev: 'HIGH', node: 'CD-N-0950', desc: 'Construction site accident with suspected pelvic fracture' },
    { id: 'CD-INC-007', type: 'allergic reaction', sev: 'MEDIUM', node: 'CD-N-0230', desc: 'Anaphylaxis incident requiring epinephrine' },
    { id: 'CD-INC-008', type: 'diabetic emergency', sev: 'LOW', node: 'CD-N-1400', desc: 'Hypoglycemic episode responsive to oral glucose' },
    { id: 'CD-INC-009', type: 'pediatric seizure', sev: 'CRITICAL', node: 'CD-N-0320', desc: 'Prolonged febrile seizure in infant' },
    { id: 'CD-INC-010', type: 'industrial explosion', sev: 'CRITICAL', node: 'CD-N-1500', desc: 'Boiler pressure failure with multiple casualties' },
    { id: 'CD-INC-011', type: 'cardiac chest pain', sev: 'HIGH', node: 'CD-N-0780', desc: 'Crushing retrosternal chest pain radiating to left arm' },
    { id: 'CD-INC-012', type: 'laceration', sev: 'LOW', node: 'CD-N-0150', desc: 'Deep glass cut requiring suturing and dressing' }
  ];

  const incidents = incidentDefs.map((def, i) => ({
    incidentId: def.id,
    type: def.type,
    severity: def.sev,
    locationNodeId: def.node,
    description: def.desc,
    status: 'REGISTERED',
    requiredCapabilities: def.sev === 'CRITICAL' ? ['advanced-life-support', 'cardiac-monitor'] : ['basic-life-support'],
    assignedAmbulanceId: null,
    destinationHospitalId: null,
    scenario: 'city-dense',
    createdAt: new Date(1730000000000 - (12 - i) * 60000),
    isSynthetic: true
  }));

  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    nodes,
    edges,
    hospitals,
    ambulances,
    incidents,
    showcasePairs,
    vertexCount: nodes.length,
    edgeCount: edges.length,
    durationMs
  };
}

export default generateCityDenseGraph;
