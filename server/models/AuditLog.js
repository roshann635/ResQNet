import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    actorId: {
      type: String,
      required: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: String,
      required: true,
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    outcome: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING'],
      default: 'SUCCESS',
      index: true
    },
    isSynthetic: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: false
  }
);

// Sanitization hook: NEVER persist sensitive credentials
auditLogSchema.pre('save', function (next) {
  if (this.details && typeof this.details === 'object') {
    const sanitize = (obj) => {
      const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'secret', 'authorization'];
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
          obj[key] = '[REDACTED_SENSITIVE]';
        } else if (obj[key] && typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    };
    try {
      sanitize(this.details);
    } catch {
      // Ignore sanitization recursion edge cases
    }
  }
  next();
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
