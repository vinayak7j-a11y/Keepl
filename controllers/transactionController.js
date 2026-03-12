const User = require("../models/User");
const Shop = require("../models/Shop");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const CustomerQueue = require("../models/CustomerQueue");

exports.addTransaction = async (req, res) => {

  try {

    const { phone, shopId } = req.body;
    const billAmount = Number(req.body.billAmount);

    if (!billAmount || billAmount <= 0) {
      return res.json({ message: "Invalid bill amount" });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      user = new User({ phone });
      await user.save();
    }

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.json({ message: "Shop not found" });
    }

    const rewardRate = Number(shop.rewardRate || shop.rewardRule || 0);

    const pointsEarned = Math.floor((billAmount / 100) * rewardRate);

    let wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    });

    if (!wallet) {
      wallet = new Wallet({
        userId: user._id,
        shopId: shop._id,
        points: 0
      });
    }

    wallet.points = (wallet.points || 0) + pointsEarned;
    await wallet.save();

    const transaction = new Transaction({
      userId: user._id,
      shopId: shop._id,
      type: "earn",
      billAmount,
      points: pointsEarned
    });

    await transaction.save();

    await CustomerQueue.findOneAndUpdate(
      {
        phone,
        shopId: shop._id,
        status: "waiting"
      },
      {
        status: "completed"
      },
      { sort: { createdAt: 1 } }
    );

    const message = `Hi ${user.name || "Customer"},

You earned ${pointsEarned} points at ${shop.name}.

Total Points: ${wallet.points}

Thanks for shopping!
Keepl`;

    const notification = new Notification({
      customerName: user.name || "Customer",
      phone,
      shopName: shop.name,
      points: pointsEarned,
      message
    });

    await notification.save();

    res.json({
      message: "Points added",
      pointsEarned,
      totalPoints: wallet.points
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};