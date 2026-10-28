import { getHashTable, getBPlusTree } from '../services/graphService.js';
import { createPRNG } from '../seed/prng.js';

export function getHashItem(req, res, next) {
  try {
    const { id } = req.params;
    const ht = getHashTable();

    if (!ht) {
      return res.status(503).json({ error: 'Hash Table symbol table not initialized' });
    }

    let searchKey = id;
    let value = ht.get(searchKey);
    if (!value && /^HOS-(\d+)$/i.test(id)) {
      searchKey = id.replace(/^HOS-/i, 'HOSP-');
      value = ht.get(searchKey);
    } else if (!value && /^N-(\d{1,3})$/i.test(id)) {
      const match = id.match(/^N-(\d+)$/i);
      searchKey = `N-${match[1].padStart(4, '0')}`;
      value = ht.get(searchKey);
    }

    const diagnostics = ht.getDiagnostics();
    const hashIndex = ht._hash(searchKey);
    const bucket = ht.buckets[hashIndex] || [];

    res.json({
      key: id,
      found: value !== null,
      value,
      hashIndex,
      bucketChainLength: bucket.length,
      collidingKeysInBucket: bucket.map((item) => item.key),
      tableMetrics: {
        capacity: diagnostics.capacity,
        size: diagnostics.size,
        loadFactor: diagnostics.loadFactor,
        totalCollisions: diagnostics.totalCollisions
      }
    });
  } catch (err) {
    next(err);
  }
}

export function getBPlusRange(req, res, next) {
  try {
    let { from = 'HOSP-001', to = 'HOSP-005' } = req.query;
    const tree = getBPlusTree();

    if (!tree) {
      return res.status(503).json({ error: 'B+ Tree index not initialized' });
    }

    const normFrom = String(from).replace(/^HOS-(\d+)$/i, 'HOSP-$1');
    const normTo = String(to).replace(/^HOS-(\d+)$/i, 'HOSP-$1');

    let results = tree.rangeQuery(normFrom, normTo);
    if (results.length === 0 && normFrom !== String(from)) {
      results = tree.rangeQuery(String(from), String(to));
    }
    const structure = tree.getTreeStructure();

    res.json({
      query: { from, to },
      count: results.length,
      results,
      treeMetrics: {
        order: structure.order,
        height: structure.height,
        size: structure.size
      },
      treeLevels: structure.levels
    });
  } catch (err) {
    next(err);
  }
}

export function getSampleDemoKeys(req, res, next) {
  try {
    const prng = createPRNG(1337);
    const keys = [];

    // Generate 200 synthetic keys across categories
    // 50 Hospital codes
    for (let i = 1; i <= 50; i++) {
      keys.push({
        key: `HOS-${String(i).padStart(3, '0')}`,
        type: 'HOSPITAL',
        value: { facility: `Facility-${i}`, beds: prng.nextInt(10, 150) }
      });
    }

    // 50 Node codes
    for (let i = 1; i <= 50; i++) {
      keys.push({
        key: `NODE-${String(i).padStart(3, '0')}`,
        type: 'NODE',
        value: { zone: `Zone-${(i % 5) + 1}`, active: true }
      });
    }

    // 50 Location codes
    for (let i = 1; i <= 50; i++) {
      keys.push({
        key: `LOC-${String(i).padStart(3, '0')}`,
        type: 'LOCATION',
        value: { sector: (i % 8) + 1, altitude: prng.nextInt(50, 400) }
      });
    }

    // 50 Deliberately structured keys that test hash collisions (e.g. anagrams / patterned prefixes)
    const prefixes = ['COLLIDE-A', 'COLLIDE-B', 'COLLIDE-C', 'COLLIDE-D', 'COLLIDE-E'];
    for (let i = 1; i <= 50; i++) {
      const p = prefixes[i % prefixes.length];
      keys.push({
        key: `${p}-${String(i).padStart(2, '0')}`,
        type: 'COLLISION_TEST',
        value: { patternGroup: p, index: i }
      });
    }

    res.json({
      totalKeys: keys.length,
      keys
    });
  } catch (err) {
    next(err);
  }
}

export function loadSampleKeys(req, res, next) {
  try {
    const ht = getHashTable();
    const tree = getBPlusTree();
    const prng = createPRNG(1337);

    let inserted = 0;
    // Insert 200 keys into both structures
    for (let i = 1; i <= 100; i++) {
      const keyH = `HOS-${String(i).padStart(3, '0')}`;
      const valH = { name: `Facility ${i}`, capacity: prng.nextInt(20, 120) };
      ht.insert(keyH, valH);
      tree.insert(keyH, valH);
      inserted++;

      const keyN = `NODE-${String(i).padStart(3, '0')}`;
      const valN = { zone: `Sector ${(i % 6) + 1}` };
      ht.insert(keyN, valN);
      tree.insert(keyN, valN);
      inserted++;
    }

    res.json({
      success: true,
      keysLoaded: inserted,
      hashTableSize: ht.size,
      bPlusTreeSize: tree.size,
      hashTableLoadFactor: ht.getLoadFactor(),
      bPlusTreeHeight: tree.getTreeStructure().height
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getHashItem,
  getBPlusRange,
  getSampleDemoKeys,
  loadSampleKeys
};
