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
        $inc: { totalVisits: 1 },
        $currentDate: { lastVisit: true }
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
          expiresAt: new Date(Date.now() + 1000 * 60 * 10)
        }
      },
      { new: true, upsert: true }
    );

    console.log(`✅ Customer queued: ${name} (${phone}) at shop ${shopId}`);

    /* ===== SAFE OUTPUT ===== */

    const safeName = name.replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const safeShop = shop.name.replace(/</g,"&lt;").replace(/>/g,"&gt;");

    /* ===== RESPONSE (PREMIUM UI) ===== */

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeShop} Rewards</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
      body{
        font-family:Arial;
        background:#f5f6fa;
        display:flex;
        justify-content:center;
        align-items:center;
        height:100vh;
        margin:0;
      }
      .card{
        background:white;
        padding:35px;
        border-radius:12px;
        box-shadow:0 8px 25px rgba(0,0,0,0.1);
        width:90%;
        max-width:380px;
        text-align:center;
      }
      h1{
        color:#2ecc71;
        font-size:50px;
        margin-bottom:10px;
      }
      h2{
        font-size:22px;
        margin-bottom:10px;
      }
      p{
        font-size:18px;
        margin:8px 0;
        color:#444;
      }
      </style>
    </head>
    <body>

      <div class="card">

        <h1>✓</h1>
        <h2>${safeShop}</h2>

        <p>Thanks <strong>${safeName}</strong> 👋</p>

        <p style="color:#2ecc71;font-weight:bold;">
          You are successfully added to queue
        </p>

        <p>Your visits: ${user.totalVisits}</p>
        <p>Your points: ${wallet?.points || 0}</p>

        <p>Please show this screen to the shopkeeper</p>

      </div>

    </body>
    </html>
    `);

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

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    const user = await User.findOne({ phone }).lean();

    if (!user) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

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
   GET SHOP CUSTOMERS
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
   EXPORT
========================= */

module.exports = {
  captureCustomer,
  getCustomer,
  getShopCustomers
};