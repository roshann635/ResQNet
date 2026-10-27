import { describe, it, expect } from 'vitest';
import {
  MinHeap,
  PriorityQueue,
  IncidentPriorityQueue,
  Graph,
  bfs,
  dfs,
  dijkstra,
  astar,
  findAlternativeRoutes,
  HashTable,
  BPlusTree,
  scoreAmbulanceCandidates,
  recommendHospital,
  validateRoute
} from '../dsa/index.js';
import {
  handVerifiableNodes,
  handVerifiableEdges,
  handVerifiableExpected
} from '../seed/fixtures/handVerifiableGraph.js';

describe('ResQNet DSA Core Engine Acceptance Tests (AT-01 to AT-14)', () => {
  // AT-01: Valid graph loads
  it('AT-01: Valid graph loads cleanly with correct counts and components', () => {
    const graph = Graph.fromRecords(handVerifiableNodes, handVerifiableEdges);
    expect(graph.nodes.size).toBe(6);
    expect(graph.edges.size).toBe(18);
    const validation = graph.validate();
    expect(validation.isValid).toBe(true);
    expect(validation.isFullyConnected).toBe(true);
    expect(validation.componentsCount).toBe(1);
  });

  // AT-02: Dangling edge rejected
  it('AT-02: Rejects dangling edge referencing non-existent nodes', () => {
    const graph = new Graph();
    graph.addNode({ nodeId: 'NODE-1', label: 'Point 1', latitude: 19.9, longitude: 73.7 });

    expect(() => {
      graph.addEdge({
        edgeId: 'E-DANGLING',
        fromNodeId: 'NODE-1',
        toNodeId: 'NON_EXISTENT_NODE',
        baseCost: 2.5
      });
    }).toThrow(/Dangling edge/);
  });

  // AT-03: Dijkstra matches hand-computed path
  it('AT-03: Dijkstra matches hand-computed path on test fixture (cost = 8.0)', () => {
    const graph = Graph.fromRecords(handVerifiableNodes, handVerifiableEdges);
    const result = dijkstra(graph, handVerifiableExpected.source, handVerifiableExpected.destination);

    expect(result.found).toBe(true);
    expect(result.cost).toBe(handVerifiableExpected.shortestCost); // 8.0
    expect(result.path).toEqual(handVerifiableExpected.shortestPath);
    expect(result.nodesExpanded).toBeGreaterThan(0);
    expect(result.edgesExamined).toBeGreaterThan(0);
  });

  // AT-04: A* matches optimum
  it('AT-04: A* matches optimal shortest path cost and records g/h/f table', () => {
    const graph = Graph.fromRecords(handVerifiableNodes, handVerifiableEdges);
    const result = astar(graph, handVerifiableExpected.source, handVerifiableExpected.destination, 'EUCLIDEAN');

    expect(result.found).toBe(true);
    expect(result.cost).toBe(handVerifiableExpected.shortestCost); // 8.0
    expect(result.path).toEqual(handVerifiableExpected.shortestPath);
    expect(result.ghfTable.length).toBeGreaterThan(0);
    expect(result.ghfTable[0].g).toBe(0.0);
  });

  // AT-05: BFS/DFS traversal order valid
  it('AT-05: BFS and DFS traversal visit all reachable nodes and are labeled as traversals', () => {
    const graph = Graph.fromRecords(handVerifiableNodes, handVerifiableEdges);

    const bfsResult = bfs(graph, 'TEST-A');
    expect(bfsResult.isShortestPathAlgorithm).toBe(false);
    expect(bfsResult.reachableSet.length).toBe(6);
    expect(bfsResult.visitOrder[0]).toBe('TEST-A');

    const dfsResult = dfs(graph, 'TEST-A');
    expect(dfsResult.isShortestPathAlgorithm).toBe(false);
    expect(dfsResult.reachableSet.length).toBe(6);
    expect(dfsResult.visitOrder[0]).toBe('TEST-A');
  });

  // AT-06: Blocking used edge marks route stale and reroutes
  it('AT-06: Blocking a traversed road marks route STALE and finds new path', () => {
    const graph = Graph.fromRecords(handVerifiableNodes, handVerifiableEdges);
    const initialRoute = dijkstra(graph, 'TEST-A', 'TEST-F');
    const initialVersion = graph.graphVersion;

    expect(initialRoute.cost).toBe(8.0);

    // Validate initial route
    const val1 = validateRoute(graph, initialRoute.path, initialVersion);
    expect(val1.isValid).toBe(true);
    expect(val1.isStale).toBe(false);

    // Block the critical segment T-DE (TEST-D -> TEST-E)
    graph.setEdgeCondition('T-DE', 'BLOCKED');
    expect(graph.graphVersion).toBe(initialVersion + 1);

    // Validate route after block: must detect STALE / BLOCKED
    const val2 = validateRoute(graph, initialRoute.path, initialVersion);
    expect(val2.isValid).toBe(false);
    expect(val2.isStale).toBe(true);

    // Re-route on updated graph
    const rerouted = dijkstra(graph, 'TEST-A', 'TEST-F');
    expect(rerouted.found).toBe(true);
    expect(rerouted.path).toEqual(handVerifiableExpected.shortestPathAfterBlock);
    expect(rerouted.cost).toBe(handVerifiableExpected.shortestCostAfterBlock); // 11.0
  });

  // AT-07: Backtracking skips blocked edge and respects bounds
  it('AT-07: Backtracking skips blocked edges and respects maxCost/maxResults bounds', () => {
    const graph = Graph.fromRecords(handVerifiableNodes, handVerifiableEdges);
    const res = findAlternativeRoutes(graph, 'TEST-A', 'TEST-F', {
      maxHops: 5,
      maxCost: 12.0,
      maxResults: 4
    });

    expect(res.routesCount).toBeGreaterThan(0);
    expect(res.routes[0].cost).toBe(8.0);
    // All returned routes must be <= 12.0
    for (const r of res.routes) {
      expect(r.cost).toBeLessThanOrEqual(12.0);
    }
  });

  // AT-08: Cycles don't cause infinite search
  it('AT-08: Cycles do not cause infinite recursion in backtracking or traversals', () => {
    const graph = Graph.fromRecords(handVerifiableNodes, handVerifiableEdges);
    const res = findAlternativeRoutes(graph, 'TEST-A', 'TEST-F', { maxHops: 10, maxCost: 50 });
    expect(res.routesCount).toBeGreaterThan(0);

    // Ensure no route contains duplicate nodes
    for (const r of res.routes) {
      const set = new Set(r.path);
      expect(set.size).toBe(r.path.length);
    }
  });

  // AT-09: Priority queue orders by severity with deterministic tie-break
  it('AT-09: Incident priority queue orders Critical > High > Medium > Low with tie-break', () => {
    const pq = new IncidentPriorityQueue();

    const t0 = new Date('2026-10-27T10:00:00Z');
    const t1 = new Date('2026-10-27T10:15:00Z');
    const t2 = new Date('2026-10-27T10:30:00Z');

    pq.enqueue({ incidentId: 'INC-MED', severity: 'MEDIUM', createdAt: t0 });
    pq.enqueue({ incidentId: 'INC-CRIT-2', severity: 'CRITICAL', createdAt: t2 });
    pq.enqueue({ incidentId: 'INC-LOW', severity: 'LOW', createdAt: t0 });
    pq.enqueue({ incidentId: 'INC-CRIT-1', severity: 'CRITICAL', createdAt: t1 });

    const first = pq.dequeue();
    const second = pq.dequeue();
    const third = pq.dequeue();
    const fourth = pq.dequeue();

    // INC-CRIT-1 (10:15) must come before INC-CRIT-2 (10:30) because earlier createdAt wins tie-break!
    expect(first.incidentId).toBe('INC-CRIT-1');
    expect(second.incidentId).toBe('INC-CRIT-2');
    expect(third.incidentId).toBe('INC-MED');
    expect(fourth.incidentId).toBe('INC-LOW');
  });

  // AT-10: No eligible ambulance leaves incident pending with explanation
  it('AT-10: When no ambulance has required capability, leaves incident pending with explanation', () => {
    const graph = Graph.fromRecords(handVerifiableNodes, handVerifiableEdges);
    const incident = {
      incidentId: 'INC-RARE',
      locationNodeId: 'TEST-F',
      requiredCapabilities: ['super-specialty-hyperbaric']
    };
    const ambulances = [
      {
        ambulanceId: 'AMB-1',
        label: 'Unit 1',
        currentNodeId: 'TEST-A',
        status: 'AVAILABLE',
        capabilities: ['basic-life-support']
      }
    ];

    const result = scoreAmbulanceCandidates(graph, incident, ambulances);
    expect(result.bestCandidate).toBeNull();
    expect(result.rejected.length).toBe(1);
    expect(result.rejected[0].reason).toContain('Missing required capability');
  });

  // AT-11: Unreachable hospital not recommended
  it('AT-11: Unreachable hospital is excluded with explicit reason', () => {
    const graph = Graph.fromRecords(handVerifiableNodes, handVerifiableEdges);

    // Add isolated hospital node TEST-ISLAND with disconnected edge
    graph.addNode({ nodeId: 'TEST-ISLAND', label: 'Island Clinic', latitude: 19.95, longitude: 73.75 });
    graph.addEdge({ edgeId: 'E-ISLAND', fromNodeId: 'TEST-F', toNodeId: 'TEST-ISLAND', baseCost: 4.0, condition: 'BLOCKED' });

    const hospitals = [
      {
        hospitalId: 'HOS-ISLAND',
        name: 'Island Hospital',
        nodeId: 'TEST-ISLAND',
        availableSlots: 5,
        status: 'NORMAL_OPS',
        capabilities: ['general']
      }
    ];

    const rec = recommendHospital(graph, 'TEST-A', ['general'], hospitals);
    expect(rec.bestHospital).toBeNull();
    expect(rec.excluded.length).toBe(1);
    expect(rec.excluded[0].reason).toContain('Unreachable');
  });

  // AT-12: Hash collisions retrievable, update/delete work
  it('AT-12: Custom HashTable handles collisions, updates, deletions, and resizing', () => {
    const ht = new HashTable(4, 0.75); // Small capacity to force collisions and resize

    ht.insert('KEY-1', 'Value 1');
    ht.insert('KEY-2', 'Value 2');
    ht.insert('KEY-3', 'Value 3');
    ht.insert('KEY-4', 'Value 4'); // Triggers resize from 4 to 8

    expect(ht.get('KEY-1')).toBe('Value 1');
    expect(ht.get('KEY-4')).toBe('Value 4');

    // Update
    ht.update('KEY-2', 'Updated Value 2');
    expect(ht.get('KEY-2')).toBe('Updated Value 2');

    // Delete
    const deleted = ht.delete('KEY-3');
    expect(deleted).toBe('Value 3');
    expect(ht.get('KEY-3')).toBeNull();
    expect(ht.size).toBe(3);
  });

  // AT-13: B+ tree split keeps search and leaf order correct
  it('AT-13: B+ Tree splits correctly on insert and maintains search and leaf order', () => {
    const tree = new BPlusTree(3); // Order 3: max 2 keys per node; inserting 3 keys forces a split

    const keys = ['HOS-005', 'HOS-002', 'HOS-008', 'HOS-001', 'HOS-004', 'HOS-007', 'HOS-003', 'HOS-006'];
    keys.forEach((k) => tree.insert(k, { code: k, name: `Facility ${k}` }));

    // Verify search
    for (const k of keys) {
      const found = tree.search(k);
      expect(found).toBeDefined();
      expect(found.code).toBe(k);
    }

    // Verify leaf order (traversal) is strictly sorted
    const traversal = tree.traverse();
    const sortedKeys = [...keys].sort();
    expect(traversal.map((t) => t.key)).toEqual(sortedKeys);
  });

  // AT-14: B+ tree range query exact and sorted
  it('AT-14: B+ Tree range query returns exact sorted subset across leaf pointers', () => {
    const tree = new BPlusTree(3);
    for (let i = 1; i <= 20; i++) {
      const key = `NODE-${String(i).padStart(3, '0')}`;
      tree.insert(key, { id: i });
    }

    // Range query from NODE-005 to NODE-012
    const range = tree.rangeQuery('NODE-005', 'NODE-012');
    expect(range.length).toBe(8);
    expect(range[0].key).toBe('NODE-005');
    expect(range[7].key).toBe('NODE-012');
  });
});
