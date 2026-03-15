const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema(
{
  name: {
    type: String,
    trim: true,
    default: ""
  },

  phone: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
    index: true
  },

  status: {
    type: String,
    enum: ["waiting", "processing", "completed", "cancelled"],
    default: "waiting",
    index: true
  },

  expiresAt: {
    type: Date
  }

},
{
  timestamps: true
});

/* =========================
   INDEXES (FAST QUEUE LOOKUP)
========================= */

queueSchema.index({ shopId: 1, status: 1 });
queueSchema.index({ createdAt: -1 });

/* =========================
   METHODS
========================= */

// mark as processing
queueSchema.methods.startProcessing = function () {
  this.status = "processing";
};

// mark as completed
queueSchema.methods.complete = function () {
  this.status = "completed";
};

// cancel request
queueSchema.methods.cancel = function () {
  this.status = "cancelled";
};

module.exports = mongoose.model("CustomerQueue", queueSchema);