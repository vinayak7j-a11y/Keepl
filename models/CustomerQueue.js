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
    type: Date,
    default: () => new Date(Date.now() + 1000 * 60 * 10) // 10 minutes
  }

},
{
  timestamps: true
});


/* =========================
   INDEXES (IMPORTANT)
========================= */

// Fast lookup for dashboard (active queue)
queueSchema.index({ shopId: 1, status: 1 });

// Prevent duplicate active entries per user per shop
queueSchema.index(
  { phone: 1, shopId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["waiting", "processing"] }
    }
  }
);

// Auto-delete expired entries (TTL)
queueSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Latest first sorting
queueSchema.index({ createdAt: -1 });


/* =========================
   METHODS (SAFE FLOW)
========================= */

// Move to processing
queueSchema.methods.startProcessing = function () {
  if (this.status === "waiting") {
    this.status = "processing";
  }
};

// Complete request
queueSchema.methods.complete = function () {
  if (this.status === "waiting" || this.status === "processing") {
    this.status = "completed";
  }
};

// Cancel request
queueSchema.methods.cancel = function () {
  if (this.status !== "completed") {
    this.status = "cancelled";
  }
};


module.exports = mongoose.model("CustomerQueue", queueSchema);