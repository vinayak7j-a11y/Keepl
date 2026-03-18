const mongoose = require("mongoose");

const User = require("../models/User");
const Shop = require("../models/Shop");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const CustomerQueue = require("../models/CustomerQueue");

/* =========================
   ADD TRANSACTION
========================= */

const addTransaction = async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const { phone, shopId, billAmount, queueId } = req.body;
    const amount = Number(billAmount);

    if (!phone || !shopId) {
      throw new Error("Phone and shopId required");
    }

    if (!amount || amount <= 0) {
      throw new Error("Invalid bill amount");
    }

    /* ===== FIND SHOP ===== */

    const shop = await Shop.findOne({ shopId }).session(session);

    if (!shop) {
      throw new Error("Shop not found");
    }

    /* ===== USER ===== */

    let user = await User.findOneAndUpdate(
      { phone },
      { $setOnInsert: { phone } },
      { new: true, upsert: true, session }
    );

    /* ===== POINTS ===== */

    const pointsEarned = shop.calculatePoints
      ? shop.calculatePoints(amount)
      : Math.floor((amount / 100) * (shop.rewardRate || 10));

    /* ===== WALLET ===== */

    let wallet = await Wallet.findOneAndUpdate(
      { userId: user._id, shopId: shop._id },
      { $setOnInsert: { points: 0, totalEarned: 0 } },
      { new: true, upsert: true, session }
    );

    wallet.points += pointsEarned;
    wallet.totalEarned += pointsEarned;
    wallet.lastTransaction = new Date();

    await wallet.save({ session });

    /* ===== CREATE TRANSACTION ===== */

    await Transaction.create([{
      userId: user._id,
      shopId: shop._id,
      type: "earn",
      billAmount: amount,
      points: pointsEarned,
      phone,
      source: "manual"
    }], { session });

    /* ===== USER UPDATE ===== */

    user.totalVisits = (user.totalVisits || 0) + 1;
    user.totalSpent = (user.totalSpent || 0) + amount;
    user.totalPointsEarned = (user.totalPointsEarned || 0) + pointsEarned;
    user.lastVisit = new Date();

    await user.save({ session });

    /* ===== SHOP UPDATE ===== */

    shop.totalTransactions = (shop.totalTransactions || 0) + 1;
    shop.totalRevenue = (shop.totalRevenue || 0) + amount;
    shop.totalPointsIssued = (shop.totalPointsIssued || 0) + pointsEarned;

    await shop.save({ session });

    /* ===== QUEUE FIX (IMPORTANT) ===== */

    if (queueId) {
      await CustomerQueue.findByIdAndUpdate(
        queueId,
        { status: "completed" },
        { session }
      );
    }

    /* ===== NOTIFICATION ===== */

    await Notification.create([{
      userId: user._id,
      shopId: shop._id,
      phone,
      customerName: user.name || "Customer",
      points: pointsEarned,
      status: "processed"
    }], { session });

    /* ===== COMMIT ===== */

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Points added successfully",
      pointsEarned,
      totalPoints: wallet.points
    });

  } catch (error) {

    await session.abortTransaction();
    session.endSession();

    console.error("Transaction error:", error);

    res.status(400).json({
      message: error.message || "Server error"
    });

  }
};


/* =========================
   GET SHOP TRANSACTIONS
========================= */

const getTransactions = async (req, res) => {
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

const getCustomerTransactions = async (req, res) => {
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


/* =========================
   EXPORT (FINAL)
========================= */

module.exports = {
  addTransaction,
  getTransactions,
  getCustomerTransactions
};