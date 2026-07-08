const mongoose = require('mongoose');

const GoldRateSchema = new mongoose.Schema({
  rate22K_per_g: {
    type: Number,
    required: true
  },
  rate24K_per_8g: {
    type: Number,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GoldRate', GoldRateSchema);
