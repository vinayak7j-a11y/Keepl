const User = require("../models/User");
const Shop = require("../models/Shop");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const CustomerQueue = require("../models/CustomerQueue");


/* =========================
   ADD TRANSACTION
========================= */

exports.addTransaction = async (req, res) => {

  try {

    const { phone, shopId, billAmount } = req.body;

    const amount = Number(billAmount);

    if (!phone || !shopId) {
      return res.status(400).json({ message: "Phone and shopId required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid bill amount" });
    }

    /* ===== FIND SHOP ===== */

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    /* ===== FIND OR CREATE USER ===== */

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone });
    }

    /* ===== PREVENT DUPLICATE TRANSACTION ===== */

    const recentTransaction = await Transaction.findOne({
      phone,
      shopId: shop._id,
      createdAt: { $gt: new Date(Date.now() - 10000) }
    });

    if (recentTransaction) {
      return res.status(400).json({
        message: "Transaction already processed"
      });
    }

    /* ===== CALCULATE POINTS ===== */

    const pointsEarned = shop.calculatePoints
      ? shop.calculatePoints(amount)
      : Math.floor((amount / 100) * (shop.rewardRate || 10));

    /* ===== FIND OR CREATE WALLET ===== */

    let wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    });

    if (!wallet) {
      wallet = await Wallet.create({
        userId: user._id,
        shopId: shop._id,
        points: 0,
        totalEarned: 0
      });
    }

    /* ===== UPDATE WALLET ===== */

    wallet.points += pointsEarned;
    wallet.totalEarned += pointsEarned;
    wallet.lastTransaction = new Date();

    await wallet.save();

    /* ===== CREATE TRANSACTION ===== */

    await Transaction.create({
      userId: user._id,
      shopId: shop._id,
      type: "earn",
      billAmount: amount,
      points: pointsEarned,
      phone,
      source: "manual"
    });

    /* ===== UPDATE USER ANALYTICS ===== */

    user.totalVisits = (user.totalVisits || 0) + 1;
    user.totalSpent = (user.totalSpent || 0) + amount;
    user.totalPointsEarned = (user.totalPointsEarned || 0) + pointsEarned;
    user.lastVisit = new Date();

    await user.save();

    /* ===== UPDATE SHOP ANALYTICS ===== */

    shop.totalTransactions = (shop.totalTransactions || 0) + 1;
    shop.totalRevenue = (shop.totalRevenue || 0) + amount;
    shop.totalPointsIssued = (shop.totalPointsIssued || 0) + pointsEarned;

    await shop.save();

    /* ===== REMOVE CUSTOMER FROM QUEUE ===== */

const queueItem = await CustomerQueue.findOne({
  phone,
  shopId: shop._id,
  status: "waiting"
}).sort({ createdAt: 1 });

if (queueItem) {
  await CustomerQueue.findByIdAndDelete(queueItem._id);
}
   
    /* ===== CREATE NOTIFICATION ===== */

    await Notification.create({
      userId: user._id,
      shopId: shop._id,
      phone,
      customerName: user.name || "Customer",
      points: pointsEarned,
      status: "processed"
    });

    /* ===== RESPONSE ===== */

    res.json({
      success: true,
      message: "Points added",
      pointsEarned,
      totalPoints: wallet.points
    });

  } catch (error) {

    console.error("Transaction error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};


/* =========================
   GET SHOP TRANSACTIONS
========================= */

exports.getTransactions = async (req, res) => {

  try {

    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const transactions = await Transaction.find({
      shopId: shop._id
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(transactions);

  } catch (error) {

    console.error("Get transactions error:", error);

    res.status(500).json({ message: "Server error" });

  }

};


/* =========================
   GET CUSTOMER TRANSACTIONS
========================= */

exports.getCustomerTransactions = async (req, res) => {

  try {

    const { phone } = req.params;

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    const transactions = await Transaction.find({
      userId: user._id
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(transactions);

  } catch (error) {

    console.error("Customer transactions error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};