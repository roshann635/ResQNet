# ResQNet Synthetic Dataset Documentation (`/data`)

This directory houses the deterministic, high-volume synthetic datasets powering **ResQNet — Emergency Response and Resource Management System**.

> [!NOTE]
> All numbers, routes, ETAs, scores, and dispatch analytics are computed strictly from these datasets by our hand-crafted pure JavaScript DSA engines. No `Math.random()`, dummy placeholders, or mocked responses are permitted at runtime.

---

## 1. Dataset Generation & Integrity

- **Fixed PRNG Seed**: `1337` (configured in [`data/config/seed.json`](file:///Users/aditibhaskarshinde/dsa_project/ResQNet/data/config/seed.json) via Mulberry32 algorithm)
- **Geographic Area**: Illustrative road network of Nashik Metrosphere (lat: 19.95–20.05°N, lng: 73.72–73.85°E) with Godavari River barrier crossed exclusively by 3 designated bridge pairs (Holkar, Victoria, Kalaram).
- **Master SHA-256**: Maintained in [`data/MANIFEST.json`](file:///Users/aditibhaskarshinde/dsa_project/ResQNet/data/MANIFEST.json).
- **Commands**:
  - Re-generate dataset: `npm run data:generate`
  - Validate dataset constraints: `npm run data:validate`

---

## 2. Directory Layout & Record Counts

| Category / Path | Record Count | Description & Schema Invariants |
| :--- | :--- | :--- |
| `graph/zones.json` | **12** | Zone polygons, centroids, population density across Nashik. |
| `graph/nodes.json` | **2,000** | Road intersections, stations, hospital hubs, landmarks, and bridge gates. |
| `graph/edges.json` | **7,550** | Directed road segments with distance in meters, speed limit (30–80 km/h), and base traversal cost in seconds. |
| `hospitals/hospitals.json` | **30** | Hospital facilities categorized into Trauma, Tertiary, Secondary, and Primary tiers. Includes `HOSP-007` (Metro Central Trauma Center). |
| `hospitals/hospital_capacity_timeline.json` | **5,040** | 30 hospitals × 24 hours × 7 days of historical bed & ICU availability. |
| `ambulances/ambulances.json` | **90** | Emergency fleet (ALS, BLS, NICU, Neonatal, Air-sim) with crew rosters and live fuel metrics. |
| `users/users.json` | **602** | 3 Admins, 4 Evaluators, 25 Operators, 30 Hospital Staff, and 540 Citizens with pre-hashed Bcrypt credentials (`Demo@1234`). |
| `incidents/incidents_history.json` | **4,000** | 12 months of resolved/cancelled incidents with realistic type/severity distributions (60% Low/Med, 30% High, 10% Critical). |
| `incidents/incidents_active.json` | **25** | Active live incidents distributed across lifecycle states. |
| `dispatches/dispatches_history.json` | **3,500** | Historical dispatch missions with verified continuous paths across the graph. |
| `traffic/traffic_profiles.json` | **864** | Diurnal congestion multipliers across 24h × 12 zones × 3 day-types. |
| `traffic/road_events.json` | **400** | Scripted closures and congestion events with start/end timestamps and cause tags. |
| `audit/audit_seed.json` | **8,000** | Comprehensive immutable audit trail of dispatch and system actions. |
| `algorithm_runs/runs_seed.json` | **1,200** | Historical benchmark runs of Dijkstra, A*, BFS, DFS, and Backtracking. |
| `notifications/outbox_seed.json` | **2,000** | Simulated SMS and Email dispatch alerts tied to triage events. |
| `scenarios/*.json` | **6** | Scripted scenario definitions (S1 to S6) for repeatable evaluations. |
| `MANIFEST.json` | **1** | Record counts and cryptographic SHA-256 checksums for every file. |

---

## 3. Heuristic Admissibility Guarantee

The A\* heuristic employs Haversine great-circle distance divided by the maximum road network speed limit ($v_{\max} = 80\text{ km/h} \approx 22.22\text{ m/s}$):
$$h(u, v) = \frac{\text{haversine}(u, v)}{v_{\max}} \le \text{actual\_cost}(u, v)$$
This guarantee is formally verified for 100% of the 7,550 graph edges during `npm run data:validate`.
