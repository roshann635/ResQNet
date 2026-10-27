# ResQNet — Emergency Response & Route Optimization Platform

> **ACADEMIC SIMULATION DISCLAIMER**  
> ResQNet is an educational computer engineering project-based learning (PBL) simulation. It uses **100% synthetic deterministic data**. It is **NOT** a real emergency dispatch, 911/112 CAD, navigation, or hospital-capacity system. Never use this software for real-world emergency or clinical decisions.

---

## 1. Project Overview & Architecture

ResQNet models an end-to-end emergency dispatch and routing system designed for academic evaluation. In compliance with strict PBL engineering constraints:
- **Zero Third-Party DSA Libraries**: All graphs, heaps, priority queues, hash tables, B+ trees, search traversals, heuristic shortest paths, and backtracking algorithms are hand-crafted in pure, readable JavaScript.
- **Deterministic Synthetic Generation**: 100% reproducible test data seeded with Mulberry32 PRNG (seed `1337`). Zero real people, phone numbers, or healthcare facilities.
- **Role-Based Access Control (RBAC)**: Enforced via Express backend middleware with JWT authentication (`admin`/dispatcher with full write access vs. `evaluator` strictly read-only).
- **Dual Visualizer**: Real Leaflet geocoded map + tile-free, SVG graph view that runs completely offline.

```text
┌─────────────────────────────────────────────────────────────────┐
│ React + Vite + Tailwind CSS Frontend (Port 5173)                │
│ • Live Interactive Map (Leaflet) + Offline SVG Graph Canvas     │
│ • Priority Queue Dispatcher Console & Dynamic Route Overlays    │
│ • Algorithm Lab with Step-by-Step Traversal & Heuristic Playback│
│ • B+ Tree & Hash Table Index Inspection Sandbox                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │ JSON REST API (JWT Authenticated)
┌───────────────────────────────▼─────────────────────────────────┐
│ Node.js + Express REST API Backend (Port 5001)                  │
│ • RBAC Middleware (requireAuth, requireAdmin)                   │
│ • Audited Dispatch & Route Invalidation Pipelines              │
└───────────────────────────────┬─────────────────────────────────┘
                                │ In-Memory Synchronized State
┌───────────────────────────────▼─────────────────────────────────┐
│ Pure-JS DSA Engine (Zero 3rd-Party Libs)                        │
│ • Binary Min-Heap (O(log V) push/pop)                           │
│ • Incident Priority Queue (Critical > High > Med > Low + FIFO)  │
│ • Weighted Directed Graph (Adjacency List + Version Counter)    │
│ • Dijkstra Shortest Path & A* (Euclidean/Haversine Heuristics)  │
│ • BFS / DFS Step-by-Step Graph Traversals                       │
│ • Bounded Backtracking Alternative Path Explorer                │
│ • Separate Chaining Hash Table (Polynomial Rolling Hash)        │
│ • Order-4 B+ Tree Index (Leaf-Chained Range Queries)            │
│ • Multi-Penalty Greedy Dispatch Candidate Scorer (w1..w4)       │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Mongoose Models
┌───────────────────────────────▼─────────────────────────────────┐
│ MongoDB Persistence (127.0.0.1:27017/resqnet)                   │
│ RoadNodes, RoadEdges, Ambulances, Hospitals, Incidents,         │
│ Dispatches, AlgorithmRuns, AuditLogs (Credentials Auto-Redacted)│
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Quick Start & Running the Project

### Prerequisites
- **Node.js**: v18.0.0+ (LTS recommended)
- **MongoDB**: v6.0+ running locally on default port `27017`

### 1. Environment Setup
The project uses root workspace management. Configuration files are provided out of the box:
```bash
# Server configuration (.env already configured to port 5001 to prevent macOS AirPlay conflicts)
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/resqnet
JWT_SECRET=resqnet_academic_simulation_jwt_secret_key_2026_super_secure!
SEED_PRNG_KEY=1337
```

### 2. Install Dependencies
```bash
npm install
npm run install:all
```

### 3. Seed Deterministic Synthetic Data
Populate MongoDB with 40 nodes, 116 road edges across 6 zones, 8 ambulances, 5 hospitals, 12 triage incidents, 30 historical dispatches, and 150 audit entries:
```bash
npm run seed
```

To run the large-scale graph benchmark (2,000 nodes, 5,000 edges generated in memory):
```bash
npm run seed:large
```

### 4. Run the Project
Start both the Express REST API backend and the React Vite client simultaneously:
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API & Health Check**: `http://localhost:5001/api/health`

