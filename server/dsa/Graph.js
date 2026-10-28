import config from '../config/index.js';

/**
 * Weighted Adjacency-List Graph Module in Pure JavaScript.
 *
 * Requirements:
 *  - Node and Edge ID maps.
 *  - Graph version counter incremented on every road change.
 *  - Road states: NORMAL, CONGESTED, BLOCKED, REOPENED.
 *  - Strict validation: dangling endpoints, duplicate IDs, negative weights, disconnected components.
 */
export class Graph {
  constructor() {
    this.nodes = new Map(); // nodeId -> nodeData
    this.edges = new Map(); // edgeId -> edgeData
    this.adjacencyList = new Map(); // nodeId -> Array of { toNodeId, edgeId, weight, condition }
    this.graphVersion = 1;
  }

  addNode(node) {
    if (!node || !node.nodeId) {
      throw new Error('Graph Error: Node must contain a valid nodeId');
    }
    if (this.nodes.has(node.nodeId)) {
      throw new Error(`Graph Error: Duplicate nodeId detected: ${node.nodeId}`);
    }

    this.nodes.set(node.nodeId, {
      ...node,
      latitude: parseFloat(node.latitude) || 0,
      longitude: parseFloat(node.longitude) || 0
    });

    if (!this.adjacencyList.has(node.nodeId)) {
      this.adjacencyList.set(node.nodeId, []);
    }
  }

  addEdge(edge) {
    if (!edge || !edge.edgeId) {
      throw new Error('Graph Error: Edge must contain a valid edgeId');
    }
    if (this.edges.has(edge.edgeId)) {
      throw new Error(`Graph Error: Duplicate edgeId detected: ${edge.edgeId}`);
    }
    if (edge.baseCost < 0) {
      throw new Error(`Graph Error: Negative edge weight rejected for edge ${edge.edgeId}: ${edge.baseCost}`);
    }
    if (!this.nodes.has(edge.fromNodeId)) {
      throw new Error(`Graph Error: Dangling edge ${edge.edgeId}: fromNodeId '${edge.fromNodeId}' does not exist`);
    }
    if (!this.nodes.has(edge.toNodeId)) {
      throw new Error(`Graph Error: Dangling edge ${edge.edgeId}: toNodeId '${edge.toNodeId}' does not exist`);
    }

    const condition = edge.condition || config.roadConditions.NORMAL;
    const multiplier = condition === config.roadConditions.CONGESTED
      ? (edge.multiplier || config.congestionMultiplier)
      : 1.0;

    const edgeRecord = {
      ...edge,
      condition,
      multiplier,
      baseCost: parseFloat(edge.baseCost)
    };

    this.edges.set(edge.edgeId, edgeRecord);

    const neighbors = this.adjacencyList.get(edge.fromNodeId);
    neighbors.push({
      toNodeId: edge.toNodeId,
      edgeId: edge.edgeId,
      baseCost: edgeRecord.baseCost,
      condition: edgeRecord.condition,
      multiplier: edgeRecord.multiplier
    });
  }

  /**
   * Calculates effective traversable cost for an edge.
   * Returns Infinity if edge is BLOCKED.
   */
  getEffectiveWeight(edge) {
    if (edge.condition === config.roadConditions.BLOCKED || edge.active === false) {
      return Infinity;
    }
    if (edge.condition === config.roadConditions.CONGESTED) {
      return edge.baseCost * (edge.multiplier || config.congestionMultiplier);
    }
    return edge.baseCost;
  }

  /**
   * Modifies an edge condition and increments the graph version.
   */
  setEdgeCondition(edgeId, condition, multiplier = null) {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new Error(`Graph Error: Edge not found: ${edgeId}`);
    }

    const validConditions = Object.values(config.roadConditions);
    if (!validConditions.includes(condition)) {
      throw new Error(`Graph Error: Invalid road condition: ${condition}`);
    }

    edge.condition = condition;
    if (condition === config.roadConditions.CONGESTED) {
      edge.multiplier = multiplier || config.congestionMultiplier;
    } else if (condition === config.roadConditions.REOPENED || condition === config.roadConditions.NORMAL) {
      edge.condition = config.roadConditions.NORMAL;
      edge.multiplier = 1.0;
    }

    // Update adjacency list entry
    const neighbors = this.adjacencyList.get(edge.fromNodeId) || [];
    const adj = neighbors.find((n) => n.edgeId === edgeId);
    if (adj) {
      adj.condition = edge.condition;
      adj.multiplier = edge.multiplier;
    }

