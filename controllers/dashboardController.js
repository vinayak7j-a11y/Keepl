const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const Shop = require("../models/Shop");
const CustomerQueue = require("../models/CustomerQueue");


/* =========================
   DASHBOARD STATS API
========================= */

exports.getStats = async (req, res) => {

  try {

    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).json({ message: "ShopId required" });
    }

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    /* TRANSACTION STATS */

    const transactionStats = await Transaction.aggregate([
      { $match: { shopId: shop._id } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$billAmount", 0] } },
          totalPointsIssued: { $sum: { $ifNull: ["$points", 0] } }
        }
      }
    ]);

    const stats = transactionStats[0] || {
      totalTransactions: 0,
      revenue: 0,
      totalPointsIssued: 0
    };

    /* TOTAL CUSTOMERS */

    const totalCustomers = await Wallet.countDocuments({
      shopId: shop._id
    });

    /* REPEAT CUSTOMERS */

    const repeatCustomers = await Transaction.aggregate([
      { $match: { shopId: shop._id } },
      {
        $group: {
          _id: "$userId",
          visits: { $sum: 1 }
        }
      },
      { $match: { visits: { $gt: 1 } } },
      { $count: "repeatCount" }
    ]);

    const repeatCount = repeatCustomers[0]?.repeatCount || 0;

    res.json({
      totalCustomers,
      totalTransactions: stats.totalTransactions,
      totalPointsIssued: stats.totalPointsIssued,
      revenue: stats.revenue,
      repeatCustomers: repeatCount
    });

  } catch (error) {

    console.error("Stats error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};


/* =========================
   DASHBOARD PAGE
========================= */

exports.getDashboard = async (req, res) => {

  try {

    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).send("Invalid shop");
    }

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    /* CUSTOMER QUEUE */

    const customers = await CustomerQueue.find({
      shopId: shop._id,
      status: "waiting"
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("name phone createdAt")
    .lean();

    /* TODAY STATS */

    const today = new Date();
    today.setHours(0,0,0,0);

    const todayStats = await Transaction.aggregate([
      {
        $match: {
          shopId: shop._id,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          customersToday: { $sum: 1 },
          pointsToday: { $sum: { $ifNull: ["$points", 0] } }
        }
      }
    ]);

    const stats = todayStats[0] || {
      customersToday: 0,
      pointsToday: 0
    };

    res.render("dashboard", {
      shop,
      customers,
      customersToday: stats.customersToday,
      pointsToday: stats.pointsToday
    });

  } catch (error) {

    console.error("Dashboard error:", error);

    res.status(500).send("Dashboard error");

  }

};


/* =========================
   CUSTOMER ANALYTICS
========================= */

exports.getCustomerAnalytics = async (req, res) => {

  try {

    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const totalCustomers = await Wallet.countDocuments({
      shopId: shop._id
    });

    res.json({
      totalCustomers
    });

  } catch (error) {

    console.error("Customer analytics error:", error);

    res.status(500).json({ message: "Server error" });

  }

};


/* =========================
   REVENUE ANALYTICS
========================= */

exports.getRevenueAnalytics = async (req, res) => {

  try {

    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const revenueStats = await Transaction.aggregate([
      { $match: { shopId: shop._id } },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $ifNull: ["$billAmount", 0] } }
        }
      }
    ]);

    const revenue = revenueStats[0]?.revenue || 0;

    res.json({
      revenue
    });

  } catch (error) {

    console.error("Revenue analytics error:", error);

    res.status(500).json({ message: "Server error" });

  }

};