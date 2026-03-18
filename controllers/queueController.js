const CustomerQueue = require("../models/CustomerQueue");
const Shop = require("../models/Shop");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

/* =========================
   GET QUEUE (OPTIMIZED)
========================= */

exports.getQueue = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

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

    /* ===== BULK USERS ===== */
    const users = await User.find({
      phone: { $in: phones }
    }).lean();

    const userMap = {};
    users.forEach(u => {
      userMap[u.phone] = u;
    });

    /* ===== BULK WALLETS ===== */
    const userIds = users.map(u => u._id);

    const wallets = await Wallet.find({
      userId: { $in: userIds },
      shopId: shop._id
    }).lean();

    const walletMap = {};
    wallets.forEach(w => {
      walletMap[w.userId.toString()] = w;
    });

    const enrichedQueue = queue.map(q => {
      const user = userMap[q.phone];
      const wallet = user
        ? walletMap[user._id.toString()]
        : null;

      return {
        queueId: q._id, // 🔥 IMPORTANT
        name: q.name,
        phone: q.phone,
        visits: user?.totalVisits || 0,
        totalSpent: user?.totalSpent || 0,
        points: wallet?.points || 0,
        createdAt: q.createdAt
      };
    });

    res.json(enrichedQueue);

  } catch (error) {
    console.error("Queue fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================
   ADD CUSTOMER TO QUEUE (FIXED)
========================= */

exports.addToQueue = async (req, res) => {
  try {
    const { shopId, name, phone } = req.body;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    /* ✅ ATOMIC UPSERT (NO DUPLICATES EVER) */

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
      {
        new: true,
        upsert: true
      }
    );

    res.json({
      message: "Customer added/updated in queue",
      queueItem
    });

  } catch (error) {
    console.error("Queue add error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================
   COMPLETE QUEUE ITEM (IMPORTANT FIX)
========================= */

exports.completeQueue = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await CustomerQueue.findByIdAndUpdate(
      id,
      { status: "completed" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Queue item not found" });
    }

    res.json({
      message: "Queue completed",
      updated
    });

  } catch (error) {
    console.error("Queue complete error:", error);
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

    await CustomerQueue.deleteMany({
      shopId: shop._id,
      status: "completed"
    });

    res.json({
      message: "Completed queue cleared"
    });

  } catch (error) {
    console.error("Queue clear error:", error);
    res.status(500).json({ message: "Server error" });
  }
};