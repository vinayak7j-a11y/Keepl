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

    /* TRANSACTIONS */

    const transactions = await Transaction.find({
      shopId: shop._id
    });

    const totalTransactions = transactions.length;

    const revenue = transactions.reduce(
      (sum, t) => sum + (t.billAmount || 0),
      0
    );

    const totalPointsIssued = transactions.reduce(
      (sum, t) => sum + (t.points || 0),
      0
    );


    /* TOTAL CUSTOMERS */

    const totalCustomers = await Wallet.countDocuments({
      shopId: shop._id
    });


    /* REPEAT CUSTOMERS */

    const visitMap = {};

    transactions.forEach(t => {

      const user = String(t.userId);

      visitMap[user] = (visitMap[user] || 0) + 1;

    });

    const repeatCustomers = Object.values(visitMap)
      .filter(v => v > 1).length;


    res.json({
      totalCustomers,
      totalTransactions,
      totalPointsIssued,
      revenue,
      repeatCustomers
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


    /* CUSTOMER QUEUE (ONLY WAITING CUSTOMERS) */

    const customers = await CustomerQueue.find({
      shopId: shop._id,
      status: "waiting"
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .select("name phone createdAt")
      .lean();


    /* TODAY STATS */

    const today = new Date();
    today.setHours(0,0,0,0);

    const todayTransactions = await Transaction.find({
      shopId: shop._id,
      createdAt: { $gte: today }
    });

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



/* =========================
   CUSTOMER ANALYTICS
========================= */

exports.getCustomerAnalytics = async (req, res) => {

  try {

    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    const totalCustomers = await Wallet.countDocuments({
      shopId: shop._id
    });

    res.json({
      totalCustomers
    });

  } catch (error) {

    console.error("Customer analytics error:", error);

    res.status(500).json({
      message: "Server error"
    });

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
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    const transactions = await Transaction.find({
      shopId: shop._id
    });

    const revenue = transactions.reduce(
      (sum, t) => sum + (t.billAmount || 0),
      0
    );

    res.json({
      revenue
    });

  } catch (error) {

    console.error("Revenue analytics error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};