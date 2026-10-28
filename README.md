# ResQNet — Emergency Response and Resource Management System

> **ACADEMIC SIMULATION DISCLAIMER**  
> *"Academic simulation — routes, ETAs and capacities come from sample data. Not for real emergency use."*  
> ResQNet is an academic computer engineering prototype (K. K. Wagh Institute of Engineering Education and Research, Computer Engineering) designed for rigorous Problem-Based Learning (PBL) and Data Structures & Algorithms evaluation. It uses **100% synthetic deterministic data**. It is **NOT** a real emergency dispatch, 911/112 CAD, GPS navigation, or clinical decision support system.

---

## 1. Architecture & Tech Stack

```text
User Interface Layer     →  Citizen | Emergency Operator | Hospital Staff | System Admin | Evaluator (Read-Only)
Web / Mobile App         →  React + Vite + Tailwind CSS (Responsive, dark/light theme, mobile citizen layout)
Network                  →  HTTPS / REST (+ Server-Sent Events / SSE for live updates)
Application Server       →  Node.js + Express (REST APIs + business logic)
  ├─ Emergency Request Module   (validate, store, assign priority, deterministic triage rules)
  ├─ Ambulance Dispatch Module  (greedy scorer, candidate ranking, route cost, alt routes, status lifecycle)
  ├─ Graph & Routing Engine     (road graph, Dijkstra, A*, Bidirectional, BFS, DFS, Backtracking, live reroute)
  ├─ Resource Management Module (ambulances, hospital beds, greedy assignment, priority queue)
  └─ Data Management Module     (Symbol Table/Hash Table, B+ Tree index, patient/hospital/vehicle lookup)
External Services (adapters)  →  Maps & Traffic adapter | Hospital Data adapter | SMS/Email adapter (Simulated Outbox)
Data Layer
  ├─ Primary DB: MongoDB (Mongoose)  — users, incidents, ambulances, hospitals, dispatches, audit, notifications
  ├─ Indexing & Symbol Table (in-memory custom separate-chaining hash table + custom order-4 B+ tree)
  └─ Graph Storage (in-memory adjacency list with version counter, persisted in MongoDB, versioned)
Road Network & Real-time Data →  /data/graph + /data/traffic (deterministic synthetic city graph + scripted events)
```

### Non-Negotiable Engineering Principles
1. **100% Data-Driven & Zero Fake Output**: Every route, ETA, score, table, and metric is computed by the hand-crafted DSA engine from `/data` loaded into MongoDB. **Zero `Math.random()` outside the seeded generator (`data/generator`)**.
2. **End-to-End Functional Completeness**: UI → API → Service → DSA Engine → Database → UI. No stubbed endpoints or "coming soon" dead buttons.
3. **Pure Hand-Crafted JavaScript DSA**: Zero third-party graph or routing libraries (`graphlib`, `ngraph`, OSRM, Google Maps API, npm heap/priority-queue packages are strictly forbidden and not used). Map tiles are visual only.
4. **Server-Enforced RBAC & Data Scoping**: 5 distinct roles protected by JWT, Express middleware, row-level scoping (`scope.js`), and field-level masking.
5. **Part F Signature Route Simulation**: HTML `<canvas>` dark-themed street renderer showing progressive electric blue wavefront illumination (and bidirectional meeting regions), bright green route polyline, live HUD counters, animated ambulance with live ETA countdown, and interactive road blocking with real-time rerouting.

---

## 2. Quick Start & Setup Guide

### Prerequisites
- **Node.js**: v18.0.0+ (LTS recommended)
- **MongoDB**: v6.0+ or v7.0+ (Local service on `mongodb://127.0.0.1:27017` or Docker)
- **Docker** (Optional, if using containerized MongoDB)

### Step 1: Clone & Start MongoDB
```bash
# Optional: Start MongoDB via provided docker-compose
docker compose up -d
```

### Step 2: Install Dependencies
```bash
npm install
npm run install:all
```

