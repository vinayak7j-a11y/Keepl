const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const Shop = require("../models/Shop");
const CustomerQueue = require("../models/CustomerQueue");

/* =========================
   API STATS (JSON)
========================= */

exports.getStats = async (req, res) => {

  try {

    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.json({ message: "Shop not found" });
    }

    const transactions = await Transaction.find({
      shopId: shop._id
    });

    const totalTransactions = transactions.length;

    let revenue = 0;

    transactions.forEach(t => {
      revenue += t.billAmount || 0;
    });

    const wallets = await Wallet.find({
      shopId: shop._id
    });

    const totalCustomers = wallets.length;

    let totalPointsIssued = 0;

    wallets.forEach(w => {
      totalPointsIssued += w.points;
    });

    const repeatCustomers = transactions.reduce((acc, t) => {

      acc[t.userId] = (acc[t.userId] || 0) + 1;

      return acc;

    }, {});

    const repeatCount = Object.values(repeatCustomers)
      .filter(c => c > 1).length;

    res.json({
      totalCustomers,
      totalTransactions,
      totalPointsIssued,
      revenue,
      repeatCustomers: repeatCount
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

};


/* =========================
   DASHBOARD PAGE (EJS)
========================= */

exports.getDashboard = async (req, res) => {

  try {

    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.send("Shop not found");
    }

    // customers waiting in queue
    const customers = await CustomerQueue.find({
      shopId: shop._id,
      status: "waiting"
    }).sort({ createdAt: -1 });

    // today's stats
    const today = new Date();
    today.setHours(0,0,0,0);

    const todayTransactions = await Transaction.find({
      shopId: shop._id,
      createdAt: { $gte: today }
    });

    const customersToday = todayTransactions.length;

    let pointsToday = 0;

    todayTransactions.forEach(t => {
      pointsToday += t.points || 0;
    });

    res.render("dashboard", {
      shop,
      customers,
      customersToday,
      pointsToday
    });

  } catch (error) {

    console.error(error);
    res.send("Dashboard error");

  }

};