    // Increment version counter
    this.graphVersion += 1;
    return {
      edgeId,
      condition: edge.condition,
      multiplier: edge.multiplier,
      graphVersion: this.graphVersion
    };
  }

  /**
   * Retrieves traversable outgoing neighbors of a node.
   * By default, BLOCKED edges are omitted from traversal.
   */
  getNeighbors(nodeId, includeBlocked = false) {
    const norm = this._normalizeNodeId(nodeId);
    const list = this.adjacencyList.get(norm) || [];
    if (includeBlocked) return list;

    return list
      .filter((adj) => adj.condition !== config.roadConditions.BLOCKED)
      .map((adj) => ({
        toNodeId: adj.toNodeId,
        edgeId: adj.edgeId,
        weight: this.getEffectiveWeight(adj),
        condition: adj.condition
      }));
  }

  /**
   * Alias for getNeighbors returning effectiveCost attribute for routing modules.
   */
  getAdjacentEdges(nodeId, includeBlocked = false) {
    const norm = this._normalizeNodeId(nodeId);
    const list = this.adjacencyList.get(norm) || [];
    if (includeBlocked) return list;

    return list
      .filter((adj) => adj.condition !== config.roadConditions.BLOCKED)
      .map((adj) => ({
        toNodeId: adj.toNodeId,
        edgeId: adj.edgeId,
        effectiveCost: this.getEffectiveWeight(adj),
        weight: this.getEffectiveWeight(adj),
        condition: adj.condition
      }));
  }

  _normalizeNodeId(nodeId) {
    if (!nodeId || typeof nodeId !== 'string') return nodeId;
    if (this.nodes.has(nodeId)) return nodeId;
    const match = nodeId.match(/^N-(\d{1,3})$/i);
    if (match) {
      const alt = `N-${match[1].padStart(4, '0')}`;
      if (this.nodes.has(alt)) return alt;
    }
    return nodeId;
  }

  getNode(nodeId) {
    const norm = this._normalizeNodeId(nodeId);
    return this.nodes.get(norm) || null;
  }

  getEdge(edgeId) {
    return this.edges.get(edgeId) || null;
  }

  /**
   * Validates topological integrity:
   *  - Dangling endpoints
   *  - Negative weights
   *  - Duplicate IDs
   *  - Disconnected components
   */
  validate() {
    const errors = [];

    // Check for dangling edges
    for (const [edgeId, edge] of this.edges) {
      if (!this.nodes.has(edge.fromNodeId)) {
        errors.push(`Dangling edge ${edgeId}: fromNodeId '${edge.fromNodeId}' missing.`);
      }
      if (!this.nodes.has(edge.toNodeId)) {
        errors.push(`Dangling edge ${edgeId}: toNodeId '${edge.toNodeId}' missing.`);
      }
      if (edge.baseCost < 0) {
        errors.push(`Negative cost detected on edge ${edgeId}: ${edge.baseCost}`);
      }
    }

    const components = this.getConnectedComponents();
    return {
      isValid: errors.length === 0,
      errors,
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      componentsCount: components.length,
      isFullyConnected: components.length <= 1
    };
  }

  /**
   * Identifies weakly connected components using undirected BFS traversal.
   */
  getConnectedComponents() {
    const visited = new Set();
    const components = [];

    // Build undirected adjacency view for component analysis
    const undirectedAdj = new Map();
    for (const nodeId of this.nodes.keys()) {
      undirectedAdj.set(nodeId, []);
    }
    for (const edge of this.edges.values()) {
      if (undirectedAdj.has(edge.fromNodeId) && undirectedAdj.has(edge.toNodeId)) {
        undirectedAdj.get(edge.fromNodeId).push(edge.toNodeId);
        undirectedAdj.get(edge.toNodeId).push(edge.fromNodeId);
      }
    }

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const component = [];
        const queue = [nodeId];
        visited.add(nodeId);

        while (queue.length > 0) {
          const current = queue.shift();
          component.push(current);

          const neighbors = undirectedAdj.get(current) || [];
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Factory method to construct and validate a Graph from raw records.
   */
  static fromRecords(nodes = [], edges = []) {
    const graph = new Graph();
    nodes.forEach((n) => graph.addNode(n));
    edges.forEach((e) => graph.addEdge(e));
    const validation = graph.validate();
    if (!validation.isValid) {
      throw new Error(`Graph Validation Failed: ${validation.errors.join('; ')}`);
    }
    return graph;
  }
}

export default Graph;
