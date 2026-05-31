const User = require("../models/User");
const Shop = require("../models/Shop");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const CustomerQueue = require("../models/CustomerQueue");

/* =========================
   REDEEM POINTS
========================= */

exports.redeemPoints = async (req, res) => {
  try {
    let { phone, shopId, points, queueId } = req.body;

    points = Number(points);

    if (!phone || !shopId || !points || points <= 0) {
      return res.status(400).json({
        message: "Valid phone, shopId and points required"
      });
    }

    const shop = await Shop.findOne({ shopId }).lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const user = await User.findOne({ phone }).lean();
    if (!user) return res.status(404).json({ message: "Customer not found" });

    /* ===== ATOMIC WALLET UPDATE ===== */

    const wallet = await Wallet.findOneAndUpdate(
      {
        userId: user._id,
        shopId: shop._id,
        points: { $gte: points }           // ✅ prevents negative balance
      },
      {
        $inc: {
          points: -points,
          totalRedeemed: points             // ✅ fix: was missing
        },
        $set: { lastTransaction: new Date() } // ✅ fix: was missing
      },
      { new: true }
    );

    if (!wallet) {
      return res.status(400).json({ message: "Not enough points" });
    }

    /* ===== CREATE TRANSACTION ===== */

    await Transaction.create({
      shopId: shop._id,
      userId: user._id,
      phone,                                // ✅ fix: was missing
      points,
      type: "redeem",
      source: "queue",
      description: `${points} pts redeemed for reward`
    });

    /* ===== CLEAR QUEUE ===== */

    if (queueId) {
      await CustomerQueue.findByIdAndUpdate(queueId, {
        $set: { status: "completed" }
      });
    } else {
      await CustomerQueue.findOneAndUpdate(
        {
          phone,
          shopId: shop._id,
          status: { $in: ["waiting", "processing"] }
        },
        { $set: { status: "completed" } }
      );
    }

    res.json({
      success: true,
      message: "Points redeemed",
      pointsRedeemed: points,
      remainingPoints: wallet.points,
      customerName: user.name             // ✅ needed for WhatsApp on frontend
    });

  } catch (error) {
    console.error("Redeem error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   SHOP REDEMPTION HISTORY
========================= */

exports.getRedemptions = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId }).lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const redemptions = await Transaction.find({
      shopId: shop._id,
      type: "redeem"
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(redemptions);

  } catch (error) {
    console.error("Redemption history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   CUSTOMER REDEMPTIONS
========================= */

exports.getCustomerRedemptions = async (req, res) => {
  try {
    const { phone } = req.params;

    const user = await User.findOne({ phone }).lean();
    if (!user) return res.status(404).json({ message: "Customer not found" });

    const redemptions = await Transaction.find({
      userId: user._id,
      type: "redeem"
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(redemptions);

  } catch (error) {
    console.error("Customer redemption error:", error);
    res.status(500).json({ message: "Server error" });
  }
};