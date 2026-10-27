import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resqnet',
  jwt: {
    secret: process.env.JWT_SECRET || 'resqnet-academic-dsa-secret-key-eval-2026-super-secure',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  prng: {
    seed: parseInt(process.env.PRNG_SEED, 10) || 1337
  },
  congestionMultiplier: parseFloat(process.env.DEFAULT_CONGESTION_MULTIPLIER) || 1.8,
  scoringWeights: {
    routeCost: parseFloat(process.env.SCORING_WEIGHT_ROUTE_COST) || 0.40,
    utilization: parseFloat(process.env.SCORING_WEIGHT_UTILIZATION) || 0.25,
    capabilityMismatch: parseFloat(process.env.SCORING_WEIGHT_CAPABILITY) || 0.20,
    reliability: parseFloat(process.env.SCORING_WEIGHT_RELIABILITY) || 0.15
  },
  algorithmLimits: {
    defaultMaxHops: parseInt(process.env.DEFAULT_MAX_HOPS, 10) || 12,
    defaultMaxCost: parseFloat(process.env.DEFAULT_MAX_COST) || 60.0,
    defaultMaxResults: parseInt(process.env.DEFAULT_MAX_RESULTS, 10) || 5,
    maxGraphNodes: parseInt(process.env.MAX_GRAPH_NODES, 10) || 2000
  },
  severities: {
    CRITICAL: { level: 4, name: 'CRITICAL', rank: 4, label: 'Critical' },
    HIGH: { level: 3, name: 'HIGH', rank: 3, label: 'High' },
    MEDIUM: { level: 2, name: 'MEDIUM', rank: 2, label: 'Medium' },
    LOW: { level: 1, name: 'LOW', rank: 1, label: 'Low' }
  },
  roadConditions: {
    NORMAL: 'NORMAL',
    CONGESTED: 'CONGESTED',
    BLOCKED: 'BLOCKED',
    REOPENED: 'REOPENED'
  },
  incidentStates: {
    REGISTERED: 'REGISTERED',
    TRIAGED: 'TRIAGED',
    AWAITING_RESOURCE: 'AWAITING_RESOURCE',
    AMBULANCE_ASSIGNED: 'AMBULANCE_ASSIGNED',
    VEHICLE_EN_ROUTE: 'VEHICLE_EN_ROUTE',
    RE_ROUTING: 'RE_ROUTING',
    AT_SCENE: 'AT_SCENE',
    TRANSPORTING: 'TRANSPORTING',
    RESOLVED: 'RESOLVED',
    CANCELLED: 'CANCELLED'
  },
  // Valid transitions for incident state machine
  incidentTransitions: {
    REGISTERED: ['TRIAGED', 'CANCELLED'],
    TRIAGED: ['AWAITING_RESOURCE', 'CANCELLED'],
    AWAITING_RESOURCE: ['AMBULANCE_ASSIGNED', 'CANCELLED'],
    AMBULANCE_ASSIGNED: ['VEHICLE_EN_ROUTE', 'CANCELLED'],
    VEHICLE_EN_ROUTE: ['RE_ROUTING', 'AT_SCENE', 'CANCELLED'],
    RE_ROUTING: ['VEHICLE_EN_ROUTE', 'AT_SCENE', 'CANCELLED'],
    AT_SCENE: ['TRANSPORTING', 'RESOLVED', 'CANCELLED'],
    TRANSPORTING: ['RE_ROUTING', 'RESOLVED', 'CANCELLED'],
    RESOLVED: [],
    CANCELLED: []
  },
  ambulanceTypes: ['BLS', 'ALS', 'ICU-mobile', 'neonatal'],
  ambulanceCapabilities: [
    'basic-life-support',
    'advanced-life-support',
    'ventilator',
    'cardiac-monitor',
    'neonatal-care'
  ],
  hospitalCapabilities: [
    'trauma',
    'cardiac',
    'neonatal',
    'burns',
    'general'
  ],
  userRoles: {
    ADMIN: 'admin',
    EVALUATOR: 'evaluator'
  }
};

export default config;
