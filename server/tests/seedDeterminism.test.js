import { describe, it, expect } from 'vitest';
import { generateSyntheticData } from '../seed/syntheticData.js';
import { generateCityDenseGraph } from '../seed/cityDenseGenerator.js';
import { Graph } from '../dsa/Graph.js';
import { dijkstra } from '../dsa/dijkstra.js';

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

describe('City-Dense Synthetic Scenario & Showcase Pairs (Phase A)', () => {
  it('generates identical City-Dense graphs across multiple runs with seed 1337', () => {
    const run1 = generateCityDenseGraph(1337);
    const run2 = generateCityDenseGraph(1337);

    expect(run1.vertexCount).toBe(1520);
    expect(run2.vertexCount).toBe(1520);
    expect(run1.edgeCount).toBe(4260);
    expect(run2.edgeCount).toBe(4260);
    expect(run1.hospitals.length).toBe(5);
    expect(run1.ambulances.length).toBe(8);
    expect(run1.incidents.length).toBe(12);
    expect(run1.showcasePairs.length).toBe(6);

    expect(run1.nodes).toEqual(run2.nodes);
    expect(run1.edges).toEqual(run2.edges);
    expect(run1.showcasePairs).toEqual(run2.showcasePairs);
  });

  it('contains the 6 required showcase pairs with valid source and destination nodes', () => {
    const data = generateCityDenseGraph(1337);
    const pairs = data.showcasePairs;
    const nodeIds = new Set(data.nodes.map((n) => n.nodeId));

    expect(pairs.length).toBe(6);

    const categories = pairs.map((p) => p.category);
    expect(categories).toContain('short');
    expect(categories).toContain('medium');
    expect(categories).toContain('long');
    expect(categories).toContain('across-river');
    expect(categories).toContain('near-dead-end');
    expect(categories).toContain('unreachable-when-bridge-blocked');

    for (const pair of pairs) {
      expect(nodeIds.has(pair.sourceNodeId)).toBe(true);
      expect(nodeIds.has(pair.destinationNodeId)).toBe(true);
      expect(pair.sourceNodeId).not.toBe(pair.destinationNodeId);
    }
  });

  it('guarantees 100% graph connectivity on City-Dense and finds valid routes', () => {
    const data = generateCityDenseGraph(1337);
    const graph = new Graph();
    data.nodes.forEach((n) => graph.addNode(n));
    data.edges.forEach((e) => graph.addEdge(e));

    // Test short, medium, long, river pairs
    const testPairs = data.showcasePairs.filter((p) => p.category !== 'unreachable-when-bridge-blocked');
    for (const pair of testPairs) {
      const res = dijkstra(graph, pair.sourceNodeId, pair.destinationNodeId);
      expect(res.found).toBe(true);
      expect(res.path.length).toBeGreaterThanOrEqual(2);
      expect(res.path[0]).toBe(pair.sourceNodeId);
      expect(res.path[res.path.length - 1]).toBe(pair.destinationNodeId);
      expect(res.cost).toBeGreaterThan(0);
    }
  });

  it('forces route across a bridge for the trans-river showcase pair', () => {
    const data = generateCityDenseGraph(1337);
    const graph = new Graph();
    data.nodes.forEach((n) => graph.addNode(n));
    data.edges.forEach((e) => graph.addEdge(e));

    const riverPair = data.showcasePairs.find((p) => p.category === 'across-river');
    expect(riverPair).toBeDefined();

    const res = dijkstra(graph, riverPair.sourceNodeId, riverPair.destinationNodeId);
    expect(res.found).toBe(true);

    // River is between rows 18 and 20. Source is north (row < 18), destination is south (row > 20)
    const srcNode = graph.getNode(riverPair.sourceNodeId);
    const dstNode = graph.getNode(riverPair.destinationNodeId);
    expect(srcNode.row).toBeLessThan(18);
    expect(dstNode.row).toBeGreaterThan(20);

    // The route must cross one of the 3 bridges (columns 8, 26, or 33)
    const bridgeCols = [8, 26, 33];
    const bridgeCrossed = res.path.some((nodeId) => {
      const node = graph.getNode(nodeId);
      return bridgeCols.includes(node.col) && (node.row >= 18 && node.row <= 20);
    });
    expect(bridgeCrossed).toBe(true);
  });

  it('demonstrates St. Jude Island cutoff when the causeway bridge is blocked', () => {
    const data = generateCityDenseGraph(1337);
    const graph = new Graph();
    data.nodes.forEach((n) => graph.addNode(n));
    data.edges.forEach((e) => graph.addEdge(e));

    const islandPair = data.showcasePairs.find((p) => p.category === 'unreachable-when-bridge-blocked');
    expect(islandPair).toBeDefined();

    // 1. Initially route to island is reachable
    const initialRoute = dijkstra(graph, islandPair.sourceNodeId, islandPair.destinationNodeId);
    expect(initialRoute.found).toBe(true);

    // 2. Block the causeway bridge edge
    const causewayEdgeId = islandPair.bridgeEdgeId;
    expect(causewayEdgeId).toBeDefined();

    // Block both directions of the causeway bridge
    graph.setEdgeCondition(causewayEdgeId, 'BLOCKED', Infinity);
    const reverseEdge = Array.from(graph.edges.values()).find(
      (e) => e.roadName === 'St. Jude Island Causeway Bridge' && e.edgeId !== causewayEdgeId
    );
    if (reverseEdge) {
      graph.setEdgeCondition(reverseEdge.edgeId, 'BLOCKED', Infinity);
    }

    // 3. Now destination on island must be unreachable
    const blockedRoute = dijkstra(graph, islandPair.sourceNodeId, islandPair.destinationNodeId);
    expect(blockedRoute.found).toBe(false);
    expect(blockedRoute.outcome).toBe('NO_ROUTE');
  });
});

