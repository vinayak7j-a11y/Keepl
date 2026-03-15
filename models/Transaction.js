const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
   
  },

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ["earn", "redeem"],
    required: true
  },

  billAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  points: {
    type: Number,
    required: true,
    min: 0
  },

  phone: {
    type: String,
    trim: true
  },

  description: {
    type: String,
    default: ""
  },

  source: {
    type: String,
    enum: ["manual", "queue", "scan"],
    default: "manual"
  }

},
{
  timestamps: true
});

/* =========================
   INDEXES (FAST ANALYTICS)
========================= */

transactionSchema.index({ shopId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1 });
transactionSchema.index({ type: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);