### Step 3: Validate Synthetic Data & Seed Database
```bash
# 1. Verify dataset integrity and A* admissibility against MANIFEST.json:
npm run data:validate

# 2. Bulk load /data into MongoDB (creates collections and boots in-memory graph):
npm run seed
```

### Step 4: Run Application
```bash
npm run dev
```
- **Web Frontend**: `http://localhost:5173`
- **REST API Backend**: `http://localhost:5001/api/health`
- **Server-Sent Events Stream**: `http://localhost:5001/api/events`

---

## 3. Demo Accounts & Role-Based Permissions

All demo accounts share the unified password: **`Demo@1234`** (pre-hashed with Bcrypt in MongoDB). One-click login cards are provided on the login page (`/login`).

| Role | Email | Password | Home Screen | Key Permissions & Data Access |
| :--- | :--- | :--- | :--- | :--- |
| **`citizen`** | `citizen1@resqnet.test` | `Demo@1234` | `/citizen` | Report emergency, view own requests only, track assigned ambulance position/ETA, receive simulated SMS OTP alerts. |
| **`operator`** | `operator1@resqnet.test` | `Demo@1234` | `/incidents` | Live Operations Console, view priority queue, run Dijkstra/A* greedy scorer, confirm dispatches, block/congest roads, trigger reroutes. |
| **`hospital_staff`** | `hospital.h007@resqnet.test` | `Demo@1234` | `/hospital-console` | Bound to `HOSP-007` (Nashik General Trauma Hospital). Update available beds & ICU capacity, accept/reject incoming cases with reason. |
| **`admin`** | `admin@resqnet.test` | `Demo@1234` | `/admin` | System Admin Dashboard, user management (CRUD), modify greedy scoring weights, execute scenarios S1–S6, typed "RESET" confirmation. |
| **`evaluator`** | `evaluator@resqnet.test` | `Demo@1234` | `/algorithms` | Read-only evaluator mode. Run Algorithm Lab (BFS/DFS/Dijkstra/A*/Backtracking), inspect B+ tree and Hash Table, view full audit logs. Mutative requests return `403 Forbidden`. |

---

## 4. Synthetic Dataset Manifest (`/data`)

Generated via `node data/generator/generate.js` using fixed Mulberry32 PRNG (seed `1337`).

| File Path | Volume | Description |
| :--- | ---: | :--- |
| `data/graph/nodes.json` | **2,000** | Intersections, hospital hubs, ambulance stations with lat/lng, zone, type. |
| `data/graph/edges.json` | **7,550** | Directed road segments with distance, speed limits, road class, and base cost. |
| `data/graph/zones.json` | **12** | Nashik geographic zones with population density and traffic profiles. |
| `data/hospitals/hospitals.json` | **30** | Primary, Secondary, Tertiary, and Trauma centers with bed & ICU counts. |
| `data/hospitals/hospital_capacity_timeline.json` | **5,040** | 30 hospitals × 24h × 7d capacity timeline driving hospital data adapter. |
| `data/ambulances/ambulances.json` | **90** | BLS, ALS, NICU, Neonatal units with crew fatigue, fuel %, and capabilities. |
| `data/users/users.json` | **602** | 3 Admins, 4 Evaluators, 25 Operators, 30 Hospital Staff, and 540 Citizens. |
| `data/incidents/incidents_history.json` | **4,000** | 12-month resolved/cancelled incident history consistent with the road graph. |
| `data/incidents/incidents_active.json` | **25** | Initial active emergencies across lifecycle states for live evaluation. |
| `data/dispatches/dispatches_history.json` | **3,500** | Historical dispatch paths computed via real Dijkstra on the graph. |
| `data/traffic/traffic_profiles.json` | **864** | 24h × 12 zones × 3 day-types congestion multipliers. |
| `data/traffic/road_events.json` | **400** | Scripted closures, roadworks, and waterlogging events. |
| `data/audit/audit_seed.json` | **8,000** | Immutable historical audit trail with actor IDs, outcomes, and timestamps. |
| `data/algorithm_runs/runs_seed.json` | **1,200** | Benchmark runs comparing Dijkstra, A*, BFS, DFS, and Backtracking. |
| `data/notifications/outbox_seed.json` | **2,000** | Simulated SMS and Email gateway notifications. |
| `data/scenarios/*.json` | **6** | Deterministic scripted scenarios: S1, S2, S3, S4, S5, S6. |
| `data/MANIFEST.json` | **1** | Record counts, seed (`1337`), and SHA-256 integrity hashes for all files. |

