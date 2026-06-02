const CustomerQueue = require("../models/CustomerQueue");
const Shop = require("../models/Shop");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

/* =========================
   GET QUEUE
========================= */

exports.getQueue = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const now = new Date();

    // ✅ Only show waiting entries that haven't expired
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

    /* ===== BUILD ENRICHED QUEUE ===== */

    const enrichedQueue = queue.map(q => {
      const user = userMap[q.phone];
      const wallet = user ? walletMap[user._id.toString()] : null;

      return {
        queueId: q._id,
        name: q.name,
        phone: q.phone,
        visits: wallet?.visitCount || 0,
        totalSpent: wallet?.totalSpent || 0,
        points: wallet?.points || 0,
        createdAt: q.createdAt
      };
    });

    res.json(enrichedQueue);

  } catch (error) {
    console.error("❌ Queue fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================
   ADD CUSTOMER TO QUEUE
========================= */

exports.addToQueue = async (req, res) => {
  try {
    const { shopId, name, phone } = req.body;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // ✅ Atomic upsert — no duplicates
    const queueItem = await CustomerQueue.findOneAndUpdate(
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

    res.json({
      message: "Customer added to queue",
      queueItem
    });

  } catch (error) {
    console.error("❌ Queue add error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================
   COMPLETE QUEUE ITEM
========================= */

exports.completeQueue = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await CustomerQueue.findByIdAndUpdate(
      id,
      { $set: { status: "completed" } }, // ✅ consistent status
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Queue item not found" });
    }

    res.json({
      message: "Queue item completed",
      updated
    });

  } catch (error) {
    console.error("❌ Queue complete error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================
   CLEAR COMPLETED QUEUE
========================= */

exports.clearQueue = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // ✅ Delete both completed and expired entries
    const result = await CustomerQueue.deleteMany({
      shopId: shop._id,
      $or: [
        { status: "completed" },
        { expiresAt: { $lt: new Date() } }
      ]
    });

    console.log(`🧹 Cleared ${result.deletedCount} queue entries for ${shopId}`);

    res.json({
      message: "Queue cleared",
      cleared: result.deletedCount
    });

  } catch (error) {
    console.error("❌ Queue clear error:", error);
    res.status(500).json({ message: "Server error" });
  }
};