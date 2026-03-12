const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop"
  },

  phone: String,

  customerName: String,

  points: Number,

  status: {
    type: String,
    default: "pending"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Notification", notificationSchema);