const Shop = require("../models/Shop");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const CustomerQueue = require("../models/CustomerQueue"); 
const Notification = require("../models/Notification");

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d;
}

const getAdminPage = (req, res) => {
  res.render("admin");
};

const getOverviewStats = async (req, res) => {
  try {
    const todayStart = startOfDay();

    const [
      totalShops,
      activeShops,
      totalCustomers,
      totalTransactions,
      scansToday,
      pointsToday,
      redeemsToday,
      shopsThisWeek,
      customersToday,
    ] = await Promise.all([
      Shop.countDocuments(),
      Shop.countDocuments({ isActive: true }),
      User.countDocuments(),
      Transaction.countDocuments(),
      CustomerQueue.countDocuments({ createdAt: { $gte: todayStart } }),
      Transaction.aggregate([
        { $match: { type: "earn", createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$points" } } }
      ]),
      Transaction.countDocuments({ type: "redeem", createdAt: { $gte: todayStart } }),
      Shop.countDocuments({ createdAt: { $gte: startOfWeek() } }),
      Transaction.distinct("userId", { createdAt: { $gte: todayStart } }),
    ]);

    const repeatUsers = await User.countDocuments({ totalVisits: { $gt: 1 } });
    const repeatRate = totalCustomers > 0
      ? Math.round((repeatUsers / totalCustomers) * 100)
      : 0;

    res.json({
      totalShops,
      activeShops,
      totalCustomers,
      totalTransactions,
      scansToday,
      pointsToday: pointsToday[0]?.total || 0,
      redeemsToday,
      shopsThisWeek,
      customersToday: new Set(customersToday.map(id => id.toString())).size,
      repeatRate,
    });

  } catch (err) {
    console.error("Admin overview error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getShopStats = async (req, res) => {
  try {
    const todayStart = startOfDay();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const shops = await Shop.find()
      .select("name ownerName phone shopId isActive totalCustomers totalTransactions totalPointsIssued totalRevenue createdAt trialEndsAt rewardName rewardThreshold")
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(shops.map(async (shop) => {
      const [scansToday, pointsToday, activeQueue, lastTransaction] = await Promise.all([
        CustomerQueue.countDocuments({ shopId: shop._id, createdAt: { $gte: todayStart } }),
        Transaction.aggregate([
          { $match: { shopId: shop._id, type: "earn", createdAt: { $gte: todayStart } } },
          { $group: { _id: null, total: { $sum: "$points" } } }
        ]),
        CustomerQueue.countDocuments({ shopId: shop._id, status: { $in: ["waiting", "processing"] } }),
        Transaction.findOne({ shopId: shop._id }).sort({ createdAt: -1 }).select("createdAt").lean(),
      ]);

      const trialDaysLeft = shop.trialEndsAt
        ? Math.ceil((new Date(shop.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...shop,
        scansToday,
        pointsToday: pointsToday[0]?.total || 0,
        activeQueue,
        lastActive: lastTransaction?.createdAt || null,
        trialDaysLeft,
      };
    }));

    res.json(enriched);

  } catch (err) {
    console.error("Admin shop stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getDailyScans = async (req, res) => {
  try {
    const days = 7;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const count = await CustomerQueue.countDocuments({
        createdAt: { $gte: start, $lte: end }
      });

      result.push({
        date: start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
        scans: count,
      });
    }

    res.json(result);

  } catch (err) {
    console.error("Daily scans error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getActivityFeed = async (req, res) => {
  try {
    const [recentTransactions, recentScans, recentShops] = await Promise.all([
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("shopId", "name")
        .lean(),
      CustomerQueue.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("shopId", "name")
        .lean(),
      Shop.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name createdAt")
        .lean(),
    ]);

    const events = [];

    recentTransactions.forEach(t => {
      events.push({
        type: t.type === "earn" ? "points" : "redeem",
        text: t.type === "earn"
          ? `${t.points} pts given to ${t.phone} at ${t.shopId?.name || "unknown shop"}`
          : `Reward redeemed by ${t.phone} at ${t.shopId?.name || "unknown shop"}`,
        time: t.createdAt,
      });
    });

    recentScans.forEach(s => {
      events.push({
        type: "scan",
        text: `${s.name || s.phone} scanned QR at ${s.shopId?.name || "unknown shop"}`,
        time: s.createdAt,
      });
    });

    recentShops.forEach(s => {
      events.push({
        type: "register",
        text: `New shop registered: ${s.name}`,
        time: s.createdAt,
      });
    });

    events.sort((a, b) => new Date(b.time) - new Date(a.time));
    res.json(events.slice(0, 20));

  } catch (err) {
    console.error("Activity feed error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getAttentionItems = async (req, res) => {
  try {
    const todayStart = startOfDay();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const allShops = await Shop.find().select("_id name shopId trialEndsAt").lean();

    const shopsWithScansToday = await CustomerQueue.distinct("shopId", {
      createdAt: { $gte: todayStart }
    });
    const shopsWithScansTodaySet = new Set(shopsWithScansToday.map(id => id.toString()));
    const idleShops = allShops.filter(s => !shopsWithScansTodaySet.has(s._id.toString()));

    const expiredQueues = await CustomerQueue.countDocuments({
      status: "waiting",
      expiresAt: { $lt: new Date() }
    });

    const closeToReward = await Wallet.aggregate([
      {
        $lookup: {
          from: "shops",
          localField: "shopId",
          foreignField: "_id",
          as: "shop"
        }
      },
      { $unwind: "$shop" },
      {
        $match: {
          $expr: {
            $and: [
              { $gte: ["$points", { $multiply: ["$shop.rewardThreshold", 0.8] }] },
              { $lt: ["$points", "$shop.rewardThreshold"] }
            ]
          }
        }
      },
      { $count: "total" }
    ]);

    const recentShopIds = await Transaction.distinct("shopId", {
      createdAt: { $gte: threeDaysAgo }
    });
    const recentSet = new Set(recentShopIds.map(id => id.toString()));
    const inactiveShops = allShops.filter(s => !recentSet.has(s._id.toString()));

    const zeroPointTx = await Transaction.countDocuments({
      type: "earn",
      points: 0,
      createdAt: { $gte: todayStart }
    });

    const expiringTrials = allShops.filter(s => {
      if (!s.trialEndsAt) return false;
      const daysLeft = Math.ceil((new Date(s.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 3;
    });

    res.json({
      idleShopsToday: idleShops.length,
      idleShopNames: idleShops.map(s => s.name).slice(0, 3),
      expiredQueues,
      closeToReward: closeToReward[0]?.total || 0,
      inactiveShops: inactiveShops.length,
      inactiveShopNames: inactiveShops.map(s => s.name).slice(0, 3),
      zeroPointTx,
      expiringTrials: expiringTrials.length,
      expiringTrialNames: expiringTrials.map(s => s.name).slice(0, 3),
    });

  } catch (err) {
    console.error("Attention items error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password required" });
    }

    if (phone !== process.env.ADMIN_PHONE || password !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ message: "Invalid admin credentials" });
    }

    const jwt = require("jsonwebtoken");

    const token = jwt.sign(
      { phone: process.env.ADMIN_PHONE },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, phone });

  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAdminPage,
  getOverviewStats,
  getShopStats,
  getDailyScans,
  getActivityFeed,
  getAttentionItems,
  adminLogin,
};

const toggleShopBlock = async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findOne({ shopId });
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    shop.isActive = !shop.isActive;
    await shop.save();

    res.json({
      success: true,
      isActive: shop.isActive,
      message: `Shop ${shop.isActive ? "unblocked" : "blocked"} successfully`
    });

  } catch (err) {
    console.error("Toggle block error:", err);
    res.status(500).json({ message: "Server error" });
  }
}; 
module.exports.toggleShopBlock = toggleShopBlock; 
const deleteShopForever = async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findOne({ shopId });
    if (!shop) return res.status(404).json({ message: "Shop not found" });
await Promise.all([
  CustomerQueue.deleteMany({ shopId: shop._id }),
  Transaction.deleteMany({ shopId: shop._id }),
  Wallet.deleteMany({ shopId: shop._id }),
  Notification.deleteMany({ shopId: shop._id }),
  Shop.deleteOne({ shopId })
]);
    
    res.json({ success: true, message: "Shop and related data deleted successfully" });

  } catch (err) {
    console.error("Delete shop error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
module.exports.deleteShopForever = deleteShopForever;