const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userSchemeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserScheme',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  installmentType: {
    type: String,
    enum: ['CURRENT_MONTH', 'PENDING_DUES', 'ADVANCE_PAYMENT'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED'],
    default: 'PENDING'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentMethod: {
    type: String,
    default: null // e.g. "UPI - Google Pay", "Debit Card", etc.
  },
  paidAt: {
    type: Date,
    default: null
  },
  invoiceNo: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  gst: {
    type: Number,
    default: 0
  },
  convenienceFee: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', PaymentSchema);
