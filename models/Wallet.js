const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
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

  points: {
    type: Number,
    default: 0,
    min: 0
  },

  totalEarned: {
    type: Number,
    default: 0
  },

  totalRedeemed: {
    type: Number,
    default: 0
  },

  lastTransaction: {
    type: Date
  }

},
{
  timestamps: true
});

/* =========================
   UNIQUE WALLET RULE
========================= */

// one wallet per user per shop
walletSchema.index({ userId: 1, shopId: 1 }, { unique: true });

/* =========================
   METHODS
========================= */

// add points
walletSchema.methods.addPoints = function(points) {
  this.points += points;
  this.totalEarned += points;
  this.lastTransaction = new Date();
};

// redeem points
walletSchema.methods.redeemPoints = function(points) {
  if (this.points < points) {
    throw new Error("Insufficient points");
  }

  this.points -= points;
  this.totalRedeemed += points;
  this.lastTransaction = new Date();
};

module.exports = mongoose.model("Wallet", walletSchema);