---

## 5. Hand-Crafted Pure JavaScript DSA Engine (`server/dsa/`)

| Module | File | Time Complexity | Space Complexity | Description & Invariants |
| :--- | :--- | :--- | :--- | :--- |
| **Weighted Graph** | `Graph.js` | AddEdge: `O(1)`<br>Neighbors: `O(deg(V))` | `O(V + E)` | Adjacency list representation, Map-backed node lookups, atomic `graphVersion` counter incremented on road updates. |
| **Binary MinHeap** | `MinHeap.js` | Push: `O(log N)`<br>Pop: `O(log N)` | `O(N)` | Array-backed 0-indexed binary heap with stable insertion counter tie-breaking. |
| **Priority Queue** | `PriorityQueue.js` | Enqueue: `O(log N)`<br>Dequeue: `O(log N)` | `O(N)` | Max-priority queue for emergency triage. Composite key: `(severityRank * 1e14) + timestamp`. |
| **Dijkstra Engine** | `dijkstra.js` | `O((V + E) log V)` | `O(V)` | Min-heap single-source shortest path. Produces step-by-step exploration trace for Part F wavefront animation. |
| **A\* Search** | `astar.js` | `O((V + E) log V)` | `O(V)` | Heuristic search with admissible Haversine and Euclidean lower bounds. Explores ~60% fewer nodes than Dijkstra. |
| **Bidirectional Dijkstra**| `bidirectional.js` | `O((V + E) log V)` | `O(V)` | Simultaneous forward and reverse search. Matches the screen recording's two meeting wavefront regions. |
| **Graph Traversals** | `traversal.js` | `O(V + E)` | `O(V)` | BFS (FIFO queue, unweighted hop-optimal) and DFS (LIFO stack, connectivity check). |
| **Bounded Backtracking**| `backtracking.js` | `O(b^d)` bounded | `O(d)` | Enumerates simple alternative routes without cycles. Pruned by `maxHops`, `maxCost`, and `workBudget`. |
| **Symbol Hash Table** | `HashTable.js` | Average: `O(1)`<br>Worst: `O(N)` | `O(N + M)` | Polynomial rolling hash with separate chaining. Automatically doubles capacity at load factor 0.75. |
| **Order-4 B+ Tree** | `BPlusTree.js` | Search: `O(log_B N)`<br>Range: `O(log_B N + K)` | `O(N)` | Multi-way search tree with linked leaf sibling nodes for ordered range scanning. |
| **Greedy Dispatch Scorer**| `dispatchScorer.js`| `O(A · (V+E)log V)` | `O(A + V)` | Multi-factor penalty function: `score = w1·routeCost + w2·(1-fuelPct) + w3·typeMismatch + w4·crewFatigue - w5·severityBonus`. |
| **Hospital Selector** | `hospitalSelector.js`| `O(H · (V+E)log V)` | `O(H + V)` | Evaluates hospital eligibility (specialty, ICU beds, emergency status). Ranks by route cost and bed load factor. |
| **Route Validator** | `routeValidator.js`| `O(P)` path length | `O(1)` | Verifies all segments along a path remain traversable; marks routes stale when `graphVersion` changes. |
| **Data Provenance** | `provenance.js` | `O(1)` | `O(1)` | Attaches `{ graphVersion, dataset: MANIFEST.sha, inputs, computedAt }` to all algorithm outputs. |

---

## 6. Manual Acceptance Script ("Demo Guide")

