const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Shop = require("../models/Shop");
const CustomerQueue = require("../models/CustomerQueue");

exports.captureCustomer = async (req, res) => {

  try {

    const { name, phone, shopId } = req.body;

    // Basic validation
    if (!name || !phone) {
      return res.send("Invalid details");
    }

    let user = await User.findOne({ phone });

    if (!user) {
      user = new User({
        name,
        phone
      });
      await user.save();
    }

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.send("Shop not found");
    }

    // Create wallet if needed
    let wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    });

    if (!wallet) {
      wallet = new Wallet({
        userId: user._id,
        shopId: shop._id,
        points: 0
      });

      await wallet.save();
    }

    // Prevent duplicate queue entries
    const existingQueue = await CustomerQueue.findOne({
      phone,
      shopId: shop._id,
      status: "waiting"
    });

    if (!existingQueue) {
      await CustomerQueue.create({
        name,
        phone,
        shopId: shop._id
      });
    }

    // Success page
    res.send(`
    <!DOCTYPE html>
    <html>

    <head>

      <title>${shop.name} Rewards</title>

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
      color:#2f80ed;
      font-size:40px;
      margin-bottom:10px;
      }

      p{
      color:#555;
      }

      </style>

    </head>

    <body>

      <div class="card">

        <h1>✓</h1>

        <h2>Rewards at ${shop.name}</h2>

        <p>Thanks <strong>${name}</strong>!</p>

        <p>You are now registered for rewards at <strong>${shop.name}</strong>.</p>

        <p>Please show this screen to the shopkeeper to earn points.</p>

        <p style="font-size:12px;color:#888;margin-top:15px;">
        Your phone number is used only for reward points at ${shop.name}.
        </p>

      </div>

    </body>

    </html>
    `);

  } catch (error) {

    res.send("Error capturing customer");

  }

};