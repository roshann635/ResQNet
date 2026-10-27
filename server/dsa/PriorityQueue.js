import { MinHeap } from './MinHeap.js';

/**
 * Custom Priority Queue implemented using binary MinHeap.
 * Pure JavaScript, zero third-party dependencies.
 */
export class PriorityQueue {
  constructor(compareFn) {
    this.heap = new MinHeap(compareFn);
  }

  enqueue(item, priority) {
    this.heap.insert(item, priority);
  }

  dequeue() {
    return this.heap.extractMin();
  }

  peek() {
    return this.heap.peek();
  }

  size() {
    return this.heap.size();
  }

  isEmpty() {
    return this.heap.isEmpty();
  }

  toArray() {
    return [...this.heap.heap];
  }
}

/**
 * Specialized Incident Priority Queue (Section 3.8).
 * Orders incidents by:
 *  1. Severity: CRITICAL (4) > HIGH (3) > MEDIUM (2) > LOW (1)
 *  2. Tie-break: Earliest createdAt timestamp
 *
 * Exposes a composite priorityKey for transparency and verification in the UI.
 */
export class IncidentPriorityQueue {
  constructor() {
    const severityRank = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };

    // MinHeap comparator: smaller return value = higher priority (dequeued first)
    this.pq = new PriorityQueue((a, b) => {
      const rankA = severityRank[a.severity] || 0;
      const rankB = severityRank[b.severity] || 0;

      // Higher severity rank must come first
      if (rankA !== rankB) {
        return rankB - rankA;
      }

      // Tie-break: earlier creation date comes first
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    });
  }

  static computePriorityKey(incident) {
    const severityRank = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    }[incident.severity] || 0;

    const time = new Date(incident.createdAt).getTime();
    // Composite key format: [Rank]-[Timestamp]
    return `P${severityRank}_T${time}`;
  }

  enqueue(incident) {
    const priorityKey = IncidentPriorityQueue.computePriorityKey(incident);
    const enriched = {
      ...incident,
      priorityKey
    };
    this.pq.enqueue(enriched);
  }

  dequeue() {
    return this.pq.dequeue();
  }

  peek() {
    return this.pq.peek();
  }

  size() {
    return this.pq.size();
  }

  isEmpty() {
    return this.pq.isEmpty();
  }

  /**
   * Returns all items currently queued in prioritized order without mutating the queue.
   */
  getSortedList() {
    const tempHeap = new MinHeap(this.pq.heap.compare);
    this.pq.heap.heap.forEach((item) => tempHeap.insert(item));
    const sorted = [];
    while (!tempHeap.isEmpty()) {
      sorted.push(tempHeap.extractMin());
    }
    return sorted;
  }
}

export default PriorityQueue;