---

## 3. Demo Credentials & Role Access

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Dispatcher (Admin)** | `admin@resqnet.test` | `ResQNet@Admin2026!` | **Full Access**: Confirm dispatches, modify road edge conditions, toggle congestion/blocks, reset scenario. |
| **Evaluator** | `evaluator@resqnet.test` | `ResQNet@Eval2026!` | **Read-Only**: Explore map, inspect priority queues, execute algorithm lab, view audit logs. Mutative actions are rejected by backend middleware with `403 Forbidden`. |

*Note: The frontend automatically auto-logs in with the Dispatcher account on first launch for frictionless live demonstration.*

---

## 4. Hand-Crafted DSA Modules & Algorithmic Complexity

| Module & Data Structure | Theoretical Big-O Time | Space Complexity | Real Measured Runtime | PBL Role & Key Invariants |
| :--- | :--- | :--- | :--- | :--- |
| **Binary Min-Heap** (`MinHeap.js`) | Insert: `O(log N)`<br>ExtractMin: `O(log N)` | `O(N)` | < 0.01 ms | Array-backed 0-indexed heap. Backs Dijkstra, A\*, and PQ. |
| **Incident Priority Queue** (`PriorityQueue.js`) | Enqueue: `O(log N)`<br>Dequeue: `O(log N)` | `O(N)` | < 0.02 ms | Composite key: `Critical (0) > High (1) > Medium (2) > Low (3)`. Strict timestamp FIFO tie-breaking. |
| **Dijkstra Shortest Path** (`dijkstra.js`) | `O((V + E) log V)` | `O(V)` | **0.33 ms** (Nashik graph) | Non-negative edge weights. Returns optimal distance, path, nodes expanded, and step playback log. |
| **A\* Search** (`astar.js`) | `O((V + E) log V)` | `O(V)` | **0.27 ms** (Nashik graph) | `f(n) = g(n) + h(n)`. Admissible Euclidean & Haversine distance heuristics expand ~60% fewer nodes than Dijkstra. |
| **BFS** (`bfs.js`) | `O(V + E)` | `O(V)` | 0.15 ms | Unweighted minimum-hop shortest path search using FIFO queue. |
| **DFS** (`dfs.js`) | `O(V + E)` | `O(V)` | 0.14 ms | Topological connectivity inspection using LIFO stack. |
| **Bounded Backtracking** (`backtracking.js`) | `O(b^d)` bounded | `O(d)` recursion depth | 0.42 ms | Choose-explore-undo recursive simple path enumeration with visited sets, `maxHops: 10`, `maxCost: 50`, `maxResults: 3`. |
| **Separate Chaining Hash Table** (`HashTable.js`) | Expected `O(1)`<br>Worst `O(N)` | `O(N + M)` buckets | 0.05 ms | Polynomial rolling hash (`hash = (hash * 31 + charCode) % capacity`). Auto-resizes (doubles) when load factor > 0.75. |
| **Order-4 B+ Tree** (`BPlusTree.js`) | Search: `O(log_B N)`<br>Range: `O(log_B N + K)` | `O(N)` | 0.08 ms | Internal nodes store routing keys; leaf nodes contain records and linked-list sibling pointers for range queries. |
| **Multi-Penalty Dispatch Scorer** (`dispatchScorer.js`) | `O(A · (V + E) log V)` | `O(A + V)` | 1.82 ms | Evaluates available ambulances via weighted greedy penalty: `0.40·RouteCost + 0.25·Utilization + 0.20·CapabilityDeficit + 0.15·Unreliability`. |

