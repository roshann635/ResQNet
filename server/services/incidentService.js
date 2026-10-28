import { Incident, Ambulance, AuditLog } from '../models/index.js';
import { getGraph, getHashTable, getBPlusTree } from './graphService.js';
import { IncidentPriorityQueue } from '../dsa/incidentQueue.js';
import { notifyAdapter } from '../adapters/notify.js';
import { eventBus } from './eventBus.js';

// Canonical state machine transitions per SRS PART E13
export const VALID_TRANSITIONS = {
  Registered: ['Prioritized', 'AwaitingResource', 'AmbulanceAssigned', 'Cancelled'],
  REGISTERED: ['PRIORITIZED', 'TRIAGED', 'AWAITING_RESOURCE', 'AMBULANCE_ASSIGNED', 'CANCELLED'],

  Prioritized: ['AwaitingResource', 'AmbulanceAssigned', 'Cancelled'],
  PRIORITIZED: ['AWAITING_RESOURCE', 'AMBULANCE_ASSIGNED', 'CANCELLED'],
  TRIAGED: ['AWAITING_RESOURCE', 'AMBULANCE_ASSIGNED', 'CANCELLED'],

  AwaitingResource: ['AmbulanceAssigned', 'Cancelled'],
  AWAITING_RESOURCE: ['AMBULANCE_ASSIGNED', 'CANCELLED'],

  AmbulanceAssigned: ['EnRoute', 'AwaitingResource', 'Cancelled'],
  AMBULANCE_ASSIGNED: ['VEHICLE_EN_ROUTE', 'EN_ROUTE', 'AWAITING_RESOURCE', 'CANCELLED'],

  EnRoute: ['Rerouting', 'AtScene', 'Cancelled'],
  VEHICLE_EN_ROUTE: ['RE_ROUTING', 'REROUTING', 'AT_SCENE', 'CANCELLED'],
  EN_ROUTE: ['RE_ROUTING', 'REROUTING', 'AT_SCENE', 'CANCELLED'],

  Rerouting: ['EnRoute', 'AtScene', 'Cancelled'],
  RE_ROUTING: ['VEHICLE_EN_ROUTE', 'EN_ROUTE', 'AT_SCENE', 'CANCELLED'],
  REROUTING: ['VEHICLE_EN_ROUTE', 'EN_ROUTE', 'AT_SCENE', 'CANCELLED'],

  AtScene: ['Transporting', 'Resolved', 'Cancelled'],
  AT_SCENE: ['TRANSPORTING', 'RESOLVED', 'CANCELLED'],

  // Transporting cannot be cancelled
  Transporting: ['Rerouting', 'Resolved'],
  TRANSPORTING: ['RE_ROUTING', 'REROUTING', 'RESOLVED'],

  Resolved: [],
  RESOLVED: [],

  Cancelled: [],
  CANCELLED: []
};

/**
 * Calculates deterministic triage priority and severity from incident parameters.
 */
export function calculateSeverityAndPriority(type, symptoms = [], patientCount = 1) {
  const normType = (type || '').toLowerCase();
  const normSymptoms = (symptoms || []).map((s) => s.toLowerCase());

  const hasCardiac = normType.includes('cardiac') || normSymptoms.some((s) => s.includes('cardiac') || s.includes('unconscious') || s.includes('cardiac arrest'));
  const hasStroke = normType.includes('stroke') || normSymptoms.some((s) => s.includes('stroke') || s.includes('paralysis'));
  const isMajorTrauma = normSymptoms.some((s) => s.includes('major trauma') || s.includes('severe bleeding') || s.includes('head injury'));

  if (hasCardiac || hasStroke || isMajorTrauma || patientCount >= 3) {
    return {
      severity: 'CRITICAL',
      rank: 4,
      explanation: `Cardiac/Stroke/Major Trauma condition detected (${type}) with patient count ${patientCount} => Critical Triage (Rank 4).`
    };
  }

  const isSevereInjury = normType.includes('accident') || normType.includes('burns') || normSymptoms.some((s) => s.includes('respiratory') || s.includes('bleeding') || s.includes('burn'));
  if (isSevereInjury || patientCount === 2) {
    return {
      severity: 'HIGH',
      rank: 3,
      explanation: `Severe trauma or respiratory distress detected (${type}) => High Priority Triage (Rank 3).`
    };
  }

  const isModerate = normType.includes('poisoning') || normType.includes('maternity') || normSymptoms.some((s) => s.includes('fracture') || s.includes('pain') || s.includes('labor'));
  if (isModerate) {
    return {
      severity: 'MEDIUM',
      rank: 2,
      explanation: `Moderate acuity or urgent transport criteria met (${type}) => Medium Priority Triage (Rank 2).`
    };
  }

  return {
    severity: 'LOW',
    rank: 1,
    explanation: `Stable patient with non-critical symptoms => Low Priority Triage (Rank 1).`
  };
}

/**
 * Automatically infers necessary clinical ambulance capabilities from symptoms and patient count.
 */
export function inferRequiredCapabilities(type, symptoms = [], patientCount = 1) {
  const normType = (type || '').toLowerCase();
  const normSymptoms = (symptoms || []).map((s) => s.toLowerCase());
  const caps = new Set();

  if (
    normType.includes('cardiac') ||
    normSymptoms.some((s) => s.includes('cardiac') || s.includes('chest pain') || s.includes('heart') || s.includes('unconscious'))
  ) {
    caps.add('advanced-life-support');
    caps.add('telemetry');
    caps.add('defibrillator');
  }
  if (normType.includes('stroke') || normSymptoms.some((s) => s.includes('stroke') || s.includes('paralysis') || s.includes('slurred'))) {
    caps.add('advanced-life-support');
    caps.add('telemetry');
  }
  if (
    normType.includes('accident') ||
    normSymptoms.some((s) => s.includes('trauma') || s.includes('bleeding') || s.includes('fracture') || s.includes('injury'))
  ) {
    caps.add('advanced-life-support');
    caps.add('first-aid');
  }
  if (normType.includes('burn') || normSymptoms.some((s) => s.includes('burn'))) {
    caps.add('advanced-life-support');
    caps.add('oxygen');
  }
  if (normType.includes('maternity') || normSymptoms.some((s) => s.includes('labor') || s.includes('pregnancy'))) {
    caps.add('basic-life-support');
    caps.add('incubator');
  }
  if (normSymptoms.some((s) => s.includes('child') || s.includes('pediatric'))) {
    caps.add('basic-life-support');
    caps.add('pediatric-icu');
  }
  if (patientCount >= 3) {
    caps.add('advanced-life-support');
    caps.add('first-aid');
  }

  if (caps.size === 0) {
    caps.add('basic-life-support');
  }

  return Array.from(caps);
}

/**
 * Validates state machine transition.
 */
export function isValidTransition(currentStatus, newStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

