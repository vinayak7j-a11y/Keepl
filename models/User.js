const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ""
  },

  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },

  isActive: {
    type: Boolean,
    default: true
  },

  totalVisits: {
    type: Number,
    default: 0
  },

  totalSpent: {
    type: Number,
    default: 0
  },

  totalPointsEarned: {
    type: Number,
    default: 0
  },

  lastVisit: {
    type: Date
  }

},
{
  timestamps: true
});

/* =========================
   INDEXES (FAST LOOKUPS)
========================= */



/* =========================
   METHODS
========================= */

userSchema.methods.recordVisit = function(amount, points){

  this.totalVisits += 1;
  this.totalSpent += amount;
  this.totalPointsEarned += points;
  this.lastVisit = new Date();

};

module.exports = mongoose.model("User", userSchema);