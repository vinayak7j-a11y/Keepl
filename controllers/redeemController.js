const User = require("../models/User");
const Shop = require("../models/Shop");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

/* =========================
   REDEEM POINTS (SAFE)
========================= */

exports.redeemPoints = async (req, res) => {
  try {
    let { phone, shopId, points } = req.body;

    points = Number(points);

    if (!phone || !shopId || !points || points <= 0) {
      return res.status(400).json({
        message: "Valid phone, shopId and points required"
      });
    }

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    const user = await User.findOne({ phone }).lean();

    if (!user) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    /* ===== ATOMIC WALLET UPDATE ===== */

    const wallet = await Wallet.findOneAndUpdate(
      {
        userId: user._id,
        shopId: shop._id,
        points: { $gte: points } // ✅ prevents negative
      },
      {
        $inc: { points: -points }
      },
      {
        new: true
      }
    );

    if (!wallet) {
      return res.status(400).json({
        message: "Not enough points"
      });
    }

    /* ===== CREATE TRANSACTION ===== */

    await Transaction.create({
      userId: user._id,
      shopId: shop._id,
      type: "redeem",
      points
    });

    res.json({
      message: "Points redeemed",
      remainingPoints: wallet.points
    });

  } catch (error) {
    console.error("Redeem error:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};


/* =========================
   SHOP REDEMPTION HISTORY
========================= */

exports.getRedemptions = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

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
    res.status(500).json({
      message: "Server error"
    });
  }
};


/* =========================
   CUSTOMER REDEMPTIONS
========================= */

exports.getCustomerRedemptions = async (req, res) => {
  try {
    const { phone } = req.params;

    const user = await User.findOne({ phone }).lean();

    if (!user) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

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
    res.status(500).json({
      message: "Server error"
    });
  }
};