/**
 * B+ Tree Implementation in Pure JavaScript.
 *
 * Distinctive B+ Tree characteristics:
 *  1. Data is stored EXCLUSIVELY in Leaf Nodes.
 *  2. Internal nodes act purely as routing indices.
 *  3. Leaf nodes are linked together via a `next` pointer, enabling efficient O(K) range scans.
 *  4. Bounded order M with recursive node splitting on insertion.
 *
 * Time Complexity:
 *  - Search: O(log_M N)
 *  - Insert: O(log_M N)
 *  - Range Query [from, to]: O(log_M N + K) where K is result count
 */

class BPlusNode {
  constructor(isLeaf = false) {
    this.isLeaf = isLeaf;
    this.keys = []; // Routing keys (internal) or sorted search keys (leaf)
    this.children = []; // Child node pointers (internal)
    this.values = []; // Data records (leaf only)
    this.next = null; // Pointer to next leaf node for range queries (leaf only)
    this.prev = null; // Pointer to prev leaf node (leaf only)
  }
}

export class BPlusTree {
  constructor(order = 4) {
    if (order < 3) {
      throw new Error('BPlusTree Error: Order (branching factor) must be at least 3');
    }
    this.order = order; // Maximum child pointers per internal node
    this.maxKeys = order - 1; // Maximum keys allowed in a node before splitting
    this.minKeys = Math.floor(order / 2);
    this.root = new BPlusNode(true);
    this.size = 0;
  }

  /**
   * Searches for a record by exact key.
   */
  search(key) {
    const leaf = this._findLeaf(key);
    for (let i = 0; i < leaf.keys.length; i++) {
      if (leaf.keys[i] === key) {
        return leaf.values[i];
      }
    }
    return null;
  }

  /**
   * Traverses from root down to the appropriate leaf node for `key`.
   */
  _findLeaf(key) {
    let current = this.root;
    while (!current.isLeaf) {
      let idx = 0;
      while (idx < current.keys.length && key >= current.keys[idx]) {
        idx++;
      }
      current = current.children[idx];
    }
    return current;
  }

  /**
   * Inserts a key-value pair into the B+ Tree.
   */
  insert(key, value) {
    if (key === null || key === undefined) {
      throw new Error('BPlusTree Error: Key cannot be null or undefined');
    }

    const leaf = this._findLeaf(key);

    // Check if key already exists (update existing value)
    for (let i = 0; i < leaf.keys.length; i++) {
      if (leaf.keys[i] === key) {
        const oldVal = leaf.values[i];
        leaf.values[i] = value;
        return { updated: true, key, oldValue: oldVal };
      }
    }

    // Insert key and value into leaf in sorted order
    let insertIdx = 0;
    while (insertIdx < leaf.keys.length && leaf.keys[insertIdx] < key) {
      insertIdx++;
    }

    leaf.keys.splice(insertIdx, 0, key);
    leaf.values.splice(insertIdx, 0, value);
    this.size++;

    // Split leaf if it exceeds capacity
    if (leaf.keys.length > this.maxKeys) {
      this._splitLeaf(leaf);
    }

    return { inserted: true, key };
  }

  _splitLeaf(leaf) {
    const rightLeaf = new BPlusNode(true);
    const mid = Math.floor(leaf.keys.length / 2);

    // Right leaf takes second half of keys and values
    rightLeaf.keys = leaf.keys.splice(mid);
    rightLeaf.values = leaf.values.splice(mid);

    // Update leaf pointers
    rightLeaf.next = leaf.next;
    if (rightLeaf.next) {
      rightLeaf.next.prev = rightLeaf;
    }
    leaf.next = rightLeaf;
    rightLeaf.prev = leaf;

    const promotedKey = rightLeaf.keys[0];

    // If leaf is root, create new root
    if (leaf === this.root) {
      const newRoot = new BPlusNode(false);
      newRoot.keys = [promotedKey];
      newRoot.children = [leaf, rightLeaf];
      this.root = newRoot;
    } else {
      this._insertIntoParent(leaf, promotedKey, rightLeaf);
    }
  }

  _insertIntoParent(leftChild, key, rightChild) {
    const parent = this._findParent(this.root, leftChild);
    if (!parent) return;

    let idx = 0;
    while (idx < parent.keys.length && parent.keys[idx] < key) {
      idx++;
    }

    parent.keys.splice(idx, 0, key);
    parent.children.splice(idx + 1, 0, rightChild);

    if (parent.keys.length > this.maxKeys) {
      this._splitInternal(parent);
    }
  }

  _splitInternal(internalNode) {
    const rightNode = new BPlusNode(false);
    const mid = Math.floor(internalNode.keys.length / 2);
    const promotedKey = internalNode.keys[mid];

    // Right internal node takes keys after mid, and corresponding children
    rightNode.keys = internalNode.keys.splice(mid + 1);
    rightNode.children = internalNode.children.splice(mid + 1);
    internalNode.keys.pop(); // Remove the promoted median key from left

    if (internalNode === this.root) {
      const newRoot = new BPlusNode(false);
      newRoot.keys = [promotedKey];
      newRoot.children = [internalNode, rightNode];
      this.root = newRoot;
    } else {
      this._insertIntoParent(internalNode, promotedKey, rightNode);
    }
  }

  _findParent(current, target) {
    if (current.isLeaf || current.children.length === 0) return null;

    for (const child of current.children) {
      if (child === target) {
        return current;
      }
    }

    for (const child of current.children) {
      const p = this._findParent(child, target);
      if (p) return p;
    }

    return null;
  }

  /**
   * Executes a range query [fromKey, toKey] inclusive using leaf node links.
   * Time Complexity: O(log N + K)
   */
  rangeQuery(fromKey, toKey) {
    const results = [];
    let leaf = this._findLeaf(fromKey);

    while (leaf) {
      for (let i = 0; i < leaf.keys.length; i++) {
        const k = leaf.keys[i];
        if (k >= fromKey && k <= toKey) {
          results.push({ key: k, value: leaf.values[i] });
        } else if (k > toKey) {
          return results;
        }
      }
      leaf = leaf.next;
    }

    return results;
  }

  /**
   * In-order traversal across all leaf nodes.
   */
  traverse() {
    const results = [];
    let leaf = this._getFirstLeaf();
    while (leaf) {
      for (let i = 0; i < leaf.keys.length; i++) {
        results.push({ key: leaf.keys[i], value: leaf.values[i] });
      }
      leaf = leaf.next;
    }
    return results;
  }

  _getFirstLeaf() {
    let current = this.root;
    while (!current.isLeaf) {
      current = current.children[0];
    }
    return current;
  }

  /**
   * Rebuilds the tree from an array of records.
   */
  rebuild(records = [], keySelector = (r) => r.id) {
    this.root = new BPlusNode(true);
    this.size = 0;
    for (const record of records) {
      const key = keySelector(record);
      this.insert(key, record);
    }
  }

  /**
   * Returns inspection diagnostics for Algorithm Lab visualizations.
   */
  getTreeStructure() {
    const levels = [];

    function traverseLevel(node, depth) {
      if (!levels[depth]) levels[depth] = [];
      levels[depth].push({
        isLeaf: node.isLeaf,
        keys: [...node.keys],
        childCount: node.children.length,
        itemCount: node.isLeaf ? node.values.length : 0
      });

      if (!node.isLeaf) {
        for (const child of node.children) {
          traverseLevel(child, depth + 1);
        }
      }
    }

    traverseLevel(this.root, 0);

    return {
      order: this.order,
      height: levels.length,
      size: this.size,
      levels
    };
  }
}

export default BPlusTree;
