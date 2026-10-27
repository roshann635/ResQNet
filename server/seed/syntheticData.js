import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import { createPRNG } from './prng.js';

/**
 * Calculates approximate Euclidean / Haversine-based distance between two coordinates in kilometers.
 * Scaled for small simulated city grid.
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * 111.0; // ~111 km per degree latitude
  const dLon = (lon2 - lon1) * 111.0 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const dist = Math.sqrt(dLat * dLat + dLon * dLon);
  return Math.round(dist * 100) / 100;
}

/**
 * Generates the full synthetic scenario dataset deterministically.
 */
export async function generateSyntheticData(seed = config.prng.seed, referenceDate = new Date(1730000000000)) {
  const prng = createPRNG(seed);
  const now = referenceDate;

  // 1. GENERATE USERS (Deterministic hashes for reproducible seeding)
  const adminPasswordHash = '$2a$10$Ti8qReRLcS5O8jXdl3xjV.zTSypJTRHUhG3FD40mpPURyiUNUkf1C';
  const evaluatorPasswordHash = '$2a$10$Ti8qReRLcS5O8jXdl3xjV.xjo8i0a.CYE1RVXgLLFJYF2LNxdq6Gi';

  const users = [
    {
      userId: 'USR-001',
      displayName: 'Lead Dispatcher (Demo)',
      email: 'admin@resqnet.test',
      passwordHash: adminPasswordHash,
      role: 'admin',
      active: true,
      createdAt: new Date(now.getTime() - 14 * 86400000),
      isSynthetic: true
    },
    {
      userId: 'USR-002',
      displayName: 'Academic Evaluator (Demo)',
      email: 'evaluator@resqnet.test',
      passwordHash: evaluatorPasswordHash,
      role: 'evaluator',
      active: true,
      createdAt: new Date(now.getTime() - 14 * 86400000),
      isSynthetic: true
    }
  ];

  // 2. GENERATE 40 ROAD NODES across 6 Zones
  // Anchored around 19.9900°N, 73.7800°E (Illustrative academic coordinates)
  const nodeDefs = [
    // Campus Zone (N-01 to N-06)
    { id: 'N-01', label: 'Campus Main Gate', lat: 19.9920, lon: 73.7780, zone: 'Campus' },
    { id: 'N-02', label: 'Engineering Quad', lat: 19.9935, lon: 73.7795, zone: 'Campus' },
    { id: 'N-03', label: 'Science Complex', lat: 19.9950, lon: 73.7810, zone: 'Campus' },
    { id: 'N-04', label: 'Sports Arena Crossing', lat: 19.9930, lon: 73.7750, zone: 'Campus' },
    { id: 'N-05', label: 'Student Union Hub', lat: 19.9910, lon: 73.7765, zone: 'Campus' },
    { id: 'N-06', label: 'University North Avenue', lat: 19.9960, lon: 73.7785, zone: 'Campus' },

    // North Zone (N-07 to N-12)
    { id: 'N-07', label: 'Ring Road North Junction', lat: 19.9980, lon: 73.7820, zone: 'North' },
    { id: 'N-08', label: 'Highland Medical Park', lat: 20.0010, lon: 73.7835, zone: 'North' }, // Site of HOS-003
    { id: 'N-09', label: 'North Suburb Terminal', lat: 20.0030, lon: 73.7805, zone: 'North' },
    { id: 'N-10', label: 'Green Hills Rotary', lat: 19.9995, lon: 73.7770, zone: 'North' },
    { id: 'N-11', label: 'Valley Highway Crossing', lat: 20.0020, lon: 73.7740, zone: 'North' },
    { id: 'N-12', label: 'North Express Toll Plaza', lat: 20.0045, lon: 73.7775, zone: 'North' },

    // Central Zone (N-13 to N-19)
    { id: 'N-13', label: 'Station Road Crossing', lat: 19.9890, lon: 73.7810, zone: 'Central' },
    { id: 'N-14', label: 'Central Market Square', lat: 19.9870, lon: 73.7825, zone: 'Central' },
    { id: 'N-15', label: 'Metro Civic Center', lat: 19.9855, lon: 73.7845, zone: 'Central' }, // Site of HOS-001
    { id: 'N-16', label: 'Grand Boulevard Circle', lat: 19.9840, lon: 73.7820, zone: 'Central' },
    { id: 'N-17', label: 'Commercial Exchange', lat: 19.9860, lon: 73.7795, zone: 'Central' },
    { id: 'N-18', label: 'Old City Clock Tower', lat: 19.9880, lon: 73.7785, zone: 'Central' },
    { id: 'N-19', label: 'Heritage Arcade Corner', lat: 19.9835, lon: 73.7780, zone: 'Central' },

    // West Zone (N-20 to N-26)
    { id: 'N-20', label: 'West Industrial Gate', lat: 19.9860, lon: 73.7720, zone: 'West' },
    { id: 'N-21', label: 'Tech Park Avenue', lat: 19.9885, lon: 73.7735, zone: 'West' },
    { id: 'N-22', label: 'Westside Community Center', lat: 19.9840, lon: 73.7700, zone: 'West' }, // Site of HOS-004
    { id: 'N-23', label: 'Freight Corridor Fork', lat: 19.9810, lon: 73.7690, zone: 'West' },
    { id: 'N-24', label: 'Sunset Highway Interchange', lat: 19.9790, lon: 73.7725, zone: 'West' },
    { id: 'N-25', label: 'Lakeview Suburb Terminal', lat: 19.9820, lon: 73.7745, zone: 'West' },
    { id: 'N-26', label: 'Reservoir Overlook Pass', lat: 19.9800, lon: 73.7660, zone: 'West' },

    // East Zone (N-27 to N-32)
    { id: 'N-27', label: 'Riverfront Promenade North', lat: 19.9910, lon: 73.7870, zone: 'East' },
    { id: 'N-28', label: 'East Riverside Hospital Hub', lat: 19.9880, lon: 73.7895, zone: 'East' }, // Site of HOS-002
    { id: 'N-29', label: 'East Bridge Approach', lat: 19.9850, lon: 73.7885, zone: 'East' },
    { id: 'N-30', label: 'Port Authority Crossing', lat: 19.9820, lon: 73.7910, zone: 'East' },
    { id: 'N-31', label: 'Maritime Logistics Park', lat: 19.9790, lon: 73.7925, zone: 'East' },
    { id: 'N-32', label: 'Old Wharf Corner', lat: 19.9800, lon: 73.7880, zone: 'East' },

    // South Zone (N-33 to N-38)
    { id: 'N-33', label: 'South Boulevard Flyover', lat: 19.9805, lon: 73.7815, zone: 'South' },
    { id: 'N-34', label: 'Metro Stadium Plaza', lat: 19.9775, lon: 73.7830, zone: 'South' },
    { id: 'N-35', label: 'South Transit Central', lat: 19.9750, lon: 73.7805, zone: 'South' },
    { id: 'N-36', label: 'Airport Connector West', lat: 19.9730, lon: 73.7770, zone: 'South' },
    { id: 'N-37', label: 'Aerodrome Highway Junction', lat: 19.9720, lon: 73.7840, zone: 'South' },
    { id: 'N-38', label: 'South Industrial Spur', lat: 19.9700, lon: 73.7810, zone: 'South' },

    // Island / Bottleneck Zone (N-39, N-40)
    { id: 'N-39', label: 'St. Jude Causeway South', lat: 19.9675, lon: 73.7825, zone: 'South' },
    { id: 'N-40', label: 'St. Jude Island Sanctuary', lat: 19.9630, lon: 73.7845, zone: 'South' } // Site of HOS-005 (Bottleneck target!)
  ];

  const roadNodes = nodeDefs.map((def) => ({
    nodeId: def.id,
    label: def.label,
    latitude: def.lat,
    longitude: def.lon,
    zone: def.zone,
    active: true,
    isSynthetic: true
  }));

  const nodeMap = new Map();
  roadNodes.forEach((n) => nodeMap.set(n.nodeId, n));

  // 3. GENERATE 55 BIDIRECTIONAL ROAD PAIRS (110 DIRECTED EDGES)
  // Designed with cycles, alternate paths, pre-set congested edges, and a designated bottleneck bridge.
  const rawPairs = [
    // Campus internal & links
    ['N-01', 'N-02'],
    ['N-02', 'N-03'],
    ['N-03', 'N-06'],
    ['N-01', 'N-05'],
    ['N-05', 'N-04'],
    ['N-04', 'N-02'], // Cycle 1 in campus
    ['N-05', 'N-18'], // Campus to Central
    ['N-01', 'N-13'], // Campus to Central (Campus Main Gate to Station Road)
    ['N-03', 'N-07'], // Campus to North

    // North internal & links
    ['N-07', 'N-08'],
    ['N-08', 'N-09'],
    ['N-09', 'N-12'],
    ['N-12', 'N-10'],
    ['N-10', 'N-07'], // Cycle 2 in North
    ['N-10', 'N-11'],
    ['N-11', 'N-09'],
    ['N-06', 'N-10'],
    ['N-07', 'N-27'], // North to East

    // Central internal & links
    ['N-13', 'N-14'],
    ['N-14', 'N-15'],
    ['N-15', 'N-16'],
    ['N-16', 'N-17'],
    ['N-17', 'N-18'],
    ['N-18', 'N-13'], // Cycle 3 in Central
    ['N-14', 'N-17'],
    ['N-16', 'N-19'],
    ['N-19', 'N-33'], // Central to South
    ['N-15', 'N-29'], // Central to East
    ['N-13', 'N-27'], // Central to East

    // West internal & links
    ['N-18', 'N-21'], // Central to West
    ['N-17', 'N-20'], // Central to West
    ['N-21', 'N-20'],
    ['N-20', 'N-22'],
    ['N-22', 'N-23'],
    ['N-23', 'N-24'],
    ['N-24', 'N-25'],
    ['N-25', 'N-21'], // Cycle 4 in West
    ['N-22', 'N-25'],
    ['N-23', 'N-26'],
    ['N-24', 'N-19'], // West to Central
    ['N-24', 'N-36'], // West to South

    // East internal & links
    ['N-27', 'N-28'],
    ['N-28', 'N-29'],
    ['N-29', 'N-30'],
    ['N-30', 'N-31'],
    ['N-31', 'N-32'],
    ['N-32', 'N-29'], // Cycle 5 in East
    ['N-15', 'N-33'], // Central to South
    ['N-30', 'N-34'], // East to South

    // South internal & links
    ['N-33', 'N-34'],
    ['N-34', 'N-35'],
    ['N-35', 'N-36'],
    ['N-36', 'N-37'],
    ['N-37', 'N-38'],
    ['N-38', 'N-35'], // Cycle 6 in South
    ['N-34', 'N-37'],
    ['N-35', 'N-39'], // Connection to Causeway

    // Bottleneck Edge (N-39 <-> N-40): ONLY ACCESS TO ST. JUDE ISLAND HOSPITAL!
    ['N-39', 'N-40']
  ];

  // Specific edges pre-set to CONGESTED
  const congestedSet = new Set(['N-01_N-02', 'N-02_N-01', 'N-14_N-15', 'N-15_N-14', 'N-22_N-23', 'N-23_N-22']);

  const roadEdges = [];
  rawPairs.forEach(([u, v]) => {
    const nodeU = nodeMap.get(u);
    const nodeV = nodeMap.get(v);
    if (!nodeU || !nodeV) {
      throw new Error(`Edge definition error: missing node ${u} or ${v}`);
    }

    const dist = calculateDistanceKm(nodeU.latitude, nodeU.longitude, nodeV.latitude, nodeV.longitude);
    const cost = Math.max(0.5, dist); // Minimum base cost 0.5 km

    // Forward edge
    const isCongestedUV = congestedSet.has(`${u}_${v}`);
    roadEdges.push({
      edgeId: `E-${u.replace('N-', '')}-${v.replace('N-', '')}`,
      fromNodeId: u,
      toNodeId: v,
      baseCost: cost,
      condition: isCongestedUV ? config.roadConditions.CONGESTED : config.roadConditions.NORMAL,
      multiplier: isCongestedUV ? config.congestionMultiplier : 1.0,
      active: true,
      updatedAt: now,
      isSynthetic: true
    });

    // Reverse edge
    const isCongestedVU = congestedSet.has(`${v}_${u}`);
    roadEdges.push({
      edgeId: `E-${v.replace('N-', '')}-${u.replace('N-', '')}`,
      fromNodeId: v,
      toNodeId: u,
      baseCost: cost,
      condition: isCongestedVU ? config.roadConditions.CONGESTED : config.roadConditions.NORMAL,
      multiplier: isCongestedVU ? config.congestionMultiplier : 1.0,
      active: true,
      updatedAt: now,
      isSynthetic: true
    });
  });

  // 4. GENERATE 8 AMBULANCES
  const ambulances = [
    {
      ambulanceId: 'AMB-001',
      label: 'Medic One (ALS Unit)',
      currentNodeId: 'N-03',
      status: 'AVAILABLE',
      vehicleType: 'ALS',
      capabilities: ['basic-life-support', 'advanced-life-support', 'ventilator', 'cardiac-monitor'],
      utilizationRate: 0.15,
      reliabilityScore: 0.98,
      totalDispatches: 18,
      activeIncidentId: null,
      lastUpdatedAt: now,
      isSynthetic: true
    },
    {
      ambulanceId: 'AMB-002',
      label: 'Rapid Response BLS-A',
      currentNodeId: 'N-12',
      status: 'AVAILABLE',
      vehicleType: 'BLS',
      capabilities: ['basic-life-support'],
      utilizationRate: 0.28,
      reliabilityScore: 0.95,
      totalDispatches: 24,
      activeIncidentId: null,
      lastUpdatedAt: now,
      isSynthetic: true
    },
    {
      ambulanceId: 'AMB-003',
      label: 'Critical Mobile ICU-Alpha',
      currentNodeId: 'N-18',
      status: 'AVAILABLE',
      vehicleType: 'ICU-mobile',
      capabilities: ['basic-life-support', 'advanced-life-support', 'ventilator', 'cardiac-monitor'],
      utilizationRate: 0.35,
      reliabilityScore: 0.94,
      totalDispatches: 31,
      activeIncidentId: null,
      lastUpdatedAt: now,
      isSynthetic: true
    },
    {
      ambulanceId: 'AMB-004',
      label: 'Specialty Neonatal Care Unit',
      currentNodeId: 'N-25',
      status: 'AVAILABLE',
      vehicleType: 'neonatal',
      capabilities: ['basic-life-support', 'advanced-life-support', 'neonatal-care', 'ventilator'],
      utilizationRate: 0.12,
      reliabilityScore: 0.99,
      totalDispatches: 14,
      activeIncidentId: null,
      lastUpdatedAt: now,
      isSynthetic: true
    },
    {
      ambulanceId: 'AMB-005',
      label: 'Medic Five (ALS Unit)',
      currentNodeId: 'N-31',
      status: 'AVAILABLE',
      vehicleType: 'ALS',
      capabilities: ['basic-life-support', 'advanced-life-support', 'cardiac-monitor'],
      utilizationRate: 0.42,
      reliabilityScore: 0.89,
      totalDispatches: 40,
      activeIncidentId: null,
      lastUpdatedAt: now,
      isSynthetic: true
    },
    {
      ambulanceId: 'AMB-006',
      label: 'City BLS Response Unit',
      currentNodeId: 'N-10',
      status: 'DISPATCHED', // Currently busy on active incident INC-009
      vehicleType: 'BLS',
      capabilities: ['basic-life-support'],
      utilizationRate: 0.75,
      reliabilityScore: 0.91,
      totalDispatches: 52,
      activeIncidentId: 'INC-009',
      lastUpdatedAt: now,
      isSynthetic: true
    },
    {
      ambulanceId: 'AMB-007',
      label: 'Heavy Rescue ICU-Beta',
      currentNodeId: 'N-14',
      status: 'MAINTENANCE', // Offline
      vehicleType: 'ICU-mobile',
      capabilities: ['basic-life-support', 'advanced-life-support', 'ventilator', 'cardiac-monitor'],
      utilizationRate: 0.85,
      reliabilityScore: 0.84,
      totalDispatches: 65,
      activeIncidentId: null,
      lastUpdatedAt: now,
      isSynthetic: true
    },
    {
      ambulanceId: 'AMB-008',
      label: 'South Air-Ground ALS Link',
      currentNodeId: 'N-36',
      status: 'AVAILABLE',
      vehicleType: 'ALS',
      capabilities: ['basic-life-support', 'advanced-life-support', 'cardiac-monitor', 'ventilator'],
      utilizationRate: 0.22,
      reliabilityScore: 0.96,
      totalDispatches: 22,
      activeIncidentId: null,
      lastUpdatedAt: now,
      isSynthetic: true
    }
  ];

  // 5. GENERATE 5 HOSPITALS
  const hospitals = [
    {
      hospitalId: 'HOS-001',
      name: 'Metro Central General Hospital',
      nodeId: 'N-15',
      capabilities: ['trauma', 'cardiac', 'general'],
      capacity: 60,
      availableSlots: 8,
      status: 'NORMAL_OPS',
      updatedAt: now,
      isSynthetic: true
    },
    {
      hospitalId: 'HOS-002',
      name: 'Riverfront Neonatal & Specialty Center',
      nodeId: 'N-28',
      capabilities: ['neonatal', 'general', 'burns'],
      capacity: 35,
      availableSlots: 4,
      status: 'NORMAL_OPS',
      updatedAt: now,
      isSynthetic: true
    },
    {
      hospitalId: 'HOS-003',
      name: 'Highland Heart & Trauma Institute',
      nodeId: 'N-08',
      capabilities: ['cardiac', 'trauma', 'general'],
      capacity: 45,
      availableSlots: 6,
      status: 'NORMAL_OPS',
      updatedAt: now,
      isSynthetic: true
    },
    {
      hospitalId: 'HOS-004',
      name: 'Westside Community Clinic',
      nodeId: 'N-22',
      capabilities: ['general', 'burns'],
      capacity: 25,
      availableSlots: 0, // Demonstrates hospital filtering when at full capacity
      status: 'AT_CAPACITY',
      updatedAt: now,
      isSynthetic: true
    },
    {
      hospitalId: 'HOS-005',
      name: 'St. Jude Island Trauma Hospital',
      nodeId: 'N-40', // Behind bottleneck bridge N-39 <-> N-40
      capabilities: ['trauma', 'cardiac', 'general'],
      capacity: 30,
      availableSlots: 7,
      status: 'NORMAL_OPS',
      updatedAt: now,
      isSynthetic: true
    }
  ];

  // 6. GENERATE 12 INCIDENTS
  // Includes tie-breaking pair (INC-001 & INC-002 both CRITICAL with different timestamps)
  const baseTime = now.getTime();
  const incidents = [
    {
      incidentId: 'INC-001',
      type: 'cardiac arrest',
      severity: 'CRITICAL',
      locationNodeId: 'N-01', // Campus Main Gate (Golden path incident)
      description: 'Reported sudden collapse with suspected arrhythmia near campus main gates',
      status: 'TRIAGED',
      requiredCapabilities: ['cardiac-monitor', 'advanced-life-support'],
      assignedAmbulanceId: null,
      destinationHospitalId: null,
      createdAt: new Date(baseTime - 45 * 60000), // Earlier timestamp for tie-breaker
      updatedAt: new Date(baseTime - 40 * 60000),
      isSynthetic: true
    },
    {
      incidentId: 'INC-002',
      type: 'road accident',
      severity: 'CRITICAL',
      locationNodeId: 'N-16',
      description: 'Two-vehicle collision with severe entrapment at Grand Boulevard',
      status: 'AWAITING_RESOURCE',
      requiredCapabilities: ['advanced-life-support', 'ventilator'],
      assignedAmbulanceId: null,
      destinationHospitalId: null,
      createdAt: new Date(baseTime - 30 * 60000), // Later timestamp for tie-breaker
      updatedAt: new Date(baseTime - 25 * 60000),
      isSynthetic: true
    },
    {
      incidentId: 'INC-003',
      type: 'maternity emergency',
      severity: 'HIGH',
      locationNodeId: 'N-25',
      description: 'Preterm labor complication requiring specialized infant respiratory support',
      status: 'REGISTERED',
      requiredCapabilities: ['neonatal-care', 'ventilator'],
      assignedAmbulanceId: null,
      destinationHospitalId: null,
      createdAt: new Date(baseTime - 20 * 60000),
      updatedAt: new Date(baseTime - 20 * 60000),
      isSynthetic: true
    },
    {
      incidentId: 'INC-004',
      type: 'burns',
      severity: 'HIGH',
      locationNodeId: 'N-32',
      description: 'Industrial steam line blowout resulting in second-degree thermal burns',
      status: 'REGISTERED',
      requiredCapabilities: ['basic-life-support', 'advanced-life-support'],
      assignedAmbulanceId: null,
      destinationHospitalId: null,
      createdAt: new Date(baseTime - 18 * 60000),
      updatedAt: new Date(baseTime - 18 * 60000),
      isSynthetic: true
    },
    {
      incidentId: 'INC-005',
      type: 'fall injury',
      severity: 'MEDIUM',
      locationNodeId: 'N-19',
      description: 'Worker fell from 3-meter scaffolding; conscious with wrist and hip pain',
      status: 'REGISTERED',
      requiredCapabilities: ['basic-life-support'],
      assignedAmbulanceId: null,
      destinationHospitalId: null,
      createdAt: new Date(baseTime - 15 * 60000),
      updatedAt: new Date(baseTime - 15 * 60000),
      isSynthetic: true
    },
    {
      incidentId: 'INC-006',
      type: 'road accident',
      severity: 'MEDIUM',
      locationNodeId: 'N-11',
      description: 'Single motorcycle skid on highway ramp; road abrasions, alert patient',
      status: 'REGISTERED',
      requiredCapabilities: ['basic-life-support'],
      assignedAmbulanceId: null,
      destinationHospitalId: null,
      createdAt: new Date(baseTime - 12 * 60000),
      updatedAt: new Date(baseTime - 12 * 60000),
      isSynthetic: true
    },
    {
      incidentId: 'INC-007',
      type: 'fall injury',
      severity: 'LOW',
      locationNodeId: 'N-04',
      description: 'Student tripped on athletic bleachers, minor sprained ankle',
      status: 'REGISTERED',
      requiredCapabilities: ['basic-life-support'],
      assignedAmbulanceId: null,
      destinationHospitalId: null,
      createdAt: new Date(baseTime - 10 * 60000),
      updatedAt: new Date(baseTime - 10 * 60000),
      isSynthetic: true
    },
    {
      incidentId: 'INC-008',
      type: 'breathing difficulty',
      severity: 'LOW',
      locationNodeId: 'N-14',
      description: 'Mild hyperventilation complaint at shopping plaza, stable vitals',
      status: 'REGISTERED',
      requiredCapabilities: ['basic-life-support'],
      assignedAmbulanceId: null,
      destinationHospitalId: null,
      createdAt: new Date(baseTime - 8 * 60000),
      updatedAt: new Date(baseTime - 8 * 60000),
      isSynthetic: true
    },
    {
      incidentId: 'INC-009',
      type: 'cardiac arrest',
      severity: 'CRITICAL',
      locationNodeId: 'N-10',
      description: 'Cardiac emergency at Green Hills Rotary with CPR initiated by transit crew',
      status: 'AMBULANCE_ASSIGNED',
      requiredCapabilities: ['basic-life-support'],
      assignedAmbulanceId: 'AMB-006',
      destinationHospitalId: 'HOS-003',
      createdAt: new Date(baseTime - 60 * 60000),
      updatedAt: new Date(baseTime - 50 * 60000),
      isSynthetic: true
    },
    {
      incidentId: 'INC-010',
      type: 'breathing difficulty',
      severity: 'HIGH',
      locationNodeId: 'N-34',
      description: 'Acute asthma exacerbation at sports venue, oxygen needed immediately',
      status: 'VEHICLE_EN_ROUTE',
      requiredCapabilities: ['basic-life-support', 'advanced-life-support'],
      assignedAmbulanceId: 'AMB-008',
      destinationHospitalId: 'HOS-001',
      createdAt: new Date(baseTime - 35 * 60000),
      updatedAt: new Date(baseTime - 20 * 60000),
      isSynthetic: true
    },
    {
      incidentId: 'INC-011',
      type: 'road accident',
      severity: 'MEDIUM',
      locationNodeId: 'N-21',
      description: 'Minor fender-bender with non-critical neck strain, transferred to clinic',
      status: 'RESOLVED',
      requiredCapabilities: ['basic-life-support'],
      assignedAmbulanceId: 'AMB-002',
      destinationHospitalId: 'HOS-001',
      createdAt: new Date(baseTime - 120 * 60000),
      updatedAt: new Date(baseTime - 65 * 60000),
      isSynthetic: true
    },
    {
      incidentId: 'INC-012',
      type: 'fall injury',
      severity: 'LOW',
      locationNodeId: 'N-05',
      description: 'Minor slip at student union; individual self-triaged and refused transport',
      status: 'CANCELLED',
      requiredCapabilities: ['basic-life-support'],
      assignedAmbulanceId: null,
      destinationHospitalId: null,
      createdAt: new Date(baseTime - 90 * 60000),
      updatedAt: new Date(baseTime - 75 * 60000),
      isSynthetic: true
    }
  ];

  return {
    users,
    roadNodes,
    roadEdges,
    ambulances,
    hospitals,
    incidents
  };
}

export default generateSyntheticData;
