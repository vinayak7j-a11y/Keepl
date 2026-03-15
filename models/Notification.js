const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
    index: true
  },

  phone: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  customerName: {
    type: String,
    trim: true,
    default: ""
  },

  points: {
    type: Number,
    default: 0,
    min: 0
  },

  status: {
    type: String,
    enum: ["pending", "processed", "rejected", "expired"],
    default: "pending",
    index: true
  },

  source: {
    type: String,
    enum: ["scan", "manual"],
    default: "scan"
  }

},
{
  timestamps: true
});

/* =========================
   INDEXES (QUEUE SPEED)
========================= */

notificationSchema.index({ shopId: 1, status: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);