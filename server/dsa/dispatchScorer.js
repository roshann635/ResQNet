import config from '../config/index.js';
import { dijkstra } from './dijkstra.js';

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
 *  2. Ambulance must possess all required capabilities of the incident.
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
  const requiredCaps = new Set(incident.requiredCapabilities || []);

  const candidates = [];
  const rejected = [];

  // 1. Evaluate each ambulance
  for (const amb of ambulances) {
    const ambCaps = new Set(amb.capabilities || []);

    // Filter 1: Availability
    if (amb.status !== 'AVAILABLE') {
      rejected.push({
        ambulanceId: amb.ambulanceId,
        label: amb.label,
        vehicleType: amb.vehicleType,
        reason: `Vehicle unavailable (Current Status: ${amb.status})`,
        status: amb.status
      });
      continue;
    }

    // Filter 2: Capability check
    const missingCaps = [];
    for (const req of requiredCaps) {
      if (!ambCaps.has(req)) {
        missingCaps.push(req);
      }
    }
    if (missingCaps.length > 0) {
      rejected.push({
        ambulanceId: amb.ambulanceId,
        label: amb.label,
        vehicleType: amb.vehicleType,
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
        label: amb.label,
        vehicleType: amb.vehicleType,
        reason: `No traversable path from ${amb.currentNodeId} to incident location ${incidentLocation} (road blocked or severed).`,
        routeFound: false
      });
      continue;
    }

    // Excess capabilities metric (used for mismatch penalty: higher capability vehicle assigned to low severity task)
    const excessCaps = amb.capabilities.filter((c) => !requiredCaps.has(c)).length;
    const capabilityMismatchPenalty = Math.min(1.0, excessCaps * 0.15); // Slight penalty for wasting heavy equipment on minor calls

    // Reliability penalty: 1 - reliabilityScore
    const reliabilityPenalty = Math.max(0.0, 1.0 - (amb.reliabilityScore || 0.95));

    // Utilization penalty: utilizationRate (higher utilized vehicles penalized to balance fleet)
    const utilizationPenalty = Math.min(1.0, Math.max(0.0, amb.utilizationRate || 0.20));

    candidates.push({
      ambulance: amb,
      route: routeResult,
      rawRouteCost: routeResult.cost,
      utilizationPenalty,
      capabilityMismatchPenalty,
      reliabilityPenalty
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

    return {
      ambulanceId: cand.ambulance.ambulanceId,
      label: cand.ambulance.label,
      vehicleType: cand.ambulance.vehicleType,
      currentNodeId: cand.ambulance.currentNodeId,
      capabilities: cand.ambulance.capabilities,
      totalScore: Math.round(totalScore * 1000) / 1000,
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
    rejected,
    eligibleCount: scoredCandidates.length,
    rejectedCount: rejected.length
  };
}

export default scoreAmbulanceCandidates;
