const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },

  ownerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },

  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 10,
    maxlength: 15
  },

  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // hidden by default
  },

  shopId: {
    type: String,
    required: true,
    unique: true
  },

  logo: {
    type: String,
    default: ""
  },

  qrCode: {
    type: String,
    default: ""
  },

  rewardRate: {
    type: Number,
    default: 10, // ₹100 → 10 points
    min: 0
  },

  isActive: {
    type: Boolean,
    default: true
  },

  /* ===== ANALYTICS ===== */

  totalCustomers: {
    type: Number,
    default: 0
  },

  totalTransactions: {
    type: Number,
    default: 0
  },

  totalPointsIssued: {
    type: Number,
    default: 0
  },

  totalRevenue: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});


/* =========================
   INSTANCE METHODS
========================= */

// calculate reward points
shopSchema.methods.calculatePoints = function (billAmount) {

  if (!billAmount || billAmount <= 0) return 0;

  return Math.floor((billAmount / 100) * this.rewardRate);

};


/* =========================
   STATIC METHODS
========================= */

// find shop using public shopId
shopSchema.statics.findByShopId = function (shopId) {
  return this.findOne({ shopId });
};


/* =========================
   VIRTUAL FIELDS
========================= */

// useful for future QR display
shopSchema.virtual("qrUrl").get(function () {

  if (!this.shopId) return "";

  return `${process.env.BASE_URL}/s/${this.shopId}`;

});


module.exports = mongoose.model("Shop", shopSchema);