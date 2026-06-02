const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const Shop = require("../models/Shop");
const User = require("../models/User");
const CustomerQueue = require("../models/CustomerQueue");

console.log("✅ transactionController loaded");

/* =========================
   ADD TRANSACTION
========================= */

const addTransaction = async (req, res) => {
  try {

    console.log("🔥 Transaction request:", req.body);

    const { phone, shopId, billAmount, queueId } = req.body;

    /* ===== VALIDATION ===== */

    if (!phone || !shopId || !billAmount) {
      return res.status(400).json({
        message: "Phone, shopId and billAmount are required"
      });
    }

    const amount = Number(billAmount);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Bill amount must be a positive number"
      });
    }

    if (amount > 100000) {
      return res.status(400).json({
        message: "Bill amount cannot exceed ₹1,00,000"
      });
    }

    /* ===== FIND SHOP ===== */

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    /* ===== FIND USER ===== */

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        message: "Customer not found. Ask them to scan the QR first."
      });
    }

    /* ===== CALCULATE POINTS ===== */

    const rewardRate = shop.rewardRate || 10;
    const pointsEarned = Math.floor((amount / 100) * rewardRate);

    console.log(`💰 ₹${amount} → ${pointsEarned} points`);

    /* ===== UPDATE WALLET ===== */

    const wallet = await Wallet.findOneAndUpdate(
      { userId: user._id, shopId: shop._id },
      {
      $inc: {
  points: pointsEarned,
  totalEarned: pointsEarned,
  totalSpent: amount,
  visitCount: 1
}, 
        $set: { lastTransaction: new Date() }
      },
      { new: true, upsert: true }
    );

    /* ===== UPDATE USER STATS ===== */
    // ✅ visits incremented HERE when bill is paid
    // NOT during scan/capture

    await User.findOneAndUpdate(
      { _id: user._id },
      {
        $inc: {
          totalSpent: amount,
          totalPointsEarned: pointsEarned,
          totalVisits: 1              // ✅ only count visit when points are given
        },
        $currentDate: { lastVisit: true }
      }
    );

    /* ===== UPDATE SHOP STATS ===== */

    await Shop.findOneAndUpdate(
      { _id: shop._id },
      {
        $inc: {
          totalTransactions: 1,
          totalPointsIssued: pointsEarned,
          totalRevenue: amount
        }
      }
    );

    /* ===== SAVE TRANSACTION ===== */

    const transaction = await Transaction.create({
      shopId: shop._id,
      userId: user._id,
      phone,
      billAmount: amount,
      points: pointsEarned,
      type: "earn",
      source: "queue",
      description: `₹${amount} purchase — ${pointsEarned} pts earned`
    });

    /* ===== CLEAR QUEUE ===== */

    if (queueId) {
      await CustomerQueue.findByIdAndUpdate(queueId, {
        $set: { status: "completed" }
      });
      console.log(`✅ Queue ${queueId} marked completed`);
    } else {
      await CustomerQueue.findOneAndUpdate(
        {
          phone,
          shopId: shop._id,
          status: { $in: ["waiting", "processing"] }
        },
        { $set: { status: "completed" } }
      );
      console.log(`✅ Queue cleared for ${phone} by fallback`);
    }

    console.log(`✅ Done: ${phone} earned ${pointsEarned} pts | total: ${wallet.points}`);

    res.json({
      success: true,
      message: "Points added",
      pointsEarned,
      totalPoints: wallet.points,
      billAmount: amount,
      transactionId: transaction._id
    });

  } catch (error) {
    console.error("❌ Transaction error:", error);
    res.status(500).json({
      message: "Server error",
      detail: error.message
    });
  }
};


/* =========================
   GET TRANSACTION HISTORY
========================= */

const getTransactions = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const transactions = await Transaction.find({ shopId: shop._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(transactions);

  } catch (error) {
    console.error("❌ Get transactions error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



/* =========================
   UNDO LAST TRANSACTION
========================= */

const undoTransaction = async (req, res) => {
  try {
    const { phone, shopId } = req.body;

    if (!phone || !shopId) {
      return res.status(400).json({ message: "Phone and shopId required" });
    }

    const shop = await Shop.findOne({ shopId }).lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const user = await User.findOne({ phone }).lean();
    if (!user) return res.status(404).json({ message: "Customer not found" });

    // Find last earn transaction within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const lastTransaction = await Transaction.findOne({
      shopId: shop._id,
      userId: user._id,
      type: "earn",
      createdAt: { $gte: fiveMinutesAgo }
    }).sort({ createdAt: -1 });

    if (!lastTransaction) {
      return res.status(400).json({
        message: "No transaction to undo. Undo is only available within 5 minutes."
      });
    }

    const points = lastTransaction.points;
    const amount = lastTransaction.billAmount;

    // Reverse wallet
    await Wallet.findOneAndUpdate(
      { userId: user._id, shopId: shop._id },
      {
        $inc: {
  points: -points,
  totalEarned: -points,
  totalSpent: -amount,
  visitCount: -1
},
        $set: { lastTransaction: new Date() }
      }
    );

    // Reverse user stats
    await User.findOneAndUpdate(
      { _id: user._id },
      {
        $inc: {
          totalSpent: -amount,
          totalPointsEarned: -points,
          totalVisits: -1
        }
      }
    );

    // Reverse shop stats
    await Shop.findOneAndUpdate(
      { _id: shop._id },
      {
        $inc: {
          totalTransactions: -1,
          totalPointsIssued: -points,
          totalRevenue: -amount
        }
      }
    );

    // Delete the transaction
    await Transaction.findByIdAndDelete(lastTransaction._id);

    res.json({
      success: true,
      message: `Undone — ${points} pts removed`,
      pointsRemoved: points,
      billAmount: amount
    });

  } catch (error) {
    console.error("Undo error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   EXPORT
========================= */

module.exports = {
  addTransaction,
  getTransactions,
  undoTransaction
};