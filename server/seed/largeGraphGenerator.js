import { createPRNG } from './prng.js';

/**
 * Generates a synthetic connected graph of N vertices and M edges.
 * Suitable for in-memory benchmarking (Target: Graph load < 2s for 2,000 vertices / 5,000 edges).
 */
export function generateLargeGraph(vertexCount = 2000, edgeCount = 5000, seed = 1337) {
  const prng = createPRNG(seed);
  const startTime = performance.now();

  const nodes = [];
  const edges = [];
  const edgeSet = new Set();

  // 1. Generate 2D coordinates arranged in an approximate grid
  const cols = Math.ceil(Math.sqrt(vertexCount));
  const baseLat = 19.9900;
  const baseLon = 73.7800;

  for (let i = 0; i < vertexCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // Add small deterministic jitter
    const jitterLat = (prng.next() - 0.5) * 0.002;
    const jitterLon = (prng.next() - 0.5) * 0.002;

    nodes.push({
      nodeId: `LG-N-${String(i + 1).padStart(5, '0')}`,
      label: `LargeGraph Node ${i + 1}`,
      latitude: Math.round((baseLat + row * 0.005 + jitterLat) * 10000) / 10000,
      longitude: Math.round((baseLon + col * 0.005 + jitterLon) * 10000) / 10000,
      zone: `Sector-${(i % 10) + 1}`,
      active: true,
      isSynthetic: true
    });
  }

  // 2. Guarantee connectivity: Create a Spanning Tree / Backbone Chain
  for (let i = 0; i < vertexCount - 1; i++) {
    const u = nodes[i].nodeId;
    const v = nodes[i + 1].nodeId;
    const cost = prng.nextFloat(0.8, 5.0, 2);

    edges.push({
      edgeId: `LG-E-TREE-${i + 1}`,
      fromNodeId: u,
      toNodeId: v,
      baseCost: cost,
      condition: 'NORMAL',
      multiplier: 1.0,
      active: true
    });
    edgeSet.add(`${u}->${v}`);
  }

  // 3. Grid-like horizontal & vertical neighbors to build realistic road topology
  for (let r = 0; r < Math.floor(vertexCount / cols); r++) {
    for (let c = 0; c < cols; c++) {
      if (edges.length >= edgeCount) break;
      const idx = r * cols + c;
      if (idx >= vertexCount) break;

      // Vertical connection
      const downIdx = (r + 1) * cols + c;
      if (downIdx < vertexCount) {
        const u = nodes[idx].nodeId;
        const v = nodes[downIdx].nodeId;
        const key = `${u}->${v}`;
        if (!edgeSet.has(key)) {
          const cost = prng.nextFloat(0.5, 4.5, 2);
          edges.push({
            edgeId: `LG-E-GRID-${edges.length + 1}`,
            fromNodeId: u,
            toNodeId: v,
            baseCost: cost,
            condition: 'NORMAL',
            multiplier: 1.0,
            active: true
          });
          edgeSet.add(key);
        }
      }
    }
  }

  // 4. Fill remaining requested edges with deterministic random shortcuts
  while (edges.length < edgeCount) {
    const i = prng.nextInt(0, vertexCount - 1);
    const j = prng.nextInt(0, vertexCount - 1);
    if (i !== j) {
      const u = nodes[i].nodeId;
      const v = nodes[j].nodeId;
      const key = `${u}->${v}`;
      if (!edgeSet.has(key)) {
        const cost = prng.nextFloat(1.0, 10.0, 2);
        edges.push({
          edgeId: `LG-E-RND-${edges.length + 1}`,
          fromNodeId: u,
          toNodeId: v,
          baseCost: cost,
          condition: 'NORMAL',
          multiplier: 1.0,
          active: true
        });
        edgeSet.add(key);
      }
    }
  }

  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    nodes,
    edges,
    vertexCount: nodes.length,
    edgeCount: edges.length,
    durationMs
  };
}

export default generateLargeGraph;
