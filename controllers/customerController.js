const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Shop = require("../models/Shop");
const CustomerQueue = require("../models/CustomerQueue");

/* =========================
   CAPTURE CUSTOMER
========================= */

const captureCustomer = async (req, res) => {
  try {
    let { name, phone, shopId } = req.body;

    name = name?.trim();
    phone = phone?.trim();

    if (!name || !phone || !shopId) {
      return res.status(400).send("Invalid details");
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).send("Invalid phone number");
    }

    /* ===== FIND SHOP ===== */

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    /* ===== USER UPSERT ===== */

    const user = await User.findOneAndUpdate(
      { phone },
      { $set: { name, phone } },
      { new: true, upsert: true }
    );

    /* ===== WALLET UPSERT ===== */

    await Wallet.findOneAndUpdate(
      { userId: user._id, shopId: shop._id },
      { $setOnInsert: { points: 0, totalEarned: 0 } },
      { upsert: true }
    );

    /* ===== QUEUE ===== */

    const queueEntry = await CustomerQueue.findOneAndUpdate(
      {
        phone,
        shopId: shop._id,
        status: { $in: ["waiting", "processing"] }
      },
      {
        $set: {
          name,
          phone,
          shopId: shop._id,
          status: "waiting",
          expiresAt: new Date(Date.now() + 1000 * 60 * 10)
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    console.log("Queue Entry:", queueEntry._id);

    res.json({
      success: true,
      message: "Added to queue",
      queueId: queueEntry._id
    });

  } catch (error) {
    console.error("Customer capture error:", error);
    res.status(500).send("Something went wrong");
  }
};


/* =========================
   GET CUSTOMER
========================= */

const getCustomer = async (req, res) => {
  try {
    const { phone, shopId } = req.params;

    if (!phone || !shopId) {
      return res.status(400).json({
        message: "Phone and shopId required"
      });
    }

    const shop = await Shop.findOne({ shopId });

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

    const wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    }).lean();

    res.json({
      name: user.name || "Customer",
      phone: user.phone,
      points: wallet?.points || 0,
      totalEarned: wallet?.totalEarned || 0,
      visits: user.totalVisits || 0,
      totalSpent: user.totalSpent || 0,
      lastVisit: user.lastVisit || null
    });

  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};


/* =========================
   EXPORT (IMPORTANT FIX)
========================= */

exports.captureCustomer = captureCustomer;
exports.getCustomer = getCustomer; 
module.exports = {
  captureCustomer,
  getCustomer
};