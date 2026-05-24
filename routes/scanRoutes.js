const express = require("express");
const router = express.Router();
const Shop = require("../models/Shop");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const CustomerQueue = require("../models/CustomerQueue");

/* =========================
   ⚠️ ROUTE ORDER MATTERS
   /thankyou MUST be FIRST
   before /:shopId
========================= */

/* =========================
   THANK YOU PAGE
   GET /scan/thankyou
========================= */

router.get("/thankyou", async (req, res) => {
  try {
    const { name, phone, shopId } = req.query;

    console.log("🎯 THANKYOU ROUTE HIT:", { name, phone, shopId });

    if (!name || !phone || !shopId) {
      console.log("❌ Missing params — redirecting to /");
      return res.redirect("/");
    }

    // ✅ Fetch rewardThreshold alongside shop name
    const shop = await Shop.findOne({ shopId }).select("name rewardThreshold").lean();

    console.log("🏪 Shop lookup result:", shop);

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    const rewardThreshold = shop.rewardThreshold || 100;

    const safeShopName = String(shop.name)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const safeName = String(name)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    res.send(`<!DOCTYPE html>
<html>
<head>
<title>Welcome to ${safeShopName}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --k-saffron:    #FF6B00;
    --k-saffron-lt: #FFF0E6;
    --k-saffron-dk: #C24E00;
    --k-teal:       #00796B;
    --k-teal-lt:    #E0F2F0;
    --k-teal-dk:    #004D40;
    --k-ink:        #1A1A2E;
    --k-ink-secondary: #4A4A6A;
    --k-ink-tertiary:  #9090A8;
    --k-bg:         #F7F6F2;
    --k-border:     #E8E6DF;
    --k-surface:    #FFFFFF;
  }

  body {
    font-family: Arial, sans-serif;
    background: var(--k-bg);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }

  .card {
    background: var(--k-surface);
    border: 0.5px solid var(--k-border);
    border-radius: 24px;
    padding: 36px 28px;
    width: 100%;
    max-width: 380px;
    text-align: center;
    box-shadow: 0 8px 40px rgba(26,26,46,0.10);
  }

  /* ── Logo ── */
  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 24px;
  }
  .logo-icon {
    width: 32px;
    height: 32px;
    background: var(--k-saffron);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
  }
  .logo-text {
    font-size: 20px;
    font-weight: 500;
    color: var(--k-ink);
    letter-spacing: -0.5px;
  }
  .logo-text span { color: var(--k-saffron); }

  /* ── Check icon ── */
  .checkmark {
    width: 72px;
    height: 72px;
    background: var(--k-teal-lt);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 32px;
    color: var(--k-teal);
  }

  h2 {
    font-size: 22px;
    font-weight: 500;
    color: var(--k-ink);
    margin-bottom: 6px;
  }

  .subtitle {
    color: var(--k-ink-tertiary);
    font-size: 14px;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  /* ── Points box ── */
  .points-box {
    background: var(--k-saffron);
    border-radius: 18px;
    padding: 22px 20px;
    color: white;
    margin-bottom: 16px;
    transition: transform 0.3s;
  }

  .points-box.updated { transform: scale(1.04); }

  .label {
    font-size: 12px;
    opacity: 0.85;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .points {
    font-size: 56px;
    font-weight: 500;
    line-height: 1;
  }

  .unit {
    font-size: 14px;
    opacity: 0.8;
    margin-top: 4px;
  }

  /* ── Status dot ── */
  .status {
    font-size: 13px;
    color: var(--k-ink-tertiary);
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--k-teal);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,100% { opacity:1; transform:scale(1); }
    50% { opacity:0.4; transform:scale(0.75); }
  }

  /* ── Progress bar ── */
  .progress-section {
    margin-bottom: 18px;
    text-align: left;
  }

  .progress-label {
    font-size: 13px;
    color: var(--k-ink-secondary);
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .progress-track {
    background: #EDECE8;
    border-radius: 50px;
    height: 10px;
    width: 100%;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 50px;
    background: linear-gradient(90deg, var(--k-saffron), #FF9500);
    transition: width 0.5s ease;
    width: 0%;
  }

  .progress-fill.complete {
    background: linear-gradient(90deg, var(--k-teal), #10B981);
  }

  /* ── Info box ── */
  .info {
    background: var(--k-bg);
    border: 0.5px solid var(--k-border);
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 13px;
    color: var(--k-ink-secondary);
    margin-bottom: 16px;
    line-height: 2;
    text-align: left;
  }

  /* ── Redeem banner ── */
  .redeem-banner {
    background: var(--k-teal-lt);
    border: 0.5px solid #6EE7B7;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 14px;
    color: var(--k-teal-dk);
    font-weight: 500;
    margin-bottom: 16px;
    display: none;
    text-align: left;
  }

  .footer {
    font-size: 12px;
    color: var(--k-ink-tertiary);
    margin-top: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .footer-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--k-ink-tertiary); }
</style>
</head>
<body>
<div class="card">

  <!-- Logo -->
  <div class="logo">
    <div class="logo-icon"><i class="ti ti-bolt"></i></div>
    <div class="logo-text">keep<span>l</span></div>
  </div>

  <!-- Check -->
  <div class="checkmark">
    <i class="ti ti-check"></i>
  </div>

  <h2>Welcome, ${safeName}!</h2>
  <p class="subtitle">You're checked in at <strong>${safeShopName}</strong></p>

  <!-- Points box -->
  <div class="points-box" id="pointsBox">
    <div class="label">Your Current Points</div>
    <div class="points" id="pointsDisplay">...</div>
    <div class="unit">pts</div>
  </div>

  <!-- Status -->
  <div class="status">
    <div class="dot"></div>
    <span id="statusText">Waiting for shopkeeper...</span>
  </div>

  <!-- Progress bar -->
  <div class="progress-section">
    <div class="progress-label" id="progressLabel">Loading your points...</div>
    <div class="progress-track">
      <div class="progress-fill" id="progressFill"></div>
    </div>
  </div>

  <!-- Redeem banner -->
  <div class="redeem-banner" id="redeemBanner">
    🎁 You have enough points to redeem a free reward! Tell the shopkeeper.
  </div>

  <!-- Info box -->
  <div class="info">
    <div>⚡ Earn <strong>10 points</strong> for every <strong>₹100</strong> spent</div>
    <div>🎁 Redeem <strong>${rewardThreshold} points</strong> for a free reward!</div>
  </div>

  <div class="footer">
    <span>Powered by</span>
    <div class="footer-dot"></div>
    <strong style="color:var(--k-saffron);">keepl</strong>
  </div>

</div>

<script>
  const phone = ${JSON.stringify(phone)};
  const shopId = ${JSON.stringify(shopId)};
  const REWARD_THRESHOLD = ${rewardThreshold}; // ✅ per-shop value from DB
  let lastPoints = null;
  let pointsReceived = false;

  async function fetchPoints() {
    try {
      const res = await fetch(
        "/api/customers/wallet/" +
        encodeURIComponent(phone) + "/" +
        encodeURIComponent(shopId)
      );
      if (!res.ok) return;
      const data = await res.json();
      const points = data.points || 0;

      // ── Update points display ──
      document.getElementById("pointsDisplay").innerText = points;

      // ── Update progress bar ──
      const fill = document.getElementById("progressFill");
      const label = document.getElementById("progressLabel");
      const pct = Math.min((points / REWARD_THRESHOLD) * 100, 100);
      fill.style.width = pct + "%";

      if (points >= REWARD_THRESHOLD) {
        fill.classList.add("complete");
        label.innerHTML = "🎁 <strong>You've reached " + REWARD_THRESHOLD + " points!</strong> Ask for your free reward.";
        document.getElementById("redeemBanner").style.display = "block";
      } else {
        const needed = REWARD_THRESHOLD - points;
        label.innerHTML = "<strong>" + needed + " more points</strong> needed for your free reward 🎯";
      }

      // ── Animate on points update ──
      if (lastPoints !== null && points > lastPoints) {
        const box = document.getElementById("pointsBox");
        box.classList.add("updated");
        setTimeout(() => box.classList.remove("updated"), 400);
        document.getElementById("statusText").innerText =
          "+" + (points - lastPoints) + " points added! 🎉";
        pointsReceived = true;
      } else if (!pointsReceived) {
        document.getElementById("statusText").innerText =
          "Waiting for shopkeeper...";
      }

      lastPoints = points;
    } catch (err) {
      console.log("Poll error:", err);
    }
  }

  fetchPoints();
  setInterval(fetchPoints, 3000);
</script>
</body>
</html>`);

  } catch (error) {
    console.error("❌ Thankyou page error:", error);
    res.status(500).send("Something went wrong");
  }
});


