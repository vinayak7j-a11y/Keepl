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

    // ✅ Exclude qrCode from query — it's a large base64 string
    // that bloats the HTML and truncates the JS. Loaded via localStorage instead.
    const shop = await Shop.findOne({ shopId })
      .select("-qrCode")
      .lean();

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    /* ===== QUEUE (FIXED FILTER) ===== */

    const now = new Date();

    const queue = await CustomerQueue.find({
      shopId: shop._id,
      status: "waiting",
      expiresAt: { $gt: now }
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
        queueId: q._id,
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
const trialDaysLeft = shop.trialEndsAt
      ? Math.ceil((new Date(shop.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    res.render("dashboard", {
      shop,
      customers,
      customersToday,
      pointsToday,
      trialDaysLeft
    });
    

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).send("Dashboard error");
  }
};


/* =========================
   CUSTOMERS PAGE
========================= */

const getCustomersPage = async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).send("Invalid shop");
    }

    // ✅ Exclude qrCode here too — not needed on customers page
    const shop = await Shop.findOne({ shopId })
      .select("-qrCode")
      .lean();

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    res.render("customers", { shop });

  } catch (error) {
    console.error("Customers page error:", error);
    res.status(500).send("Server error");
  }
};


/* =========================
   LIVE STATS API
========================= */

const getLiveStats = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId })
      .select("-qrCode")
      .lean();

    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = await Transaction.find({
      shopId: shop._id,
      type: "earn",
      createdAt: { $gte: today }
    }).lean();

    const customersToday = todayTransactions.length;
    const pointsToday = todayTransactions.reduce(
      (sum, t) => sum + (t.points || 0), 0
    );

    res.json({ customersToday, pointsToday });

  } catch (error) {
    console.error("Live stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
/* =========================
   ONBOARDING STATUS API
========================= */

const getOnboardingStatus = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId }).select('qrCode').lean();
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const firstCustomer = await CustomerQueue.findOne({ shopId: shop._id }).lean();
    const firstPoints   = await Transaction.findOne({ shopId: shop._id, type: 'earn' }).lean();

    res.json({
      hasQR:             !!shop.qrCode,
      hasFirstCustomer:  !!firstCustomer,
      hasFirstPoints:    !!firstPoints
    });

  } catch (err) {
    console.error('Onboarding status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboard,
  getCustomersPage,
  getLiveStats,
  getOnboardingStatus
};
