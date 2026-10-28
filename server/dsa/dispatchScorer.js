import config from '../config/index.js';
import { dijkstra } from './dijkstra.js';

/**
 * Capability equivalence and medical skill mappings for emergency dispatch.
 * Maps high-level clinical requirements to ambulance equipment and ALS capabilities.
 */
export const CAPABILITY_EQUIVALENCE = {
  'cardiac-monitor': ['telemetry', 'defibrillator', 'advanced-life-support', 'cardiac-monitor'],
  'telemetry': ['telemetry', 'cardiac-monitor', 'advanced-life-support'],
  'defibrillator': ['defibrillator', 'telemetry', 'advanced-life-support'],
  'trauma-care': ['advanced-life-support', 'first-aid', 'basic-life-support', 'trauma-care'],
  'burn-unit': ['advanced-life-support', 'first-aid', 'oxygen', 'burn-unit'],
  'pediatric-support': ['pediatric-icu', 'incubator', 'pediatric-support', 'basic-life-support', 'advanced-life-support'],
  'neonatal-care': ['incubator', 'neonatal-care', 'pediatric-icu', 'basic-life-support'],
  'ventilator': ['ventilator', 'advanced-life-support', 'oxygen'],
  'oxygen': ['oxygen', 'ventilator', 'basic-life-support', 'advanced-life-support'],
  'advanced-life-support': ['advanced-life-support', 'icu'],
  'basic-life-support': ['basic-life-support', 'advanced-life-support', 'first-aid'],
  'first-aid': ['first-aid', 'basic-life-support', 'advanced-life-support']
};

export function checkAmbulanceCapability(ambCapsSet, requiredCap) {
  const req = String(requiredCap).toLowerCase().trim();
  if (ambCapsSet.has(req)) return true;

  const equivalents = CAPABILITY_EQUIVALENCE[req];
  if (equivalents) {
    for (const eq of equivalents) {
      if (ambCapsSet.has(eq.toLowerCase())) return true;
    }
  }

  // An ALS ambulance includes resuscitation kit, EMTs and equipment that covers BLS
  if (ambCapsSet.has('advanced-life-support') && (req === 'basic-life-support' || req === 'first-aid' || req === 'oxygen')) {
    return true;
  }

  return false;
}

/**
 * Greedy Dispatch Scorer Module in Pure JavaScript.
 *
 * Scoring Formula:
 *  Score = w1 * normalized_route_cost +
 *          w2 * utilization_penalty +
 *          w3 * capability_mismatch_penalty +
 *          w4 * reliability_penalty
 *
 * (Lower score is better).
 *
 * Hard Filters:
 *  1. Status must be AVAILABLE.
 *  2. Ambulance must possess compatible capabilities of the incident.
 *  3. There must exist a traversable route from ambulance to incident.
 */
