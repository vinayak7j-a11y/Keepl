const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop"
  },
  type: {
    type: String,
    enum: ["earn", "redeem"]
  },
  billAmount: {
    type: Number
  },
  points: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Transaction", transactionSchema);