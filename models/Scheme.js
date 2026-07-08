const mongoose = require('mongoose');

const SchemeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  monthlyInvestment: {
    type: Number,
    required: true
  },
  durationMonths: {
    type: Number,
    required: true
  },
  maturityBenefitPercent: {
    type: Number,
    required: true
  },
  minGoldGram: {
    type: Number,
    required: true
  },
  termsAndConditions: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Scheme', SchemeSchema);
