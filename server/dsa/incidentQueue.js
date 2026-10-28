/**
 * Incident Max-Priority Queue backed by Binary Max-Heap.
 *
 * Requirements:
 *  - Composite key: (severityRank, waitingTime, createdAt)
 *  - Severity Ranking: Critical (4) > High (3) > Medium (2) > Low (1)
 *  - Strict timestamp FIFO tie-breaking
 *  - Dynamic waiting-time recomputation as time elapses
 *  - Reprioritize support (override severity with audit trace)
 *
 * Time Complexity:
 *  - Enqueue: O(log N)
 *  - Dequeue: O(log N)
 *  - Peek: O(1)
 */

export const SEVERITY_RANKS = {
  CRITICAL: 4,
  Critical: 4,
  HIGH: 3,
  High: 3,
  MEDIUM: 2,
  Medium: 2,
  LOW: 1,
  Low: 1
};

export class IncidentQueue {
  constructor() {
    this.heap = []; // 0-indexed array
    this.insertionCounter = 0;
  }

  /**
   * Computes the composite priority key.
   * Higher number = higher priority (Max-Heap).
   */
  computePriorityKey(incident, referenceTime = Date.now()) {
    const sev = incident.severity || 'Medium';
    const rank = SEVERITY_RANKS[sev] || 2;
    const createdAtMs = new Date(incident.createdAt || referenceTime).getTime();
    const waitSeconds = Math.max(0, Math.floor((referenceTime - createdAtMs) / 1000));

    // Composite: rank * 1,000,000 + waitSeconds
    // Ensures Critical always beats High initially, but long-waiting incidents accumulate priority
    const compositeScore = rank * 1000000 + waitSeconds;

    return {
      rank,
      waitSeconds,
      compositeScore,
      keyString: `(Rank: ${rank} [${sev}], Wait: ${Math.floor(waitSeconds / 60)}m ${waitSeconds % 60}s)`
    };
  }

  enqueue(incident) {
    if (!incident || !incident.incidentId) {
      throw new Error('IncidentQueue Error: Invalid incident record');
    }

    const item = {
      incident,
      incidentId: incident.incidentId,
      insertionOrder: this.insertionCounter++,
      enqueuedAt: Date.now()
    };

    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
    return item;
  }

  dequeue() {
    if (this.isEmpty()) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this._bubbleDown(0);
    }
    return top.incident;
  }

  peek() {
    if (this.isEmpty()) return null;
    return this.heap[0].incident;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  size() {
    return this.heap.length;
  }

  getAll() {
    const now = Date.now();
    // Return sorted array without mutating heap
    return [...this.heap]
      .map(entry => {
        const pKey = this.computePriorityKey(entry.incident, now);
        return {
          ...entry.incident,
          priorityKey: pKey.keyString,
          severityRank: pKey.rank,
          waitSeconds: pKey.waitSeconds,
          compositeScore: pKey.compositeScore
        };
      })
      .sort((a, b) => b.compositeScore - a.compositeScore || a.createdAt - b.createdAt);
  }

  reprioritize(incidentId, newSeverity) {
    const index = this.heap.findIndex(item => item.incidentId === incidentId);
    if (index === -1) {
      return false;
    }

    this.heap[index].incident.severity = newSeverity;
    this._bubbleUp(index);
    this._bubbleDown(index);
    return true;
  }

  _compare(indexA, indexB) {
    const now = Date.now();
    const itemA = this.heap[indexA];
    const itemB = this.heap[indexB];

    const keyA = this.computePriorityKey(itemA.incident, now);
    const keyB = this.computePriorityKey(itemB.incident, now);

    if (keyA.compositeScore !== keyB.compositeScore) {
      return keyA.compositeScore - keyB.compositeScore; // higher score is larger
    }
    // Tie-break: FIFO on insertion order (smaller insertionOrder was inserted earlier => higher priority)
    return itemB.insertionOrder - itemA.insertionOrder;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this._compare(index, parentIndex) > 0) {
        this._swap(index, parentIndex);
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  _bubbleDown(index) {
    const length = this.heap.length;
    while (true) {
      let largest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < length && this._compare(leftChild, largest) > 0) {
        largest = leftChild;
      }
      if (rightChild < length && this._compare(rightChild, largest) > 0) {
        largest = rightChild;
      }
      if (largest !== index) {
        this._swap(index, largest);
        index = largest;
      } else {
        break;
      }
    }
  }

  _swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}

export const IncidentPriorityQueue = IncidentQueue;
export default IncidentQueue;
