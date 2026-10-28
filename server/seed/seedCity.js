import { connectDB, disconnectDB } from '../config/db.js';
import {
  RoadNode,
  RoadEdge,
  Ambulance,
  Hospital,
  Incident,
  AuditLog
} from '../models/index.js';
import { generateCityDenseGraph } from './cityDenseGenerator.js';

export async function seedCityDense(verbose = true) {
  const startTime = Date.now();
  if (verbose) {
    console.log('========================================================');
    console.log('  ResQNet City-Dense Scenario Seeder (~1,500 Nodes)      ');
    console.log('========================================================');
  }

  await connectDB();

  // 1. Purge only existing City-Dense records to preserve the default scenario
  if (verbose) console.log('[1/4] Purging existing City-Dense records...');
  await RoadNode.deleteMany({ scenario: 'city-dense' });
  await RoadEdge.deleteMany({ scenario: 'city-dense' });
  await Ambulance.deleteMany({ scenario: 'city-dense' });
  await Hospital.deleteMany({ scenario: 'city-dense' });
  await Incident.deleteMany({ scenario: 'city-dense' });

  // 2. Generate deterministic City-Dense graph
  if (verbose) console.log('[2/4] Generating deterministic City-Dense synthetic network...');
  const data = generateCityDenseGraph(1337);

  // 3. Persist records to MongoDB
  if (verbose) console.log('[3/4] Persisting City-Dense records to MongoDB...');
  const insertedNodes = await RoadNode.insertMany(data.nodes);
  const insertedEdges = await RoadEdge.insertMany(data.edges);
  const insertedHospitals = await Hospital.insertMany(data.hospitals);
  const insertedAmbulances = await Ambulance.insertMany(data.ambulances);
  const insertedIncidents = await Incident.insertMany(data.incidents);

  // 4. Log Audit Entry
  const auditEntry = new AuditLog({
    logId: `LOG-SEED-CITY-${Date.now()}`,
    actorId: 'SYSTEM_SEEDER',
    eventType: 'SCENARIO_SEEDED',
    entityType: 'SCENARIO',
    entityId: 'CITY_DENSE',
    timestamp: new Date(),
    details: {
      action: 'npm run seed:city',
      scenario: 'city-dense',
      nodesSeeded: insertedNodes.length,
      edgesSeeded: insertedEdges.length,
      ambulancesSeeded: insertedAmbulances.length,
      hospitalsSeeded: insertedHospitals.length,
      incidentsSeeded: insertedIncidents.length,
      showcasePairs: data.showcasePairs.length
    },
    outcome: 'SUCCESS',
    isSynthetic: true
  });
  await auditEntry.save();

  const durationMs = Date.now() - startTime;
  if (verbose) {
    console.log('[4/4] City-Dense Seed completed successfully!');
    console.log('--------------------------------------------------------');
    console.log(`- Nodes Seeded:       ${insertedNodes.length}`);
    console.log(`- Edges Seeded:       ${insertedEdges.length} directed edges`);
    console.log(`- Hospitals Seeded:   ${insertedHospitals.length}`);
    console.log(`- Ambulances Seeded:  ${insertedAmbulances.length}`);
    console.log(`- Incidents Seeded:   ${insertedIncidents.length}`);
    console.log(`- Showcase Pairs:     ${data.showcasePairs.length}`);
    console.log(`- Execution Time:     ${durationMs} ms`);
    console.log('========================================================\n');
  }

  return {
    nodesCount: insertedNodes.length,
    edgesCount: insertedEdges.length,
    hospitalsCount: insertedHospitals.length,
    ambulancesCount: insertedAmbulances.length,
    incidentsCount: insertedIncidents.length,
    showcasePairs: data.showcasePairs,
    durationMs
  };
}

if (process.argv[1] && process.argv[1].endsWith('seedCity.js')) {
  seedCityDense()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[CITY SEED ERROR]', err);
      await disconnectDB();
      process.exit(1);
    });
}

export default seedCityDense;
