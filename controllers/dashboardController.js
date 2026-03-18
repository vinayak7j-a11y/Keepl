const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const Shop = require("../models/Shop");
const CustomerQueue = require("../models/CustomerQueue");
const User = require("../models/User");

/* =========================
   DASHBOARD PAGE (OPTIMIZED)
========================= */

const getDashboard = async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).send("Invalid shop");
    }

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    /* ===== QUEUE (FIXED FILTER) ===== */

    const now = new Date();

    const queue = await CustomerQueue.find({
      shopId: shop._id,
      status: "waiting",
      expiresAt: { $gt: now } // ✅ remove expired
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();

    const phones = queue.map(q => q.phone);

    /* ===== BULK FETCH USERS ===== */

    const users = await User.find({
      phone: { $in: phones }
    }).lean();

    const userMap = {};
    users.forEach(u => {
      userMap[u.phone] = u;
    });

    /* ===== BULK FETCH WALLETS ===== */

    const userIds = users.map(u => u._id);

    const wallets = await Wallet.find({
      userId: { $in: userIds },
      shopId: shop._id
    }).lean();

    const walletMap = {};
    wallets.forEach(w => {
      walletMap[w.userId.toString()] = w;
    });

    /* ===== BUILD CUSTOMER DATA ===== */

    const customers = queue.map(q => {
      const user = userMap[q.phone];
      const wallet = user
        ? walletMap[user._id.toString()]
        : null;

      return {
        queueId: q._id, // ✅ IMPORTANT (needed later)
        name: q.name,
        phone: q.phone,
        visits: user?.totalVisits || 0,
        totalSpent: user?.totalSpent || 0,
        points: wallet?.points || 0
      };
    });

    /* ===== TODAY STATS ===== */

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = await Transaction.find({
      shopId: shop._id,
      createdAt: { $gte: today }
    }).lean();

    const customersToday = todayTransactions.length;

    const pointsToday = todayTransactions.reduce(
      (sum, t) => sum + (t.points || 0),
      0
    );

    res.render("dashboard", {
      shop,
      customers,
      customersToday,
      pointsToday
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).send("Dashboard error");
  }
}; 
module.exports = {
  getDashboard
};