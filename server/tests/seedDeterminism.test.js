import { describe, it, expect } from 'vitest';
import { generateSyntheticData } from '../seed/syntheticData.js';

describe('Seed Determinism & Reproducibility (Phase 1)', () => {
  it('generates identical datasets across multiple runs with the same seed', async () => {
    const fixedSeed = 1337;
    const run1 = await generateSyntheticData(fixedSeed);
    const run2 = await generateSyntheticData(fixedSeed);

    // Verify entity counts match
    expect(run1.roadNodes.length).toBe(40);
    expect(run2.roadNodes.length).toBe(40);
    expect(run1.roadEdges.length).toBe(116);
    expect(run2.roadEdges.length).toBe(116);
    expect(run1.ambulances.length).toBe(8);
    expect(run2.ambulances.length).toBe(8);
    expect(run1.hospitals.length).toBe(5);
    expect(run2.hospitals.length).toBe(5);
    expect(run1.incidents.length).toBe(12);
    expect(run2.incidents.length).toBe(12);

    // Deep compare nodes
    expect(run1.roadNodes).toEqual(run2.roadNodes);

    // Deep compare edges (costs, conditions, multipliers)
    expect(run1.roadEdges).toEqual(run2.roadEdges);

    // Deep compare ambulances
    expect(run1.ambulances).toEqual(run2.ambulances);

    // Deep compare hospitals
    expect(run1.hospitals).toEqual(run2.hospitals);

    // Deep compare incidents (severities, tie-breaker timestamps)
    expect(run1.incidents).toEqual(run2.incidents);
  });

  it('guarantees deterministic tie-breaker pair for priority queue testing', async () => {
    const data = await generateSyntheticData(1337);
    const criticalIncidents = data.incidents.filter((inc) => inc.severity === 'CRITICAL');

    expect(criticalIncidents.length).toBeGreaterThanOrEqual(2);
    const inc1 = data.incidents.find((i) => i.incidentId === 'INC-001');
    const inc2 = data.incidents.find((i) => i.incidentId === 'INC-002');

    expect(inc1).toBeDefined();
    expect(inc2).toBeDefined();
    expect(inc1.severity).toBe('CRITICAL');
    expect(inc2.severity).toBe('CRITICAL');
    expect(inc1.createdAt.getTime()).toBeLessThan(inc2.createdAt.getTime());
  });

  it('contains the bottleneck bridge edge isolating St. Jude Island Hospital', async () => {
    const data = await generateSyntheticData(1337);
    const islandHospital = data.hospitals.find((h) => h.hospitalId === 'HOS-005');

    expect(islandHospital).toBeDefined();
    expect(islandHospital.nodeId).toBe('N-40');

    // Find all edges connected to N-40
    const edgesTo40 = data.roadEdges.filter((e) => e.toNodeId === 'N-40');
    const edgesFrom40 = data.roadEdges.filter((e) => e.fromNodeId === 'N-40');

    // N-40 must be connected solely to N-39
    expect(edgesTo40.length).toBe(1);
    expect(edgesTo40[0].fromNodeId).toBe('N-39');
    expect(edgesFrom40.length).toBe(1);
    expect(edgesFrom40[0].toNodeId).toBe('N-39');
  });

  it('has a hospital at capacity with 0 available slots', async () => {
    const data = await generateSyntheticData(1337);
    const fullHospital = data.hospitals.find((h) => h.availableSlots === 0);

    expect(fullHospital).toBeDefined();
    expect(fullHospital.status).toBe('AT_CAPACITY');
  });
});
