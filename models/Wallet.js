const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop"
  },
  points: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("Wallet", walletSchema);