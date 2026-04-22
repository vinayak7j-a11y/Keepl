const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Shop = require("../models/Shop");
const CustomerQueue = require("../models/CustomerQueue");

/* =========================
   CAPTURE CUSTOMER
========================= */

const captureCustomer = async (req, res) => {
  try {
    let { name, phone, shopId } = req.body;

    name = name?.trim();
    phone = phone?.trim();

    /* ===== VALIDATION ===== */

    if (!name || !phone || !shopId) {
      return res.status(400).json({
        message: "Name, phone and shopId are required"
      });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Phone number must be exactly 10 digits"
      });
    }

    /* ===== FIND SHOP ===== */

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    /* ===== USER UPSERT + VISIT TRACKING ===== */

    const user = await User.findOneAndUpdate(
      { phone },
      {
        $set: { name, phone },
        $inc: { totalVisits: 1 },         // ✅ track total visits
        $currentDate: { lastVisit: true }  // ✅ track last visit time
      },
      { new: true, upsert: true }
    );

    /* ===== WALLET UPSERT ===== */

    await Wallet.findOneAndUpdate(
      { userId: user._id, shopId: shop._id },
      { $setOnInsert: { points: 0, totalEarned: 0 } },
      { upsert: true }
    );

    const wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    }).lean();

    /* ===== QUEUE UPSERT ===== */

    const queueEntry = await CustomerQueue.findOneAndUpdate(
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
          expiresAt: new Date(Date.now() + 1000 * 60 * 10) // 10 min expiry
        }
      },
      { new: true, upsert: true }
    );

    console.log(`✅ Customer queued: ${name} (${phone}) at shop ${shopId}`);

    /* ===== RESPONSE ===== */

    res.json({
      success: true,
      message: "Added to queue",
      queueId: queueEntry._id,
      points: wallet?.points || 0,
      totalVisits: user.totalVisits || 1
    });

  } catch (error) {
    console.error("❌ Customer capture error:", error);
    res.status(500).json({
      message: "Something went wrong. Please try again."
    });
  }
};


/* =========================
   GET CUSTOMER
========================= */

const getCustomer = async (req, res) => {
  try {
    const { phone, shopId } = req.params;

    if (!phone || !shopId) {
      return res.status(400).json({
        message: "Phone and shopId are required"
      });
    }

    /* ===== FIND SHOP ===== */

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    /* ===== FIND USER ===== */

    const user = await User.findOne({ phone }).lean();

    if (!user) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    /* ===== FIND WALLET ===== */

    const wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    }).lean();

    res.json({
      name: user.name || "Customer",
      phone: user.phone,
      points: wallet?.points || 0,
      totalEarned: wallet?.totalEarned || 0,
      visits: user.totalVisits || 0,
      totalSpent: user.totalSpent || 0,
      lastVisit: user.lastVisit || null
    });

  } catch (error) {
    console.error("❌ Get customer error:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};


/* =========================
   GET ALL CUSTOMERS FOR SHOP
========================= */

const getShopCustomers = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    /* ===== GET ALL WALLETS FOR THIS SHOP ===== */

    const wallets = await Wallet.find({
      shopId: shop._id
    }).lean();

    const userIds = wallets.map(w => w.userId);

    const users = await User.find({
      _id: { $in: userIds }
    }).lean();

    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    const customers = wallets.map(w => {
      const user = userMap[w.userId.toString()];
      return {
        name: user?.name || "Unknown",
        phone: user?.phone || "",
        points: w.points || 0,
        totalEarned: w.totalEarned || 0,
        visits: user?.totalVisits || 0,
        totalSpent: user?.totalSpent || 0,
        lastVisit: user?.lastVisit || null
      };
    });

    // ✅ Sort by points descending (top customers first)
    customers.sort((a, b) => b.points - a.points);

    res.json(customers);

  } catch (error) {
    console.error("❌ Get shop customers error:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};


/* =========================
   EXPORT — single style only
========================= */

module.exports = {
  captureCustomer,
  getCustomer,
  getShopCustomers
};