/* =========================
   CUSTOMER SCAN PAGE
   GET /scan/:shopId
   ⚠️ Must be AFTER /thankyou
========================= */

router.get("/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;

    console.log("🔍 Scan page requested for shopId:", shopId);

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    const shopName = String(shop.name)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const rewardThreshold = shop.rewardThreshold || 100;

    res.send(`<!DOCTYPE html>
<html>
<head>
<title>${shopName} Rewards</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --k-saffron:    #FF6B00;
    --k-saffron-lt: #FFF0E6;
    --k-saffron-dk: #C24E00;
    --k-teal:       #00796B;
    --k-teal-lt:    #E0F2F0;
    --k-ink:        #1A1A2E;
    --k-ink-secondary: #4A4A6A;
    --k-ink-tertiary:  #9090A8;
    --k-bg:         #F7F6F2;
    --k-border:     #E8E6DF;
    --k-surface:    #FFFFFF;
  }

  body {
    font-family: Arial, sans-serif;
    background: var(--k-bg);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }

  .card {
    background: var(--k-surface);
    border: 0.5px solid var(--k-border);
    border-radius: 24px;
    padding: 36px 28px;
    width: 100%;
    max-width: 380px;
    text-align: center;
    box-shadow: 0 8px 40px rgba(26,26,46,0.10);
  }

  /* ── Logo ── */
  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 28px;
  }
  .logo-icon {
    width: 32px;
    height: 32px;
    background: var(--k-saffron);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
  }
  .logo-text {
    font-size: 20px;
    font-weight: 500;
    color: var(--k-ink);
    letter-spacing: -0.5px;
  }
  .logo-text span { color: var(--k-saffron); }

  /* ── Shop icon ── */
  .shop-icon {
    width: 68px;
    height: 68px;
    background: var(--k-saffron-lt);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 18px;
    font-size: 30px;
    color: var(--k-saffron);
    border: 0.5px solid rgba(255,107,0,0.2);
  }

  h2 {
    font-size: 20px;
    font-weight: 500;
    color: var(--k-ink);
    margin-bottom: 6px;
  }

  .subtitle {
    color: var(--k-ink-tertiary);
    font-size: 14px;
    margin-bottom: 26px;
    line-height: 1.5;
  }

  /* ── Inputs ── */
  .form-group {
    margin-bottom: 14px;
    text-align: left;
  }

  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--k-ink-secondary);
    margin-bottom: 6px;
  }

  input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    border: 1.5px solid var(--k-border);
    font-size: 15px;
    outline: none;
    font-family: inherit;
    color: var(--k-ink);
    background: var(--k-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  input:focus {
    border-color: var(--k-saffron);
    box-shadow: 0 0 0 3px rgba(255,107,0,0.10);
  }

  input::placeholder {
    color: var(--k-ink-tertiary);
  }

  /* ── Submit button ── */
  button[type="submit"] {
    width: 100%;
    padding: 14px;
    background: var(--k-saffron);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 8px;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.15s;
  }

  button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  button[type="submit"]:hover:not(:disabled) {
    opacity: 0.9;
  }

  /* ── Info box ── */
  .info {
    margin-top: 20px;
    background: var(--k-bg);
    border: 0.5px solid var(--k-border);
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 13px;
    color: var(--k-ink-secondary);
    line-height: 2;
    text-align: left;
  }

  .footer {
    margin-top: 18px;
    font-size: 12px;
    color: var(--k-ink-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .footer-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--k-ink-tertiary); }
</style>
</head>
<body>
<div class="card">

  <!-- Logo -->
  <div class="logo">
    <div class="logo-icon"><i class="ti ti-bolt"></i></div>
    <div class="logo-text">keep<span>l</span></div>
  </div>

  <!-- Shop icon -->
  <div class="shop-icon">
    <i class="ti ti-store"></i>
  </div>

  <h2>${shopName}</h2>
  <p class="subtitle">Enter your details to earn reward points</p>

  <form method="POST" action="/scan/capture" onsubmit="handleSubmit(event)">

    <div class="form-group">
      <label class="form-label">Your name</label>
      <input name="name" placeholder="e.g. Priya Sharma" required maxlength="80" autocomplete="name"/>
    </div>

    <div class="form-group">
      <label class="form-label">Phone number</label>
      <input type="tel" name="phone" placeholder="10-digit number"
        pattern="[0-9]{10}" inputmode="numeric" required autocomplete="tel"/>
    </div>

    <input type="hidden" name="shopId" value="${shopId}"/>

    <button type="submit" id="submitBtn">
      <i class="ti ti-bolt"></i> Join &amp; Earn Points
    </button>

  </form>

  <div class="info">
    <div>⚡ Earn <strong>10 points</strong> per ₹100 spent</div>
    <div>🎁 <strong>${rewardThreshold} points</strong> = free reward!</div>
  </div>

  <div class="footer">
    <span>Powered by</span>
    <div class="footer-dot"></div>
    <strong style="color:var(--k-saffron);">keepl</strong>
  </div>

</div>
<script>
// ✅ Auto-fill for returning customers
(function(){
  const savedName  = localStorage.getItem("keepl_name");
  const savedPhone = localStorage.getItem("keepl_phone");
  if(savedName)  document.querySelector('input[name="name"]').value  = savedName;
  if(savedPhone) document.querySelector('input[name="phone"]').value = savedPhone;

  // Show returning customer message
  if(savedName && savedPhone){
    const subtitle = document.querySelector('.subtitle');
    if(subtitle){
      subtitle.innerHTML = 'Welcome back, <strong>' + savedName + '</strong>! Tap below to check in.';
    }
  }
})();

function handleSubmit(e){
  // Save details for next visit
  const name  = document.querySelector('input[name="name"]').value.trim();
  const phone = document.querySelector('input[name="phone"]').value.trim();
  if(name)  localStorage.setItem("keepl_name",  name);
  if(phone) localStorage.setItem("keepl_phone", phone);

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i> Submitting...';
}
</script>
</body>
</html>`);

  } catch (error) {
    console.error("Scan page error:", error);
    res.status(500).send("Something went wrong");
  }
});


/* =========================
   CAPTURE CUSTOMER
   POST /scan/capture
========================= */

router.post("/capture", async (req, res) => {
  try {
    let { name, phone, shopId } = req.body;

    name = name?.trim();
    phone = phone?.trim();

    console.log("📥 Capture request:", { name, phone, shopId });

    if (!name || !phone || !shopId) {
      return res.status(400).send("All fields are required");
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).send("Phone number must be 10 digits");
    }

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    await User.findOneAndUpdate(
      { phone },
      { $set: { name, phone } },
      { upsert: true, new: true }
    );

    const user = await User.findOne({ phone });

    await Wallet.findOneAndUpdate(
      { userId: user._id, shopId: shop._id },
      { $setOnInsert: { points: 0, totalEarned: 0, totalRedeemed: 0 } },
      { upsert: true }
    );

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

    console.log(`✅ Customer queued: ${name} (${phone}) at ${shopId}`);

    res.redirect(
      `/scan/thankyou?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&shopId=${encodeURIComponent(shopId)}`
    );

  } catch (error) {
    console.error("❌ Capture error:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
});

module.exports = router;