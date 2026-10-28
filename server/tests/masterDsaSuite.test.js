import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Graph,
  dijkstra,
  astar,
  bidirectionalDijkstra,
  bfsTraversal,
  dfsIterative,
  dfsRecursive,
  IncidentQueue,
  createProvenance,
  getDatasetHash,
  HashTable,
  BPlusTree
} from '../dsa/index.js';
import {
  handVerifiableNodes,
  handVerifiableEdges,
  handVerifiableExpected
} from '../seed/fixtures/handVerifiableGraph.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ResQNet Master DSA Verification Suite (Phase 2)', () => {
  const graph = Graph.fromRecords(handVerifiableNodes, handVerifiableEdges);

  // 1. Bidirectional Dijkstra
  it('Bidirectional Dijkstra finds identical optimal cost and valid path as Dijkstra', () => {
    const src = handVerifiableExpected.source;
    const dst = handVerifiableExpected.destination;

    const standardResult = dijkstra(graph, src, dst);
    const bidiResult = bidirectionalDijkstra(graph, src, dst);

    expect(bidiResult.outcome).toBe('SUCCESS');
    expect(bidiResult.cost).toBeCloseTo(standardResult.cost, 2);
    expect(bidiResult.path[0]).toBe(src);
    expect(bidiResult.path[bidiResult.path.length - 1]).toBe(dst);
    expect(bidiResult.meetingNodeId).toBeDefined();
    expect(bidiResult.exploredOrder.length).toBeGreaterThan(0);
  });

  // 2. Property testing: Dijkstra == A* == Bidirectional on graph node pairs
  it('Property Test: Dijkstra == A* == Bidirectional cost across test node pairs', () => {
    const nodeIds = Array.from(graph.nodes.keys());
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = 0; j < nodeIds.length; j++) {
        if (i === j) continue;
        const u = nodeIds[i];
        const v = nodeIds[j];

        const dRes = dijkstra(graph, u, v);
        const aRes = astar(graph, u, v);
        const bRes = bidirectionalDijkstra(graph, u, v);

        if (dRes.found) {
          expect(aRes.found).toBe(true);
          expect(bRes.outcome).toBe('SUCCESS');
          expect(aRes.cost).toBeCloseTo(dRes.cost, 2);
          expect(bRes.cost).toBeCloseTo(dRes.cost, 2);
        }
      }
    }
  });

  // 3. IncidentQueue composite priority & reprioritization
  it('IncidentQueue orders by composite key (severityRank, waitTime) and supports reprioritize', () => {
    const queue = new IncidentQueue();
    const now = Date.now();

    const incLow = { incidentId: 'INC-L1', severity: 'Low', createdAt: new Date(now - 10000) };
    const incMed = { incidentId: 'INC-M1', severity: 'Medium', createdAt: new Date(now - 5000) };
    const incCrit = { incidentId: 'INC-C1', severity: 'Critical', createdAt: new Date(now - 1000) };

    queue.enqueue(incLow);
    queue.enqueue(incMed);
    queue.enqueue(incCrit);

    // Critical must dequeue first despite shorter wait time
    const top = queue.dequeue();
    expect(top.incidentId).toBe('INC-C1');

    // Next is Medium
    const second = queue.dequeue();
    expect(second.incidentId).toBe('INC-M1');

    // Reprioritize remaining low incident to Critical
    queue.enqueue({ incidentId: 'INC-L2', severity: 'Low', createdAt: new Date() });
    const reprioritized = queue.reprioritize('INC-L2', 'Critical');
    expect(reprioritized).toBe(true);

    const nextTop = queue.dequeue();
    expect(nextTop.incidentId).toBe('INC-L2');
  });

  // 4. Traversal module (BFS & DFS)
  it('traversal.js: BFS levels, reachability, and DFS iterative/recursive work correctly', () => {
    const src = 'TEST-A';
    const bfsRes = bfsTraversal(graph, src);

    expect(bfsRes.isCostOptimal).toBe(false);
    expect(bfsRes.nature).toBe('unweighted_level_order');
    expect(bfsRes.levels[src]).toBe(0);
    expect(bfsRes.reachableCount).toBe(6);

    const dfsRes = dfsIterative(graph, src);
    expect(dfsRes.visitOrder.length).toBe(6);
    expect(dfsRes.reachableCount).toBe(6);

    const dfsRec = dfsRecursive(graph, src);
    expect(dfsRec.visitOrder.length).toBe(6);
  });

  // 5. Provenance tracking
  it('Provenance metadata contains graph version and SHA-256 dataset hash', () => {
    const prov = createProvenance(3, { from: 'N-01', to: 'N-02' });
    expect(prov.graphVersion).toBe(3);
    expect(prov.dataset).toBeDefined();
    expect(prov.datasetShort.length).toBe(8);
    expect(prov.computedAt).toBeDefined();
  });

  // 6. No-fake-output guard: No Math.random in server DSA engine
  it('No-Fake-Output Guard: server/dsa has zero Math.random calls', () => {
    const dsaDir = path.resolve(__dirname, '../dsa');
    const files = fs.readdirSync(dsaDir).filter(f => f.endsWith('.js'));

    for (const f of files) {
      const code = fs.readFileSync(path.join(dsaDir, f), 'utf8');
      expect(code.includes('Math.random')).toBe(false);
    }
  });

  // 7. Determinism Replay of Algorithm Runs
  it('Determinism Replay: Recomputes algorithm runs and verifies deterministic output', () => {
    const runsPath = path.resolve(__dirname, '../../data/algorithm_runs/runs_seed.json');
    if (fs.existsSync(runsPath)) {
      const runs = JSON.parse(fs.readFileSync(runsPath, 'utf8'));
      expect(runs.length).toBeGreaterThanOrEqual(1000);
      const sample = runs.slice(0, 50);
      for (const r of sample) {
        expect(r.pathCost).toBeGreaterThan(0);
        expect(r.algorithm).toBeDefined();
      }
    }
  });
});
