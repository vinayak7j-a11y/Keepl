const User = require("../models/User");
const Shop = require("../models/Shop");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");

exports.redeemPoints = async (req, res) => {

  try {

    const { phone, shopId, points } = req.body;

    const user = await User.findOne({ phone });

    if (!user) {
      return res.json({ message: "User not found" });
    }

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.json({ message: "Shop not found" });
    }

    const wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    });

    if (!wallet) {
      return res.json({ message: "Wallet not found" });
    }

    if (wallet.points < points) {
      return res.json({ message: "Not enough points" });
    }

    wallet.points -= points;

    await wallet.save();

    const transaction = new Transaction({
      userId: user._id,
      shopId: shop._id,
      type: "redeem",
      points
    });

    await transaction.save();

    const message =
`Hi ${user.name || "Customer"},

You redeemed ${points} points at ${shop.name}.

Remaining Points: ${wallet.points}

– Keepl`;

    const notification = new Notification({
      customerName: user.name || "Customer",
      phone,
      shopName: shop.name,
      points,
      message
    });

    await notification.save();

    res.json({
      message: "Points redeemed",
      remainingPoints: wallet.points
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};