export function scoreAmbulanceCandidates(
  graph,
  incident,
  ambulances = [],
  customWeights = null
) {
  const weights = customWeights || config.scoringWeights;
  const incidentLocation = incident.locationNodeId;
  const requiredCaps = new Set((incident.requiredCapabilities || []).map((c) => String(c).toLowerCase().trim()));

  const candidates = [];
  const rejected = [];

  // 1. Evaluate each ambulance
  for (const amb of ambulances) {
    const ambCaps = new Set((amb.capabilities || []).map((c) => String(c).toLowerCase().trim()));
    const callSign = amb.callSign || amb.label || amb.ambulanceId;

    // Filter 1: Availability
    if (String(amb.status).toUpperCase() !== 'AVAILABLE') {
      rejected.push({
        ambulanceId: amb.ambulanceId,
        callSign,
        label: callSign,
        type: amb.type || amb.vehicleType,
        vehicleType: amb.vehicleType || amb.type,
        reason: `Vehicle unavailable (Current Status: ${amb.status})`,
        status: amb.status
      });
      continue;
    }

    // Filter 2: Capability check with equivalence resolution
    const missingCaps = [];
    for (const req of requiredCaps) {
      if (!checkAmbulanceCapability(ambCaps, req)) {
        missingCaps.push(req);
      }
    }
    if (missingCaps.length > 0) {
      rejected.push({
        ambulanceId: amb.ambulanceId,
        callSign,
        label: callSign,
        type: amb.type || amb.vehicleType,
        vehicleType: amb.vehicleType || amb.type,
        reason: `Missing required capability: ${missingCaps.join(', ')}`,
        missingCapabilities: missingCaps
      });
      continue;
    }

    // Filter 3: Traversable route calculation from Ambulance location to Incident location
    const routeResult = dijkstra(graph, amb.currentNodeId, incidentLocation);
    if (!routeResult.found) {
      rejected.push({
        ambulanceId: amb.ambulanceId,
        callSign,
        label: callSign,
        type: amb.type || amb.vehicleType,
        vehicleType: amb.vehicleType || amb.type,
        reason: `No traversable path from ${amb.currentNodeId} to incident location ${incidentLocation} (road blocked or severed).`,
        routeFound: false
      });
      continue;
    }

    // Excess capabilities metric (used for mismatch penalty: higher capability vehicle assigned to low severity task)
    const excessCaps = (amb.capabilities || []).filter((c) => !requiredCaps.has(String(c).toLowerCase().trim())).length;
    const capabilityMismatchPenalty = Math.min(1.0, excessCaps * 0.15);

    // Reliability penalty: 1 - reliabilityScore
    const reliabilityPenalty = Math.max(0.0, 1.0 - (amb.reliabilityScore || 0.95));

    // Utilization penalty: utilizationRate (higher utilized vehicles penalized to balance fleet)
    const utilizationPenalty = Math.min(1.0, Math.max(0.0, amb.utilizationRate || 0.20));

    candidates.push({
      ambulance: amb,
      route: {
        path: routeResult.path,
        cost: routeResult.cost,
        nodesExpanded: routeResult.nodesExpanded,
        edgesExamined: routeResult.edgesExamined,
        runtimeMs: routeResult.runtimeMs
      },
      rawRouteCost: routeResult.cost,
      utilizationPenalty,
      capabilityMismatchPenalty,
      reliabilityPenalty,
      isFallback: false
    });
  }

  // Normalize route costs across eligible candidates (0 to 1 scale)
  const maxRouteCost = Math.max(...candidates.map((c) => c.rawRouteCost), 1.0);

  const scoredCandidates = candidates.map((cand) => {
    const normalizedRouteCost = cand.rawRouteCost / maxRouteCost;

    const weightedRouteCost = weights.routeCost * normalizedRouteCost;
    const weightedUtilization = weights.utilization * cand.utilizationPenalty;
    const weightedCapability = weights.capabilityMismatch * cand.capabilityMismatchPenalty;
    const weightedReliability = weights.reliability * cand.reliabilityPenalty;

    const totalScore = weightedRouteCost + weightedUtilization + weightedCapability + weightedReliability;
    const callSign = cand.ambulance.callSign || cand.ambulance.label || cand.ambulance.ambulanceId;
    const etaMinutes = Math.round((cand.rawRouteCost / 40) * 60 * 10) / 10;

    return {
      ambulanceId: cand.ambulance.ambulanceId,
      callSign,
      label: callSign,
      type: cand.ambulance.type || cand.ambulance.vehicleType || 'ALS',
      vehicleType: cand.ambulance.vehicleType || cand.ambulance.type || 'ALS',
      currentNodeId: cand.ambulance.currentNodeId,
      capabilities: cand.ambulance.capabilities || [],
      fuelPct: cand.ambulance.fuelPct ?? 0.85,
      crewFatigue: Math.round((cand.ambulance.utilizationRate || 0.2) * 10) || 2,
      score: Math.round(totalScore * 1000) / 1000,
      totalScore: Math.round(totalScore * 1000) / 1000,
      routeCost: Math.round(cand.rawRouteCost * 100) / 100,
      etaMinutes,
      isFallback: cand.isFallback,
      breakdown: {
        rawRouteCost: cand.rawRouteCost,
        normalizedRouteCost: Math.round(normalizedRouteCost * 1000) / 1000,
        weightedRouteCost: Math.round(weightedRouteCost * 1000) / 1000,
        utilizationPenalty: Math.round(cand.utilizationPenalty * 1000) / 1000,
        weightedUtilization: Math.round(weightedUtilization * 1000) / 1000,
        capabilityMismatchPenalty: Math.round(cand.capabilityMismatchPenalty * 1000) / 1000,
        weightedCapability: Math.round(weightedCapability * 1000) / 1000,
        reliabilityPenalty: Math.round(cand.reliabilityPenalty * 1000) / 1000,
        weightedReliability: Math.round(weightedReliability * 1000) / 1000
      },
      route: cand.route
    };
  });

  // Sort candidate ambulances ascending: lowest score = recommended candidate
  scoredCandidates.sort((a, b) => a.totalScore - b.totalScore);

  return {
    incidentId: incident.incidentId,
    weights,
    bestCandidate: scoredCandidates.length > 0 ? scoredCandidates[0] : null,
    candidates: scoredCandidates,
    eligibleCandidates: scoredCandidates,
    rejected,
    ineligibleCandidates: rejected,
    eligibleCount: scoredCandidates.length,
    rejectedCount: rejected.length,
    evaluatedCount: ambulances.length
  };
}

export default scoreAmbulanceCandidates;
