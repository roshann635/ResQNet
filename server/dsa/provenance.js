import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedManifestHash = null;

export function getDatasetHash() {
  if (cachedManifestHash) return cachedManifestHash;
  try {
    const manifestPath = path.resolve(__dirname, '../../data/MANIFEST.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      cachedManifestHash = manifest.masterSha256 || 'SHA-SYNTHETIC-DATASET-V1';
    } else {
      cachedManifestHash = 'SHA-DATASET-DEV';
    }
  } catch {
    cachedManifestHash = 'SHA-DATASET-DEV';
  }
  return cachedManifestHash;
}

/**
 * Creates provenance metadata for algorithmic outputs.
 * Enforces verifiable computation trace.
 */
export function createProvenance(graphVersion = 1, inputs = {}) {
  return {
    graphVersion,
    dataset: getDatasetHash(),
    datasetShort: getDatasetHash().slice(0, 8),
    inputs,
    computedAt: new Date().toISOString()
  };
}
