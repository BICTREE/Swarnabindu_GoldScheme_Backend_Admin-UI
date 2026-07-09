const mongoose = require('mongoose');

const UserSchemeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  schemeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scheme',
    required: true
  },
  monthlyInvestment: {
    type: Number,
    required: true
  },
  goldAccumulated: {
    type: Number,
    default: 0 // in grams
  },
  totalPaid: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'REDEEMED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  
  endDate: {
    type: Date,
    required: true
  },
  goalGoldGram: {
    type: Number,
    required: true
  },
  redeemedAt: {
    type: Date,
    default: null
  },
  redeemedGoldGram: {
    type: Number,
    default: null
  },
  redeemedValue: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserScheme', UserSchemeSchema);
