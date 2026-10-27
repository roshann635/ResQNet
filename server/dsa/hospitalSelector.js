import { dijkstra } from './dijkstra.js';

/**
 * Hospital Selection & Recommendation Module in Pure JavaScript.
 *
 * Requirements (Section 3.12):
 *  - Filter by capability, status, and available slots.
 *  - Compute route cost from incident scene to each eligible hospital.
 *  - Rank hospitals by lowest travel cost.
 *  - Exclude unreachable ones or ineligible facilities with explicit reasons.
 */
export function recommendHospital(graph, incidentLocationNodeId, requiredHospitalCapabilities = [], hospitals = []) {
  const eligible = [];
  const excluded = [];
  const requiredCaps = new Set(requiredHospitalCapabilities);

  for (const hospital of hospitals) {
    const hospCaps = new Set(hospital.capabilities || []);

    // Filter 1: Available bed slots
    if (hospital.availableSlots <= 0 || hospital.status === 'AT_CAPACITY') {
      excluded.push({
        hospitalId: hospital.hospitalId,
        name: hospital.name,
        nodeId: hospital.nodeId,
        reason: 'Hospital is currently at full capacity (0 available bed slots).',
        availableSlots: 0,
        status: hospital.status
      });
      continue;
    }

    // Filter 2: Diverting status
    if (hospital.status === 'DIVERTING') {
      excluded.push({
        hospitalId: hospital.hospitalId,
        name: hospital.name,
        nodeId: hospital.nodeId,
        reason: 'Hospital is actively diverting new emergency admissions.',
        availableSlots: hospital.availableSlots,
        status: hospital.status
      });
      continue;
    }

    // Filter 3: Required hospital specialty capability
    const missingCaps = [];
    for (const req of requiredCaps) {
      if (!hospCaps.has(req)) {
        missingCaps.push(req);
      }
    }
    if (missingCaps.length > 0) {
      excluded.push({
        hospitalId: hospital.hospitalId,
        name: hospital.name,
        nodeId: hospital.nodeId,
        reason: `Lacks required specialty facilities: ${missingCaps.join(', ')}`,
        missingCapabilities: missingCaps
      });
      continue;
    }

    // Filter 4: Route calculation & reachability
    const routeResult = dijkstra(graph, incidentLocationNodeId, hospital.nodeId);
    if (!routeResult.found) {
      excluded.push({
        hospitalId: hospital.hospitalId,
        name: hospital.name,
        nodeId: hospital.nodeId,
        reason: `Unreachable: road leading to ${hospital.name} at node ${hospital.nodeId} is blocked or disconnected.`,
        routeFound: false
      });
      continue;
    }

    eligible.push({
      hospitalId: hospital.hospitalId,
      name: hospital.name,
      nodeId: hospital.nodeId,
      capabilities: hospital.capabilities,
      capacity: hospital.capacity,
      availableSlots: hospital.availableSlots,
      status: hospital.status,
      routeCost: routeResult.cost,
      route: routeResult
    });
  }

  // Rank eligible hospitals by lowest route cost
  eligible.sort((a, b) => a.routeCost - b.routeCost);

  return {
    incidentLocationNodeId,
    bestHospital: eligible.length > 0 ? eligible[0] : null,
    eligible,
    excluded,
    eligibleCount: eligible.length,
    excludedCount: excluded.length
  };
}

export default recommendHospital;
