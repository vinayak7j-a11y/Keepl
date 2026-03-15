const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Shop = require("../models/Shop");
const CustomerQueue = require("../models/CustomerQueue");

/* =========================
   GET CUSTOMER DETAILS
========================= */

exports.getCustomer = async (req, res) => {

  try {

    const { phone, shopId } = req.params;

    if (!phone || !shopId) {
      return res.status(400).json({
        message: "Phone and shopId required"
      });
    }

    const shop = await Shop.findOne({ shopId });

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

    console.error("Get customer error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};


/* =========================
   CAPTURE CUSTOMER
========================= */

exports.captureCustomer = async (req, res) => {

  try {

    let { name, phone, shopId } = req.body;

    name = name?.trim();
    phone = phone?.trim();

    if (!name || !phone || !shopId) {
      return res.status(400).send("Invalid details");
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).send("Invalid phone number");
    }

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    /* Find or create user */

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ name, phone });
    }

    /* Find or create wallet */

    let wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    });

    if (!wallet) {
      wallet = await Wallet.create({
        userId: user._id,
        shopId: shop._id,
        points: 0
      });
    }

    /* Prevent duplicate queue */

    const existingQueue = await CustomerQueue.findOne({
      phone,
      shopId: shop._id,
      status: "waiting"
    });

    if (!existingQueue) {

      await CustomerQueue.create({
        name,
        phone,
        shopId: shop._id,
        status: "waiting"
      });

    }

    /* Sanitize output */

    const safeName = name.replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const safeShop = shop.name.replace(/</g,"&lt;").replace(/>/g,"&gt;");

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
        padding:30px;
        border-radius:10px;
        box-shadow:0 5px 15px rgba(0,0,0,0.1);
        width:90%;
        max-width:350px;
        text-align:center;
      }
      h1{
        color:#2ecc71;
        font-size:40px;
      }
      </style>
    </head>
    <body>

      <div class="card">

        <h1>✓</h1>
        <h2>${safeShop} Rewards</h2>

        <p>Thanks <strong>${safeName}</strong>!</p>

        <p>You are now registered for rewards.</p>

        <p>Please show this screen to the shopkeeper.</p>

      </div>

    </body>
    </html>
    `);

  } catch (error) {

    console.error("Customer capture error:", error);

    res.status(500).send("Something went wrong");

  }

};