const mongoose = require('mongoose');

const IncidentLogSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true
  },
  affectedComponents: [{
    type: String
  }], // e.g. "MongoDB User Table", "KYC documents S3 bucket"
  estimatedImpactedUsers: {
    type: Number,
    default: 0
  },
  remediationSteps: {
    type: String,
    default: null
  },
  reportedToCertIn: {
    type: Boolean,
    default: false
  },
  reportedAt: {
    type: Date,
    default: null
  },
  loggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('IncidentLog', IncidentLogSchema);
