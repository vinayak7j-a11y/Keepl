const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Shop = require("../models/Shop");
const CustomerQueue = require("../models/CustomerQueue");
const Transaction = require("../models/Transaction");

/* =========================
   CAPTURE CUSTOMER
========================= */

const captureCustomer = async (req, res) => {
  try {
    let { name, phone, shopId } = req.body;

    name = name?.trim();
    phone = phone?.trim();

    if (!name || !phone || !shopId) {
      return res.status(400).json({ message: "Name, phone and shopId are required" });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const user = await User.findOneAndUpdate(
      { phone },
      {
        $set: { name, phone },
        $inc: { totalVisits: 1 },
        $currentDate: { lastVisit: true }
      },
      { new: true, upsert: true }
    );

    await Wallet.findOneAndUpdate(
      { userId: user._id, shopId: shop._id },
      { $setOnInsert: { points: 0, totalEarned: 0, totalRedeemed: 0 } },
      { upsert: true }
    );

    const wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    }).lean();

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
      { new: true, upsert: true }
    );

    console.log(`✅ Customer queued: ${name} (${phone}) at shop ${shopId}`);

    res.json({
      success: true,
      message: "Added to queue",
      queueId: queueEntry._id,
      points: wallet?.points || 0,
      totalVisits: user.totalVisits || 1
    });

  } catch (error) {
    console.error("❌ Customer capture error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};


/* =========================
   GET CUSTOMER
========================= */

const getCustomer = async (req, res) => {
  try {
    const { phone, shopId } = req.params;

    if (!phone || !shopId) {
      return res.status(400).json({ message: "Phone and shopId are required" });
    }

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const user = await User.findOne({ phone }).lean();

    if (!user) {
      return res.status(404).json({ message: "Customer not found" });
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
    console.error("❌ Get customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================
   GET WALLET — used by thank you
   page to poll live points
   GET /api/customers/wallet/:phone/:shopId
========================= */

const getWallet = async (req, res) => {
  try {
    const { phone, shopId } = req.params;

    if (!phone || !shopId) {
      return res.status(400).json({ message: "Phone and shopId are required" });
    }

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const user = await User.findOne({ phone }).lean();

    if (!user) {
      return res.json({ points: 0, totalEarned: 0 });
    }

    const wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    }).lean();

    res.json({
      points: wallet?.points || 0,
      totalEarned: wallet?.totalEarned || 0,
      totalRedeemed: wallet?.totalRedeemed || 0
    });

  } catch (error) {
    console.error("❌ Get wallet error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================
   GET ALL CUSTOMERS FOR SHOP
   — includes redeem history
========================= */

const getShopCustomers = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // 1. All wallets for this shop
    const wallets = await Wallet.find({ shopId: shop._id }).lean();
    const userIds = wallets.map(w => w.userId);

    // 2. All users
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    // 3. All redeem transactions for this shop, grouped by userId
    const redeemTxns = await Transaction.find({
      shopId: shop._id,
      type: "redeem"
    })
      .select("userId createdAt points")
      .sort({ createdAt: -1 })
      .lean();

    // Group redeem transactions by userId
    const redeemMap = {};
    redeemTxns.forEach(t => {
      const key = t.userId.toString();
      if (!redeemMap[key]) redeemMap[key] = [];
      redeemMap[key].push({
        date: t.createdAt,
        points: t.points
      });
    });

    // 4. Build customer list
    const customers = wallets.map(w => {
      const user = userMap[w.userId.toString()];
      const redeemHistory = redeemMap[w.userId.toString()] || [];

      return {
        name: user?.name || "Unknown",
        phone: user?.phone || "",
        points: w.points || 0,
        totalEarned: w.totalEarned || 0,
        totalRedeemed: w.totalRedeemed || 0,
        visits: user?.totalVisits || 0,
        totalSpent: user?.totalSpent || 0,
        lastVisit: user?.lastVisit || null,
        redeemCount: redeemHistory.length,
        redeemHistory                          // array of { date, points }
      };
    });

    // Sort by points descending
    customers.sort((a, b) => b.points - a.points);

    res.json(customers);

  } catch (error) {
    console.error("❌ Get shop customers error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================
   EXPORT
========================= */

module.exports = {
  captureCustomer,
  getCustomer,
  getWallet,
  getShopCustomers
};