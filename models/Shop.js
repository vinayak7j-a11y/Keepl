const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true
  },

  ownerName: {
    type: String,
    required: true,
    trim: true
  },

  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  shopId: {
    type: String,
    unique: true,
    index: true
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
    default: 10, // ₹100 spent → 10 points
    min: 0
  }

},
{
  timestamps: true
}
);

module.exports = mongoose.model("Shop", shopSchema);