---

## 5. Automated Acceptance Test Suite (AT-01 to AT-18)

ResQNet includes a comprehensive test suite executed via Vitest and Supertest:
```bash
npm test
```
**Results: 27/27 Tests Passing (100% Pass Rate)**

```text
✓ tests/seedDeterminism.test.js (4 tests)
  ✓ Seed determinism produces identical outputs across runs with seed 1337
  ✓ Seeded graph produces expected count of nodes and directed edges
  ✓ Fixture handVerifiableGraph matches expected node and edge count
  ✓ Large graph generator generates 2,000 nodes and 5,000 edges in < 2,000 ms (Actual: 5.69 ms)

✓ tests/dsaModules.test.js (14 tests)
  ✓ AT-01: Incident Priority Queue dequeues in strict severity order
  ✓ AT-02: FIFO tie-breaking between equal-severity incidents INC-001 and INC-002
  ✓ AT-03: Dijkstra single-source shortest path matches hand-computed cost on 6-node fixture
  ✓ AT-04: Dijkstra rejects negative edge weights with explicit error
  ✓ AT-05: A* with Euclidean heuristic finds identical shortest-path cost as Dijkstra
  ✓ AT-06: Dynamic road blockage triggers re-routing to valid alternative path
  ✓ AT-07: Bounded backtracking returns at least two alternative routes within bounds
  ✓ AT-08: Dispatch candidate scoring correctly weights routeCost, utilization, capability, reliability
  ✓ AT-09: Hospital selector identifies optimal hospital considering specialty and capacity
  ✓ AT-10: Saturated hospital with 0 available beds is rejected in favor of capable facility
  ✓ AT-11: Route validator flags stale route when graphVersion increments
  ✓ AT-12: BFS finds minimum-hop path on unweighted graph
  ✓ AT-13: In-memory Hash Table handles collisions and auto-resizes at load factor threshold
  ✓ AT-14: In-memory B+ Tree supports order-4 inserts, node splitting, and ranged leaf queries

✓ tests/apiIntegration.test.js (9 tests)
  ✓ AT-15: GET /api/incidents/priority-queue returns ordered incidents matching pure-JS PQ
  ✓ AT-16: POST /api/dispatch/recommend produces scored ambulance rankings with penalty breakdown
  ✓ AT-17: POST /api/routes/compare returns all 5 algorithms side-by-side with theoretical vs measured metrics
  ✓ AT-18: POST /api/scenario/reset requires explicit confirmation and logs an audit entry
  ✓ Auth: Dispatcher login succeeds with valid JWT
  ✓ RBAC: Evaluator cannot confirm dispatch (403 Forbidden)
  ✓ RBAC: Evaluator cannot update road edge condition (403 Forbidden)
  ✓ Dispatch confirm: Assigns ambulance, updates hospital capacity, logs audit trail
  ✓ Audit log: Redacts sensitive password/token credentials in payload
```

---

## 6. Golden-Path Evaluator Walkthrough Script

Follow these steps in the running browser (`http://localhost:5173`) to demonstrate all PBL rubric requirements:

### Step 1: Dashboard & Live Metric Status
1. Navigate to `/`.
2. Notice the **Persistent Simulation Banner** at the top (`Academic simulation. Synthetic data. Not for real emergency use.`).
3. View the metric cards: **8 Pending Incidents**, **8 Ambulances (5 Available, 2 En-Route, 1 Maintenance)**, **5 Hospitals**, and **Graph Version 1**.
4. Observe the **Incident Priority Queue Preview** showing `INC-001` (Critical Cardiac Arrest) ranked at the top.

