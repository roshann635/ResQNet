# ResQNet Synthetic Data Catalog & Seed Documentation

> **Academic Simulation Disclaimer**: All data generated and stored within ResQNet is 100% synthetic, deterministic, and generated for educational and benchmarking purposes only. It models an urban emergency response network without using real individuals, contact details, actual medical records, or live dispatch systems.

---

## 1. Deterministic PRNG Specifications

- **Algorithm**: Mulberry32 (32-bit pseudorandom number generator with state mixing).
- **Default Config Seed**: `PRNG_SEED=1337` (defined in `/server/config/index.js` and `.env`).
- **Determinism Guarantee**:
  Any invocation of `npm run seed` with seed `1337` creates identical records, coordinate sets, edge costs, initial congestion values, and incident timestamps.

---

## 2. Seeded Datasets Overview

### A. Road Network (`RoadNode`, `RoadEdge`)
- **Node Count**: 40 vertices (`N-01` to `N-40`).
- **Edge Count**: 110 directed edges (representing 55 bidirectional road segments).
- **Coordinate Anchor**: Centered around `19.9900° N, 73.7800° E` across 6 distinct zones:
  - **Campus** (`N-01` to `N-06`): Academic buildings, sports facilities, quad.
  - **North** (`N-07` to `N-12`): Ring road, suburbs, Highland medical center.
  - **Central** (`N-13` to `N-19`): Train station, market, civic square, old clock tower.
  - **West** (`N-20` to `N-26`): Industrial sector, tech park, community clinic.
  - **East** (`N-27` to `N-32`): Riverfront promenade, maritime park, neonatal hospital.
  - **South** (`N-33` to `N-38`): Boulevard, stadium, aerodrome transit link.
  - **Island / Causeway** (`N-39`, `N-40`): St. Jude Island.
- **Topological Properties**:
  - **Cycles**: 6 distinct topological cycles allowing alternate routing around obstructions.
  - **Bottleneck Road**: Segments `E-39-40` and `E-40-39` form the single bridge connecting the mainland to `N-40` (`St. Jude Island Trauma Hospital`). Blocking this edge tests unreachable hospital logic.
  - **Congested Roads**: Pre-configured on high-traffic segments (`E-01-02`, `E-14-15`, `E-22-23`) with a configurable travel-time multiplier (default: `1.8x`).

### B. Fleet Management (`Ambulance`)
8 Vehicles (`AMB-001` through `AMB-008`):
- `AMB-001`: ALS (Available @ `N-03`) — Capabilities: `basic-life-support`, `advanced-life-support`, `ventilator`, `cardiac-monitor`.
- `AMB-002`: BLS (Available @ `N-12`) — Capabilities: `basic-life-support`.
- `AMB-003`: ICU-mobile (Available @ `N-18`) — Capabilities: `basic-life-support`, `advanced-life-support`, `ventilator`, `cardiac-monitor`.
- `AMB-004`: Neonatal (Available @ `N-25`) — Capabilities: `basic-life-support`, `advanced-life-support`, `neonatal-care`, `ventilator`.
- `AMB-005`: ALS (Available @ `N-31`) — Capabilities: `basic-life-support`, `advanced-life-support`, `cardiac-monitor`.
- `AMB-006`: BLS (Status: `DISPATCHED` on active incident `INC-009` @ `N-10`).
- `AMB-007`: ICU-mobile (Status: `MAINTENANCE` @ `N-14`).
- `AMB-008`: ALS (Available @ `N-36`) — Capabilities: `basic-life-support`, `advanced-life-support`, `cardiac-monitor`, `ventilator`.

### C. Hospitals (`Hospital`)
5 Facilities (`HOS-001` through `HOS-005`):
- `HOS-001`: **Metro Central General Hospital** (`N-15`, Central) — Capabilities: `trauma`, `cardiac`, `general` | Slots: 8/60.
- `HOS-002`: **Riverfront Neonatal & Specialty Center** (`N-28`, East) — Capabilities: `neonatal`, `general`, `burns` | Slots: 4/35.
- `HOS-003`: **Highland Heart & Trauma Institute** (`N-08`, North) — Capabilities: `cardiac`, `trauma`, `general` | Slots: 6/45.
- `HOS-004`: **Westside Community Clinic** (`N-22`, West) — Capabilities: `general`, `burns` | Slots: **0/25** (`AT_CAPACITY`). Demonstrates hospital filter when unavailable.
- `HOS-005`: **St. Jude Island Trauma Hospital** (`N-40`, Island) — Capabilities: `trauma`, `cardiac`, `general` | Slots: 7/30. Isolated when bridge `E-39-40` is blocked.

### D. Incidents (`Incident`)
12 Incidents (`INC-001` to `INC-012`):
- **Tie-Breaker Pair**:
  - `INC-001` (Critical, Cardiac Arrest @ `N-01`, created $T - 45\text{m}$)
  - `INC-002` (Critical, Road Accident @ `N-16`, created $T - 30\text{m}$)
  *Demonstrates priority queue ordering: same priority severity, `INC-001` dequeued first due to earlier timestamp.*
- Spread across statuses: `REGISTERED`, `TRIAGED`, `AWAITING_RESOURCE`, `AMBULANCE_ASSIGNED`, `VEHICLE_EN_ROUTE`, `RESOLVED`, `CANCELLED`.

### E. Demo Accounts (`User`)
- **Dispatcher/Admin**:
  - Email: `admin@resqnet.test`
  - Password: `ResQNet@Admin2026!`
  - Role: `admin` (Full dispatch, road condition toggling, scenario reset)
- **Evaluator (Read-Only)**:
  - Email: `evaluator@resqnet.test`
  - Password: `ResQNet@Eval2026!`
  - Role: `evaluator` (Read-only access, writes rejected by middleware)

---

## 3. NPM Seed Commands

| Command | Action | Safety Guarantee |
| --- | --- | --- |
| `npm run seed` | Seeds deterministic scenario into MongoDB | Wipes only records with `isSynthetic: true` |
| `npm run seed:reset` | Restores database to clean initial state | Requires confirmation, logs audit event |
| `npm run seed:large` | Generates 2,000-node / 5,000-edge graph in memory | Zero database writes; measures performance against < 2s target |
