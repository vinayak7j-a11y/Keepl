const Shop = require("../models/Shop");
const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");

exports.getAnalytics = async (req, res) => {
  try {
    const { shopId } = req.params;
    const range = parseInt(req.query.range) || 7;

    const shop = await Shop.findOne({ shopId }).lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const since = new Date();
    since.setDate(since.getDate() - range);
    since.setHours(0, 0, 0, 0);

    // Daily revenue + points grouped by day
    const daily = await Transaction.aggregate([
      {
        $match: {
          shopId: shop._id,
          type: "earn",
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" }
          },
          revenue: { $sum: "$billAmount" },
          points: { $sum: "$points" },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill missing days with 0
    const dayMap = {};
    daily.forEach(d => { dayMap[d._id] = d; });

    const labels = [], revenue = [], pointsData = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }));
      revenue.push(dayMap[key]?.revenue || 0);
      pointsData.push(dayMap[key]?.points || 0);
    }

    // Totals
    const totalRevenue = revenue.reduce((a, b) => a + b, 0);
    const totalPoints = pointsData.reduce((a, b) => a + b, 0);
    const totalTransactions = daily.reduce((a, d) => a + d.transactions, 0);
    const avgBill = totalTransactions > 0
      ? Math.round(totalRevenue / totalTransactions)
      : 0;

    // Repeat customers (wallets with totalEarned from multiple transactions)
    const wallets = await Wallet.find({ shopId: shop._id }).lean();
    const totalCustomers = wallets.length;
    const repeatCustomers = wallets.filter(w => w.totalEarned > 0).length;

    // Rough repeat % — users with >1 transaction in range
    const repeatInRange = await Transaction.aggregate([
      { $match: { shopId: shop._id, type: "earn", createdAt: { $gte: since } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "total" }
    ]);
    const repeatCount = repeatInRange[0]?.total || 0;
    const uniqueInRange = await Transaction.distinct("userId", {
      shopId: shop._id, type: "earn", createdAt: { $gte: since }
    });
    const repeatPct = uniqueInRange.length > 0
      ? Math.round((repeatCount / uniqueInRange.length) * 100)
      : 0;

    // Top customers by points in this shop
    const topWallets = await Wallet.find({ shopId: shop._id })
      .sort({ totalEarned: -1 })
      .limit(5)
      .populate("userId", "name phone")
      .lean();

    const topCustomers = topWallets.map(w => ({
      name: w.userId?.name || "Unknown",
      phone: w.userId?.phone || "",
      points: w.points,
      totalEarned: w.totalEarned
    }));

    res.json({
      labels,
      revenue,
      points: pointsData,
      stats: { totalRevenue, totalPoints, totalTransactions, avgBill, repeatPct, totalCustomers },
      topCustomers
    });

  } catch (err) {
    console.error("❌ Analytics error:", err);
    res.status(500).json({ message: "Server error" });
  }
};