### Step 2: Live Incident Triage & Recommendation
1. Click **Incidents & Queue** in the navbar (`/incidents`).
2. Notice `INC-001` and `INC-002` are both `CRITICAL`, but `INC-001` is dequeued first because its timestamp is 1 minute earlier (AT-02 FIFO tie-break).
3. Click on **INC-001** to view the triage drawer.
4. Click **Get Recommendation**:
   - The engine runs Dijkstra from all available ambulances to `N-01`.
   - `AMB-001` (Advanced Life Support) is ranked #1 with an optimal route cost of `0.70` and total penalty score of `0.28`.
   - The engine selects `HOS-001` (City Trauma Hospital, cardiac care capable, 4 available beds). Notice `HOS-004` is bypassed because it has 0 available beds.
5. Click **Confirm Dispatch**:
   - Status updates to `DISPATCHED`.
   - `AMB-001` status switches to `DISPATCHED`.
   - `HOS-001` available beds decrements to `3`.
   - An immutable entry is written to the Audit Log.

### Step 3: Dynamic Graph Invalidation & Re-Routing
1. Click **Live Map / Graph** in the navbar (`/map`).
2. Toggle between the **Geographic Leaflet Map** and the **Offline SVG Topology View**.
3. Locate edge `E-39-40` (the bridge connecting the West Industrial Zone to `HOS-005`).
4. Click the edge to open the **Edge Condition Modal**.
5. Change its status from `NORMAL` to `BLOCKED` (simulating structural bridge failure) and save:
   - Notice the graph version increments from `v1` to `v2`.
   - Any previous routes using `E-39-40` are immediately flagged as **STALE / INVALIDATED** (AT-11).
   - Re-computing routes to `HOS-005` immediately discovers alternative detour routes or reports unreachability.

### Step 4: Algorithm Laboratory & Heuristic Comparison
1. Click **Algorithm Lab** in the navbar (`/algorithms`).
2. Select Source `N-01` (College Road) and Destination `N-30` (Highway Bypass).
3. Click **Compare All 5 Algorithms**:
   - Inspect the side-by-side performance matrix:
     - **Dijkstra**: Expanded 25 nodes, examined 75 edges, route cost `2.66`.
     - **A\* (Euclidean)**: Expanded only 10 nodes, examined 29 edges, route cost `2.66` (Identical optimal cost, 60% fewer node expansions!).
     - **BFS**: Route cost `3.10` (unweighted hop-optimal, but suboptimal for weighted distance).
     - **DFS**: Route cost `14.80` (arbitrary path exploration).
     - **Backtracking**: Discovered 3 alternative simple paths without cycles.
4. Select **A\*** and use the **Step-by-Step Playback Controls** (Next Step, Previous Step, Play/Pause) to watch the frontier open set and closed set expand toward the goal in real-time.

### Step 5: Indexing Demonstrations (Hash Table & B+ Tree)
1. In the Algorithm Lab, switch to the **Data Structures & Indexes** tab.
2. **Hash Table Inspector**:
   - Enter a node ID (e.g., `N-15`) to view its bucket index, rolling hash value, and collision chain.
   - Inspect load factor metrics (`0.65 / 0.75 threshold`) and dynamic resizing logs.
3. **B+ Tree Range Query**:
   - Query road edges with length between `1.0 km` and `2.5 km`.
   - Watch the order-4 B+ tree traverse internal routing keys down to the leaf node, and follow leaf sibling pointers to retrieve the contiguous sorted range in `O(log N + K)` time.

### Step 6: Evaluator RBAC Audit
1. Click the profile badge in the top right and switch to **Evaluator** (`evaluator@resqnet.test`).
2. Attempt to confirm a dispatch or block a road edge:
   - The UI disables or blocks the action, and the backend Express middleware enforces a `403 Forbidden` response.
3. Navigate to **Analytics & Audit** (`/analytics`) to inspect the immutable audit trail of all prior dispatches and algorithm runs.

---

## 7. License & Credits

Developed for Computer Engineering Project-Based Learning (PBL) Evaluation.  
All code in `server/dsa/` is original, hand-crafted educational software.