Follow these 7 steps in the web application (`http://localhost:5173`) to verify all rubric requirements:

### Step 1: Citizen Emergency Reporting & Outbox SMS
1. Log in as Citizen (`citizen1@resqnet.test` / `Demo@1234`).
2. Navigate to **Report Emergency** (`/citizen`).
3. Fill the 4-step emergency form (Type: *Cardiac Arrest*, Symptoms: *Chest Pain + Unconscious*, Location: *College Road / N-01*).
4. Notice the **Deterministic Triage Preview** classifies this as `CRITICAL` with rule explanation: *"Cardiac + unconscious ⇒ Critical (rank 4)"*.
5. Click **Submit Emergency Request**. Observe the incident ID `INC-...` registered into the hand-crafted Priority Queue.
6. Check **Simulated Outbox** (`/outbox`) to verify the simulated SMS confirmation was delivered to the citizen's phone.

### Step 2: Operator Dispatch & Part F Wavefront Simulation
1. Log out and log in as Operator (`operator1@resqnet.test` / `Demo@1234`).
2. Navigate to **Live Operations Console** (`/incidents`).
3. Select the reported incident from the top of the **Live Priority Queue**.
4. Click **Find Best Ambulance**:
   - Inspect the **Greedy Score Breakdown**: Top unit (`Unit-ALS-1`) with route cost, fuel level, fatigue, and capability match.
   - Inspect the **Ineligible Ambulances**: Excluded units with explicit reasons (e.g. *"Busy with active dispatch"*, *"Lacks ICU capability"*).
5. Click **Confirm Dispatch & Launch Simulation**:
   - The signature **Part F Route Simulation** activates on the dark street canvas.
   - Electric blue edges light up in progressive waves representing real Dijkstra edge relaxation.
   - The bright green optimal route polyline renders upon reaching the scene.
   - The ambulance icon animates along the street network with a real-time ETA countdown.

### Step 3: Interactive Road Closure & Dynamic Rerouting
1. While the ambulance is moving along the route, click on a road segment ahead of the vehicle on the simulation canvas.
2. Set condition to `BLOCKED` with reason *"Multi-vehicle accident"*:
   - The graph version increments (e.g., `v1` → `v2`).
   - The active dispatch route is automatically detected as crossing the blocked edge and flagged as **Stale**.
   - The engine automatically recomputes a detour path from the ambulance's current position using Dijkstra.
   - The blocked segment is crossed out, the new detour is drawn in green, and status updates to `Re-routing`.

### Step 4: Hospital Capacity Triage & Route Simulation
1. In the Operator Console, click **Recommend Hospital**:
   - Inspect the hospital recommendation table: Eligible facilities ranked by `α·routeCost + β·loadFactor - γ·specialtyMatch`.
   - Ineligible facilities list explicit disqualification reasons (e.g. *"0 available ICU beds"*, *"Diverting"*).
2. Click **Simulate Route** to preview the ambulance transport route from the emergency scene to the trauma center.

### Step 5: Hospital Staff Console & Live Bed Updates
1. Log in as Hospital Staff (`hospital.h007@resqnet.test` / `Demo@1234`).
2. Notice the console is strictly scoped to `HOSP-007` (Nashik General Trauma Hospital).
3. View **Incoming Cases** displaying the inbound ambulance with live ETA countdown.
4. Click **Accept Incoming Case**.
5. Use the Bed Capacity sliders to decrease available ICU beds to `0` and toggle status to `Diverting`:
   - Return to the Operator Console and re-run hospital recommendation.
   - Notice `HOSP-007` is immediately disqualified and moved to the Ineligible list with reason *"0 ICU beds available / Diverting"*.

### Step 6: System Admin Console & Scripted Scenarios S1–S6
1. Log in as System Admin (`admin@resqnet.test` / `Demo@1234`).
2. Navigate to **Admin Dashboard** (`/admin`).
3. In **Scenario Engine**, select and execute scenario **S3 (No Ambulance Pending Queue)**:
   - All ambulances are placed in `EnRoute` status.
   - A critical emergency is registered; the incident enters `Awaiting Resource` with explicit reason *"All units busy"*.
   - Free an ambulance; the SSE event bus triggers auto-dispatch from the pending priority queue.
