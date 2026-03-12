const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true
  },
  ownerName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  shopId: {
    type: String,
    unique: true
  },
  qrCode: {
    type: String
  },
  rewardRate: {
    type: Number,
    default: 10 // ₹10 spent → 1 point
  }
},
{
  timestamps: true
}
);

module.exports = mongoose.model("Shop", shopSchema);