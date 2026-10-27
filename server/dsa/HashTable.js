/**
 * Custom Hash Table with Separate Chaining and Dynamic Resizing.
 * Pure JavaScript, no external libraries.
 *
 * Characteristics:
 *  - Collision handling: Separate chaining (linked bucket arrays).
 *  - Hash function: Polynomial rolling hash (djb2-adapted) for string keys.
 *  - Automatic resizing: Doubles table capacity when load factor exceeds maxLoadFactor (0.75).
 *  - Diagnostics: Exposes collision count, bucket lengths, and load factor for UI demonstrations.
 */
export class HashTable {
  constructor(initialCapacity = 16, maxLoadFactor = 0.75) {
    this.capacity = initialCapacity;
    this.maxLoadFactor = maxLoadFactor;
    this.size = 0;
    this.buckets = new Array(this.capacity).fill(null).map(() => []);
    this.totalCollisions = 0;
  }

  /**
   * Polynomial rolling hash for string keys.
   */
  _hash(key) {
    const str = String(key);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % this.capacity;
  }

  getLoadFactor() {
    return this.size / this.capacity;
  }

  insert(key, value) {
    if (key === undefined || key === null) {
      throw new Error('HashTable Error: Key cannot be null or undefined');
    }

    const index = this._hash(key);
    const bucket = this.buckets[index];

    // Check if key already exists in bucket (update)
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].key === key) {
        const oldVal = bucket[i].value;
        bucket[i].value = value;
        return { updated: true, key, oldValue: oldVal, newValue: value };
      }
    }

    // Collision detection: if bucket already has entries, this is a collision
    if (bucket.length > 0) {
      this.totalCollisions++;
    }

    bucket.push({ key, value });
    this.size++;

    // Check load factor for dynamic resize
    if (this.getLoadFactor() > this.maxLoadFactor) {
      this._resize(this.capacity * 2);
    }

    return { inserted: true, key, index };
  }

  get(key) {
    const index = this._hash(key);
    const bucket = this.buckets[index];
    for (const item of bucket) {
      if (item.key === key) {
        return item.value;
      }
    }
    return null;
  }

  has(key) {
    return this.get(key) !== null;
  }

  update(key, value) {
    const index = this._hash(key);
    const bucket = this.buckets[index];
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].key === key) {
        bucket[i].value = value;
        return true;
      }
    }
    return false;
  }

  delete(key) {
    const index = this._hash(key);
    const bucket = this.buckets[index];
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].key === key) {
        const removed = bucket.splice(i, 1)[0];
        this.size--;
        return removed.value;
      }
    }
    return null;
  }

  keys() {
    const result = [];
    for (const bucket of this.buckets) {
      for (const item of bucket) {
        result.push(item.key);
      }
    }
    return result;
  }

  values() {
    const result = [];
    for (const bucket of this.buckets) {
      for (const item of bucket) {
        result.push(item.value);
      }
    }
    return result;
  }

  entries() {
    const result = [];
    for (const bucket of this.buckets) {
      for (const item of bucket) {
        result.push([item.key, item.value]);
      }
    }
    return result;
  }

  _resize(newCapacity) {
    const oldBuckets = this.buckets;
    this.capacity = newCapacity;
    this.buckets = new Array(newCapacity).fill(null).map(() => []);
    this.size = 0;
    this.totalCollisions = 0;

    for (const bucket of oldBuckets) {
      for (const item of bucket) {
        this.insert(item.key, item.value);
      }
    }
  }

  getDiagnostics() {
    const distribution = this.buckets.map((b, idx) => ({
      bucketIndex: idx,
      length: b.length,
      keys: b.map((item) => item.key)
    }));

    const occupiedBuckets = this.buckets.filter((b) => b.length > 0).length;

    return {
      capacity: this.capacity,
      size: this.size,
      loadFactor: Math.round(this.getLoadFactor() * 100) / 100,
      occupiedBuckets,
      emptyBuckets: this.capacity - occupiedBuckets,
      totalCollisions: this.totalCollisions,
      distribution: distribution.slice(0, 32) // Preview first 32 buckets
    };
  }
}

export default HashTable;
