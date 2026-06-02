const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Shop = require("../models/Shop");
const CustomerQueue = require("../models/CustomerQueue");
const Transaction = require("../models/Transaction");

const captureCustomer = async (req, res) => {
  try {
    let { name, phone, shopId } = req.body;
    name = name?.trim();
    phone = phone?.trim();
    if (!name || !phone || !shopId) return res.status(400).json({ message: "Name, phone and shopId are required" });
    if (!/^[0-9]{10}$/.test(phone)) return res.status(400).json({ message: "Phone number must be exactly 10 digits" });

    if (!req.body.consent) return res.status(400).json({ message: "Consent is required" });
    const shop = await Shop.findOne({ shopId });
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    const user = await User.findOneAndUpdate(
  { phone },
  {
    $set: { name, phone },
    $currentDate: { lastVisit: true }
  },
  { new: true, upsert: true }
);
    await Wallet.findOneAndUpdate({ userId: user._id, shopId: shop._id }, { $setOnInsert: { points: 0, totalEarned: 0, totalRedeemed: 0 } }, { upsert: true });
    const wallet = await Wallet.findOne({ userId: user._id, shopId: shop._id }).lean();
    const queueEntry = await CustomerQueue.findOneAndUpdate({ phone, shopId: shop._id, status: { $in: ["waiting", "processing"] } }, { $set: { name, phone, shopId: shop._id, status: "waiting", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8) } }, { new: true, upsert: true });
    console.log(`✅ Customer queued: ${name} (${phone}) at shop ${shopId}`);
    res.json({
  success: true,
  message: "Added to queue",
  queueId: queueEntry._id,
  points: wallet?.points || 0,
  totalVisits: wallet?.visitCount || 0
});
  } catch (error) {
    console.error("❌ Customer capture error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

const getCustomer = async (req, res) => {
  try {
    const { phone, shopId } = req.params;
    if (!phone || !shopId) return res.status(400).json({ message: "Phone and shopId are required" });
    const shop = await Shop.findOne({ shopId }).lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    const user = await User.findOne({ phone }).lean();
    if (!user) return res.status(404).json({ message: "Customer not found" });
    const wallet = await Wallet.findOne({ userId: user._id, shopId: shop._id }).lean();
    res.json({
  name: user.name || "Customer",
  phone: user.phone,
  points: wallet?.points || 0,
  totalEarned: wallet?.totalEarned || 0,
  visits: wallet?.visitCount || 0,
  totalSpent: wallet?.totalSpent || 0,
  lastVisit: user.lastVisit || null
});
  } catch (error) {
    console.error("❌ Get customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getWallet = async (req, res) => {
  try {
    const { phone, shopId } = req.params;
    if (!phone || !shopId) return res.status(400).json({ message: "Phone and shopId are required" });
    const shop = await Shop.findOne({ shopId }).lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    const user = await User.findOne({ phone }).lean();
    if (!user) return res.json({ points: 0, totalEarned: 0 });
    const wallet = await Wallet.findOne({ userId: user._id, shopId: shop._id }).lean();
    res.json({ points: wallet?.points || 0, totalEarned: wallet?.totalEarned || 0, totalRedeemed: wallet?.totalRedeemed || 0 });
  } catch (error) {
    console.error("❌ Get wallet error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getShopCustomers = async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findOne({ shopId }).lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    const wallets = await Wallet.find({ shopId: shop._id }).lean();
    const userIds = wallets.map(w => w.userId);
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });
    const redeemTxns = await Transaction.find({ shopId: shop._id, type: "redeem" }).select("userId createdAt points").sort({ createdAt: -1 }).lean();
    const redeemMap = {};
    redeemTxns.forEach(t => { const key = t.userId.toString(); if (!redeemMap[key]) redeemMap[key] = []; redeemMap[key].push({ date: t.createdAt, points: t.points }); });
    const customers = wallets.map(w => {
      const user = userMap[w.userId.toString()];
      const redeemHistory = redeemMap[w.userId.toString()] || [];
      return {
  name: user?.name || "Unknown",
  phone: user?.phone || "",
  points: w.points || 0,
  totalEarned: w.totalEarned || 0,
  totalRedeemed: w.totalRedeemed || 0,
  visits: w.visitCount || 0,
  totalSpent: w.totalSpent || 0,
  lastVisit: user?.lastVisit || null,
  redeemCount: redeemHistory.length,
  redeemHistory
};
    });
    customers.sort((a, b) => b.points - a.points);
    res.json(customers);
  } catch (error) {
    console.error("❌ Get shop customers error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const searchCustomers = async (req, res) => {
  try {
    const { shopId } = req.params;
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);
    const shop = await Shop.findOne({ shopId }).lean();
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    const users = await User.find({ $or: [{ name: { $regex: q, $options: "i" } }, { phone: { $regex: q } }] }).lean();
    if (!users.length) return res.json([]);
    const wallets = await Wallet.find({ shopId: shop._id, userId: { $in: users.map(u => u._id) } }).lean();
    const walletMap = {};
    wallets.forEach(w => { walletMap[w.userId.toString()] = w; });
    const results = users
  .filter(u => walletMap[u._id.toString()])
  .map(u => ({
    name: u.name || "Unknown",
    phone: u.phone,
    points: walletMap[u._id.toString()]?.points || 0,
    totalSpent: walletMap[u._id.toString()]?.totalSpent || 0,
    visits: walletMap[u._id.toString()]?.visitCount || 0
  }))
  .slice(0, 5);
    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  captureCustomer,
  getCustomer,
  getWallet,
  getShopCustomers,
  searchCustomers
};
