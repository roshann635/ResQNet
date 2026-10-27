/**
 * Deterministic Pseudorandom Number Generator (Mulberry32).
 * Guarantees identical sequence of random numbers across runs given the same initial seed.
 */
export class SeededPRNG {
  constructor(seed = 1337) {
    this.initialSeed = seed;
    this.state = seed >>> 0;
  }

  reset() {
    this.state = this.initialSeed >>> 0;
  }

  /**
   * Generates a 32-bit unsigned float between 0 (inclusive) and 1 (exclusive).
   */
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates integer in range [min, max] inclusive.
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates float in range [min, max].
   */
  nextFloat(min, max, decimals = 2) {
    const val = this.next() * (max - min) + min;
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  }

  /**
   * Deterministically picks one element from array.
   */
  choice(arr) {
    if (!arr || arr.length === 0) return null;
    const idx = this.nextInt(0, arr.length - 1);
    return arr[idx];
  }

  /**
   * Deterministically samples k elements without replacement.
   */
  sample(arr, k) {
    if (!arr || k <= 0) return [];
    const copy = [...arr];
    const result = [];
    const count = Math.min(k, copy.length);
    for (let i = 0; i < count; i++) {
      const idx = this.nextInt(0, copy.length - 1);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  /**
   * Deterministically shuffles array (Fisher-Yates).
   */
  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

export function createPRNG(seed = 1337) {
  return new SeededPRNG(seed);
}

export default SeededPRNG;