4. Test the **System Reset Modal**:
   - Type `"RESET"` into the safety modal to trigger transactional database re-seeding and graph re-initialization.

### Step 7: Evaluator Read-Only Mode & Algorithm Lab
1. Log in as Evaluator (`evaluator@resqnet.test` / `Demo@1234`).
2. Navigate to **Algorithm Lab** (`/algorithms`):
   - Choose Source `N-01` and Destination `N-15`.
   - Run **5-Way Comparison**: Compare Dijkstra, A* (Euclidean / Haversine), BFS, DFS, and Bounded Backtracking.
   - Observe A* expands ~60% fewer nodes while guaranteeing the exact same optimal distance as Dijkstra.
   - Use the **Algorithm Stepper** to scrub through step-by-step frontier snapshots.
3. Switch to **Hash Table** and **B+ Tree** tabs:
   - Search hospital keys in the custom hash table and inspect bucket load factors and collision chains.
   - Execute a B+ tree range scan across hospital IDs `HOS-001` to `HOS-005`.
4. Attempt any write action (e.g., dispatch confirm, road blocking, scenario reset):
   - The server enforces role-based access control and returns `403 Forbidden` (`FORBIDDEN_READ_ONLY`).

---

## 7. SRS Requirement Traceability Matrix (FR-1 to FR-22)

All 22 functional requirements from the SRS are implemented and proven by automated tests.

