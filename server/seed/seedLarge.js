import { generateLargeGraph } from './largeGraphGenerator.js';

export function runLargeGraphBenchmark() {
  console.log('========================================================');
  console.log('  ResQNet Large Graph Benchmark (2,000 Vertices / 5,000 Edges)  ');
  console.log('========================================================');
  console.log('Performance Target: Graph generation & load in < 2,000 ms');

  const startMemory = process.memoryUsage().heapUsed;
  const result = generateLargeGraph(2000, 5000, 1337);
  const endMemory = process.memoryUsage().heapUsed;

  const memoryUsedMb = Math.round(((endMemory - startMemory) / (1024 * 1024)) * 100) / 100;

  console.log('--------------------------------------------------------');
  console.log(`- Vertices Generated:   ${result.vertexCount}`);
  console.log(`- Edges Generated:      ${result.edgeCount}`);
  console.log(`- Time Elapsed:         ${result.durationMs} ms`);
  console.log(`- Approx Heap Used:     ${memoryUsedMb} MB`);
  console.log(`- Target Status:        ${result.durationMs < 2000 ? 'PASSED (< 2,000 ms)' : 'FAILED (> 2,000 ms)'}`);
  console.log('========================================================\n');

  return result;
}

if (process.argv[1] && process.argv[1].endsWith('seedLarge.js')) {
  runLargeGraphBenchmark();
}

export default runLargeGraphBenchmark;
