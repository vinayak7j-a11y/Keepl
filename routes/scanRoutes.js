const express = require("express");
const router = express.Router();

const Shop = require("../models/Shop");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const CustomerQueue = require("../models/CustomerQueue");

/* =========================
   CAPTURE CUSTOMER
========================= */

router.post("/capture", async (req, res) => {
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

    const user = await User.findOneAndUpdate(
      { phone },
      { $set: { name, phone } },
      { new: true, upsert: true }
    );

    await Wallet.findOneAndUpdate(
      { userId: user._id, shopId: shop._id },
      { $setOnInsert: { points: 0, totalEarned: 0 } },
      { upsert: true }
    );

    const wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    }).lean();

    await CustomerQueue.findOneAndUpdate(
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

    const points = wallet?.points || 0;
    const shopName = String(shop.name)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const customerName = String(name)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // ✅ FIX: Beautiful success page instead of raw JSON
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Welcome to ${shopName}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }

  .card {
    background: white;
    border-radius: 20px;
    padding: 40px 30px;
    width: 100%;
    max-width: 380px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }

  .checkmark {
    width: 80px;
    height: 80px;
    background: #2ecc71;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 40px;
    color: white;
  }

  h2 {
    font-size: 24px;
    color: #2d3436;
    margin-bottom: 8px;
  }

  .subtitle {
    color: #636e72;
    font-size: 15px;
    margin-bottom: 30px;
  }

  .points-box {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 15px;
    padding: 20px;
    color: white;
    margin-bottom: 25px;
  }

  .points-box .label {
    font-size: 13px;
    opacity: 0.85;
    margin-bottom: 5px;
  }

  .points-box .points {
    font-size: 48px;
    font-weight: bold;
    line-height: 1;
  }

  .points-box .unit {
    font-size: 14px;
    opacity: 0.85;
    margin-top: 4px;
  }

  .info {
    background: #f8f9fa;
    border-radius: 10px;
    padding: 15px;
    font-size: 14px;
    color: #555;
    margin-bottom: 20px;
    line-height: 1.8;
  }

  .footer {
    font-size: 12px;
    color: #b2bec3;
    margin-top: 10px;
  }
</style>
</head>
<body>
<div class="card">

  <div class="checkmark">✓</div>

  <h2>Welcome, ${customerName}!</h2>
  <p class="subtitle">You're checked in at <strong>${shopName}</strong></p>

  <div class="points-box">
    <div class="label">Your Current Points</div>
    <div class="points">${points}</div>
    <div class="unit">pts</div>
  </div>

  <div class="info">
    🎯 Earn <strong>10 points</strong> for every <strong>₹100</strong> spent<br>
    🎁 Redeem <strong>100 points</strong> for a free reward!
  </div>

  <p class="footer">Powered by Keepl</p>

</div>
</body>
</html>
    `);

  } catch (error) {
    console.error("Capture error:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});

/* =========================
   CUSTOMER SCAN PAGE
========================= */

router.get("/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).send("Invalid shop");
    }

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    const shopName = String(shop.name)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>${shopName} Rewards</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }

  .card {
    background: white;
    border-radius: 20px;
    padding: 40px 30px;
    width: 100%;
    max-width: 380px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }

  .shop-icon {
    width: 70px;
    height: 70px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 32px;
  }

  h2 {
    font-size: 22px;
    color: #2d3436;
    margin-bottom: 6px;
  }

  .subtitle {
    color: #636e72;
    font-size: 14px;
    margin-bottom: 28px;
  }

  input {
    width: 100%;
    padding: 14px 16px;
    margin-bottom: 14px;
    border-radius: 10px;
    border: 1.5px solid #e0e0e0;
    font-size: 16px;
    outline: none;
    transition: border 0.2s;
  }

  input:focus {
    border-color: #667eea;
  }

  button {
    width: 100%;
    padding: 15px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 4px;
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .info {
    margin-top: 20px;
    font-size: 13px;
    color: #888;
    line-height: 1.8;
  }

  .footer {
    margin-top: 20px;
    font-size: 12px;
    color: #b2bec3;
  }
</style>
</head>
<body>

<div class="card">

  <div class="shop-icon">🏪</div>

  <h2>${shopName}</h2>
  <p class="subtitle">Enter your details to earn reward points</p>

  <form method="POST" action="/scan/capture" onsubmit="handleSubmit(event)">

    <input
      name="name"
      placeholder="Your Name"
      required
      maxlength="80"
      autocomplete="name"
    />

    <input
      type="tel"
      name="phone"
      placeholder="Phone Number (10 digits)"
      pattern="[0-9]{10}"
      inputmode="numeric"
      required
      autocomplete="tel"
    />

    <input type="hidden" name="shopId" value="${shopId}" />

    <button type="submit" id="submitBtn">
      Join & Earn Points 🎯
    </button>

  </form>

  <div class="info">
    🎯 10 points per ₹100 spent<br>
    🎁 100 points = free reward!
  </div>

  <div class="footer">Powered by Keepl</div>

</div>

<script>
function handleSubmit(e){
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.innerText = "Submitting...";
}
</script>

</body>
</html>
    `);

  } catch (error) {
    console.error("Scan page error:", error);
    res.status(500).send("Something went wrong");
  }
});

module.exports = router;