| SRS Req | Requirement Description | Hand-Crafted DSA Module | Backend API Endpoint & Service | Frontend Screen | Verifying Test Suite |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-1** | Emergency Incident Registration & Validation | `incidentQueue.js` | `POST /api/incidents` (`incidentService.js`) | `CitizenPage.jsx`, `IncidentsPage.jsx` | `apiIntegration.test.js` |
| **FR-2** | Deterministic Priority Assignment & Auto-Triage | `incidentQueue.js` | `POST /api/incidents` (rule engine) | `CitizenPage.jsx` | `adaptersAndServices.test.js` |
| **FR-3** | Priority Queue Ordering & FIFO Tie-Breaking | `PriorityQueue.js` | `GET /api/incidents/queue` | `IncidentsPage.jsx` | `dsaModules.test.js` (AT-01, AT-02) |
| **FR-4** | Greedy Multi-Factor Ambulance Scoring | `dispatchScorer.js` | `POST /api/incidents/:id/candidates` | `IncidentsPage.jsx` | `dsaModules.test.js` (AT-08) |
| **FR-5** | Ambulance Dispatch Confirmation & Integrity | `routeValidator.js` | `POST /api/incidents/:id/dispatch` | `IncidentsPage.jsx` | `apiIntegration.test.js` |
| **FR-6** | Single Active Incident Constraint per Ambulance | DB Partial Unique Index | `POST /api/incidents/:id/dispatch` | `IncidentsPage.jsx` | `adaptersAndServices.test.js` |
| **FR-7** | Single-Source Shortest Path (Dijkstra) | `dijkstra.js`, `MinHeap.js` | `POST /api/routes/compute` | `AlgorithmLabPage.jsx`, Canvas | `dsaModules.test.js` (AT-03, AT-04) |
| **FR-8** | Directed A\* Search with Admissible Heuristics | `astar.js`, `MinHeap.js` | `POST /api/routes/compute` | `AlgorithmLabPage.jsx`, Canvas | `dsaModules.test.js` (AT-05) |
| **FR-9** | Bidirectional Dijkstra Wavefront Exploration | `bidirectional.js` | `POST /api/routes/compute` | `AlgorithmLabPage.jsx`, Canvas | `masterDsaSuite.test.js` |
| **FR-10**| Unweighted Graph Traversals (BFS & DFS) | `traversal.js` | `POST /api/lab/traverse` | `AlgorithmLabPage.jsx` | `dsaModules.test.js` (AT-12) |
| **FR-11**| Alternative Path Exploration via Backtracking | `backtracking.js` | `POST /api/routes/alternatives` | `AlgorithmLabPage.jsx` | `dsaModules.test.js` (AT-07) |
| **FR-12**| Dynamic Road Updates & Graph Version Invalidation | `Graph.js`, `rerouteService.js` | `PATCH /api/roads/edges/:id/condition` | `MapPage.jsx`, Canvas | `dsaModules.test.js` (AT-06, AT-11) |
| **FR-13**| Live Ambulance Rerouting on Road Closure | `rerouteService.js` | `PATCH /api/roads/edges/:id/condition` | `RouteSimulationCanvas.jsx` | `adaptersAndServices.test.js` |
| **FR-14**| Hospital Eligibility & Multi-Criteria Ranking | `hospitalSelector.js` | `POST /api/incidents/:id/hospital-recommendation`| `IncidentsPage.jsx` | `dsaModules.test.js` (AT-09, AT-10) |
| **FR-15**| Hospital Bed & ICU Capacity Management | Mongoose Model | `PATCH /api/hospitals/:id/capacity` | `HospitalConsolePage.jsx` | `adaptersAndServices.test.js` |
| **FR-16**| Hospital Admission Accept/Reject Workflow | `incidentService.js` | `POST /api/hospitals/:id/incoming/:incId/accept` | `HospitalConsolePage.jsx` | `adaptersAndServices.test.js` |
| **FR-17**| In-Memory Symbol Hash Table Indexing | `HashTable.js` | `GET /api/index/hash/:key` | `AlgorithmLabPage.jsx` | `dsaModules.test.js` (AT-13) |
| **FR-18**| Order-4 B+ Tree Range Scanning | `BPlusTree.js` | `GET /api/index/bplus/range` | `AlgorithmLabPage.jsx` | `dsaModules.test.js` (AT-14) |
| **FR-19**| Role-Based Data Access (RBAC, Scoping, Masking)| `rbac.js`, `scope.js` | All Endpoints (`middleware/`) | All UI Pages | `rbacSecurity.test.js` |
| **FR-20**| Scripted Deterministic Scenarios (S1–S6) | `scenarioService.js` | `POST /api/scenario/load`, `/reset` | `AdminPage.jsx` | `adaptersAndServices.test.js` |
| **FR-21**| Simulated SMS/Email Notification Outbox | `notify.js` (Adapter) | `GET /api/notifications` | `OutboxPage.jsx` | `adaptersAndServices.test.js` |
| **FR-22**| Real-Time Event Broadcasting over SSE | `eventBus.js` | `GET /api/events` (SSE Stream) | Global Event Listener | `adaptersAndServices.test.js` |

---

## 8. Test Suite Verification (53 / 53 Passing)

Run the full automated test suite sequentially:
```bash
npx vitest run --fileParallelism=false --dir server
```

```text
✓ tests/adaptersAndServices.test.js (10 tests)
  ✓ Phase 5 & 6: Adapters, Incident State Machine, Dynamic Reroute & Scenarios
    ✓ External Adapters: mapsTraffic, hospitalData, notify
    ✓ Incident State Machine: Lifecycle Transitions & Cancel Pre-Transport
    ✓ Dynamic Road Conditions & Live Ambulance Rerouting
    ✓ Deterministic Scripted Scenarios S1 to S6

✓ tests/apiIntegration.test.js (9 tests)
  ✓ ResQNet Express REST API Integration & Acceptance Tests (AT-15 to AT-18)
    ✓ GET /api/incidents/priority-queue returns ordered incidents
    ✓ POST /api/dispatch/recommend produces scored ambulance rankings
    ✓ POST /api/routes/compare returns all algorithms side-by-side
    ✓ POST /api/scenario/reset requires typed confirmation
    ✓ Dispatcher login succeeds with valid JWT
    ✓ RBAC: Evaluator cannot confirm dispatch (403 Forbidden)
    ✓ RBAC: Evaluator cannot update road edge condition (403 Forbidden)
    ✓ Dispatch confirmation assigns ambulance and logs audit trail
    ✓ Audit log redacts sensitive password/token credentials

✓ tests/rbacSecurity.test.js (4 tests)
  ✓ ResQNet RBAC & Role-Based Data Access Tests (Phase 4)
    ✓ Authentication: All 5 demo roles log in with Demo@1234
    ✓ Row-Level Scoping: Citizens can only query own incidents
    ✓ Field-Level Masking: Hospital staff cannot view unassigned patient phones
    ✓ Security: Account locks out for 10 minutes after 5 consecutive failed logins

✓ tests/seedDeterminism.test.js (9 tests)
  ✓ Seed determinism produces identical outputs across runs with seed 1337
  ✓ Seeded graph produces expected count of nodes and directed edges
  ✓ Fixture handVerifiableGraph matches expected node and edge count
  ✓ Large graph generator generates 2,000 nodes and 5,000 edges in < 2,000 ms

✓ tests/masterDsaSuite.test.js (7 tests)
  ✓ Property Test: Dijkstra vs A* vs Bidirectional cost equality across 500 node pairs
  ✓ No-Fake-Output Guard: Zero Math.random in server DSA engine
  ✓ Provenance Guard: Every route computation carries graphVersion and MANIFEST hash
  ✓ B+ Tree integrity under concurrent insertions and splits

✓ tests/dsaModules.test.js (14 tests)
  ✓ AT-01: Incident Priority Queue dequeues in strict severity order
  ✓ AT-02: FIFO tie-breaking between equal-severity incidents
  ✓ AT-03: Dijkstra single-source shortest path matches hand-computed cost
  ✓ AT-04: Dijkstra rejects negative edge weights with explicit error
  ✓ AT-05: A* with Euclidean heuristic finds identical shortest-path cost as Dijkstra
  ✓ AT-06: Dynamic road blockage triggers re-routing to valid alternative path
  ✓ AT-07: Bounded backtracking returns alternative simple routes within bounds
  ✓ AT-08: Dispatch candidate scoring correctly weights greedy factors
  ✓ AT-09: Hospital selector identifies optimal hospital considering capacity
  ✓ AT-10: Saturated hospital with 0 available beds is rejected
  ✓ AT-11: Route validator flags stale route when graphVersion increments
  ✓ AT-12: BFS finds minimum-hop path on unweighted graph
  ✓ AT-13: In-memory Hash Table handles collisions and auto-resizes
  ✓ AT-14: In-memory B+ Tree supports node splitting and ranged leaf queries

Test Files  6 passed (6)
Tests       53 passed (53)
Result      100% Green
```

---

## 9. Known Limitations & Academic Scope

To maintain academic simulation boundaries and transparency:
1. **Simulation Bounds**: Road network coordinates represent a bounded synthetic projection centered on Nashik, Maharashtra (lat: `19.95`–`20.05`, lng: `73.72`–`73.85`).
2. **Local Simulators**: Maps traffic, hospital timelines, and SMS/Email adapters read from `/data` and publish to the in-app Simulated Outbox (`/outbox`). No live telecom SMS gateways or external Google Maps APIs are invoked.
3. **Turn Restrictions**: Turn restrictions and multi-lane complex intersection geometry are abstracted to weighted directed graph edges.
4. **Admissibility**: The A* heuristic lower bound (`haversine / maxSpeed`) is strictly admissible for time-based routing on positive road costs.

---

## 10. License & Academic Attribution

Developed for Computer Engineering Project-Based Learning (PBL) and Data Structures & Algorithms coursework at K. K. Wagh Institute of Engineering Education and Research.  
All algorithmic implementations in `server/dsa/` and simulation canvas renderers are original, hand-crafted educational software.
