#!/bin/bash

# ============================================================
#  Keepl Admin Dashboard — setup script
#  Run from your project root: bash setup-admin.sh
# ============================================================

echo "🚀 Setting up Keepl admin dashboard..."

# ── 1. middleware/adminAuthMiddleware.js ─────────────────────
cat > middleware/adminAuthMiddleware.js << 'EOF'
const jwt = require("jsonwebtoken");

const adminAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.phone !== process.env.ADMIN_PHONE) {
      return res.status(403).json({ message: "Forbidden — admin only" });
    }

    req.admin = true;
    next();

  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = adminAuthMiddleware;
EOF
echo "✅ middleware/adminAuthMiddleware.js"

# ── 2. controllers/adminController.js ───────────────────────
cat > controllers/adminController.js << 'EOF'
const Shop = require("../models/Shop");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const CustomerQueue = require("../models/CustomerQueue");

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d;
}

const getAdminPage = (req, res) => {
  res.render("admin");
};

const getOverviewStats = async (req, res) => {
  try {
    const todayStart = startOfDay();

    const [
      totalShops,
      activeShops,
      totalCustomers,
      totalTransactions,
      scansToday,
      pointsToday,
      redeemsToday,
      shopsThisWeek,
      customersToday,
    ] = await Promise.all([
      Shop.countDocuments(),
      Shop.countDocuments({ isActive: true }),
      User.countDocuments(),
      Transaction.countDocuments(),
      CustomerQueue.countDocuments({ createdAt: { $gte: todayStart } }),
      Transaction.aggregate([
        { $match: { type: "earn", createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$points" } } }
      ]),
      Transaction.countDocuments({ type: "redeem", createdAt: { $gte: todayStart } }),
      Shop.countDocuments({ createdAt: { $gte: startOfWeek() } }),
      Transaction.distinct("userId", { createdAt: { $gte: todayStart } }),
    ]);

    const repeatUsers = await User.countDocuments({ totalVisits: { $gt: 1 } });
    const repeatRate = totalCustomers > 0
      ? Math.round((repeatUsers / totalCustomers) * 100)
      : 0;

    res.json({
      totalShops,
      activeShops,
      totalCustomers,
      totalTransactions,
      scansToday,
      pointsToday: pointsToday[0]?.total || 0,
      redeemsToday,
      shopsThisWeek,
      customersToday: customersToday.length,
      repeatRate,
    });

  } catch (err) {
    console.error("Admin overview error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getShopStats = async (req, res) => {
  try {
    const todayStart = startOfDay();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const shops = await Shop.find()
      .select("name ownerName phone shopId isActive totalCustomers totalTransactions totalPointsIssued totalRevenue createdAt trialEndsAt rewardName rewardThreshold")
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(shops.map(async (shop) => {
      const [scansToday, pointsToday, activeQueue, lastTransaction] = await Promise.all([
        CustomerQueue.countDocuments({ shopId: shop._id, createdAt: { $gte: todayStart } }),
        Transaction.aggregate([
          { $match: { shopId: shop._id, type: "earn", createdAt: { $gte: todayStart } } },
          { $group: { _id: null, total: { $sum: "$points" } } }
        ]),
        CustomerQueue.countDocuments({ shopId: shop._id, status: { $in: ["waiting", "processing"] } }),
        Transaction.findOne({ shopId: shop._id }).sort({ createdAt: -1 }).select("createdAt").lean(),
      ]);

      const trialDaysLeft = shop.trialEndsAt
        ? Math.ceil((new Date(shop.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...shop,
        scansToday,
        pointsToday: pointsToday[0]?.total || 0,
        activeQueue,
        lastActive: lastTransaction?.createdAt || null,
        trialDaysLeft,
      };
    }));

    res.json(enriched);

  } catch (err) {
    console.error("Admin shop stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getDailyScans = async (req, res) => {
  try {
    const days = 7;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const count = await CustomerQueue.countDocuments({
        createdAt: { $gte: start, $lte: end }
      });

      result.push({
        date: start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
        scans: count,
      });
    }

    res.json(result);

  } catch (err) {
    console.error("Daily scans error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getActivityFeed = async (req, res) => {
  try {
    const [recentTransactions, recentScans, recentShops] = await Promise.all([
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("shopId", "name")
        .lean(),
      CustomerQueue.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("shopId", "name")
        .lean(),
      Shop.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name createdAt")
        .lean(),
    ]);

    const events = [];

    recentTransactions.forEach(t => {
      events.push({
        type: t.type === "earn" ? "points" : "redeem",
        text: t.type === "earn"
          ? `${t.points} pts given to ${t.phone} at ${t.shopId?.name || "unknown shop"}`
          : `Reward redeemed by ${t.phone} at ${t.shopId?.name || "unknown shop"}`,
        time: t.createdAt,
      });
    });

    recentScans.forEach(s => {
      events.push({
        type: "scan",
        text: `${s.name || s.phone} scanned QR at ${s.shopId?.name || "unknown shop"}`,
        time: s.createdAt,
      });
    });

    recentShops.forEach(s => {
      events.push({
        type: "register",
        text: `New shop registered: ${s.name}`,
        time: s.createdAt,
      });
    });

    events.sort((a, b) => new Date(b.time) - new Date(a.time));
    res.json(events.slice(0, 20));

  } catch (err) {
    console.error("Activity feed error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getAttentionItems = async (req, res) => {
  try {
    const todayStart = startOfDay();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const allShops = await Shop.find().select("_id name shopId trialEndsAt").lean();

    const shopsWithScansToday = await CustomerQueue.distinct("shopId", {
      createdAt: { $gte: todayStart }
    });
    const shopsWithScansTodaySet = new Set(shopsWithScansToday.map(id => id.toString()));
    const idleShops = allShops.filter(s => !shopsWithScansTodaySet.has(s._id.toString()));

    const expiredQueues = await CustomerQueue.countDocuments({
      status: "waiting",
      expiresAt: { $lt: new Date() }
    });

    const closeToReward = await Wallet.aggregate([
      {
        $lookup: {
          from: "shops",
          localField: "shopId",
          foreignField: "_id",
          as: "shop"
        }
      },
      { $unwind: "$shop" },
      {
        $match: {
          $expr: {
            $and: [
              { $gte: ["$points", { $multiply: ["$shop.rewardThreshold", 0.8] }] },
              { $lt: ["$points", "$shop.rewardThreshold"] }
            ]
          }
        }
      },
      { $count: "total" }
    ]);

    const recentShopIds = await Transaction.distinct("shopId", {
      createdAt: { $gte: threeDaysAgo }
    });
    const recentSet = new Set(recentShopIds.map(id => id.toString()));
    const inactiveShops = allShops.filter(s => !recentSet.has(s._id.toString()));

    const zeroPointTx = await Transaction.countDocuments({
      type: "earn",
      points: 0,
      createdAt: { $gte: todayStart }
    });

    const expiringTrials = allShops.filter(s => {
      if (!s.trialEndsAt) return false;
      const daysLeft = Math.ceil((new Date(s.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 3;
    });

    res.json({
      idleShopsToday: idleShops.length,
      idleShopNames: idleShops.map(s => s.name).slice(0, 3),
      expiredQueues,
      closeToReward: closeToReward[0]?.total || 0,
      inactiveShops: inactiveShops.length,
      inactiveShopNames: inactiveShops.map(s => s.name).slice(0, 3),
      zeroPointTx,
      expiringTrials: expiringTrials.length,
      expiringTrialNames: expiringTrials.map(s => s.name).slice(0, 3),
    });

  } catch (err) {
    console.error("Attention items error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password required" });
    }

    if (phone !== process.env.ADMIN_PHONE) {
      return res.status(403).json({ message: "Not an admin account" });
    }

    const bcrypt = require("bcrypt");
    const jwt = require("jsonwebtoken");

    const shop = await Shop.findOne({ phone }).select("+password");
    if (!shop) return res.status(404).json({ message: "Account not found" });

    const valid = await bcrypt.compare(password, shop.password);
    if (!valid) return res.status(401).json({ message: "Wrong password" });

    const token = jwt.sign(
      { shopId: shop.shopId, phone: shop.phone },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, phone: shop.phone });

  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAdminPage,
  getOverviewStats,
  getShopStats,
  getDailyScans,
  getActivityFeed,
  getAttentionItems,
  adminLogin,
};
EOF
echo "✅ controllers/adminController.js"

# ── 3. routes/adminRoutes.js ─────────────────────────────────
cat > routes/adminRoutes.js << 'EOF'
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuthMiddleware");
const {
  getAdminPage,
  getOverviewStats,
  getShopStats,
  getDailyScans,
  getActivityFeed,
  getAttentionItems,
  adminLogin,
} = require("../controllers/adminController");

router.post("/login", adminLogin);
router.get("/", getAdminPage);
router.get("/api/overview", adminAuth, getOverviewStats);
router.get("/api/shops", adminAuth, getShopStats);
router.get("/api/daily-scans", adminAuth, getDailyScans);
router.get("/api/feed", adminAuth, getActivityFeed);
router.get("/api/attention", adminAuth, getAttentionItems);

module.exports = router;
EOF
echo "✅ routes/adminRoutes.js"

# ── 4. views/admin.ejs ───────────────────────────────────────
cat > views/admin.ejs << 'EJSEOF'
<!DOCTYPE html>
<html>
<head>
<title>Keepl Admin</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/keepl.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
<style>
body { font-family: Arial, sans-serif; background: var(--k-bg); margin: 0; padding: 0; }
.k-page { max-width: 1000px; margin: 0 auto; padding: 24px 20px 60px; }
.admin-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 24px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { background: var(--k-bg); color: var(--k-ink-secondary); font-weight: 500; font-size: 12px; padding: 10px 12px; border-bottom: 0.5px solid var(--k-border); text-align: left; white-space: nowrap; }
td { padding: 10px 12px; border-bottom: 0.5px solid var(--k-border); color: var(--k-ink); vertical-align: middle; }
tr:last-child td { border-bottom: none; }
.feed-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
.dot-scan { background: #378ADD; }
.dot-points { background: #639922; }
.dot-redeem { background: #D85A30; }
.dot-register { background: #7F77DD; }
.pill-active { font-size: 10px; padding: 2px 7px; border-radius: 20px; background: var(--k-teal-lt); color: var(--k-teal-dk); font-weight: 500; }
.pill-idle { font-size: 10px; padding: 2px 7px; border-radius: 20px; background: var(--k-bg); color: var(--k-ink-tertiary); border: 0.5px solid var(--k-border); }
.pill-warn { font-size: 10px; padding: 2px 7px; border-radius: 20px; background: #FEF3E2; color: #7A3F00; border: 0.5px solid #F5C07A; }
.attention-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 0.5px solid var(--k-border); font-size: 13px; }
.attention-row:last-child { border-bottom: none; }
.attention-label { color: var(--k-ink-secondary); }
.attention-val { font-weight: 500; }
.val-danger { color: #D85A30; }
.val-warn { color: #BA7517; }
.val-ok { color: var(--k-teal); }
.bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.bar-label { font-size: 12px; color: var(--k-ink-secondary); width: 80px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-track { flex: 1; height: 6px; background: var(--k-bg); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; background: var(--k-saffron); transition: width 0.4s ease; }
.bar-val { font-size: 12px; color: var(--k-ink-tertiary); width: 28px; text-align: right; flex-shrink: 0; }
.spark { display: flex; align-items: flex-end; gap: 3px; height: 48px; }
.spark-bar { flex: 1; border-radius: 2px 2px 0 0; background: var(--k-saffron); opacity: 0.75; }
.feed-row { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-bottom: 0.5px solid var(--k-border); }
.feed-row:last-child { border-bottom: none; }
.feed-text { font-size: 12px; color: var(--k-ink-secondary); margin: 0; line-height: 1.45; }
.feed-time { font-size: 11px; color: var(--k-ink-tertiary); margin: 2px 0 0; }
.skeleton { background: var(--k-border); border-radius: 6px; animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
#loginScreen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.login-card { background: var(--k-surface); border: 0.5px solid var(--k-border); border-radius: 20px; padding: 32px 28px; width: 100%; max-width: 360px; }
@media (max-width: 640px) { .two-col { grid-template-columns: 1fr; } .admin-stat-grid { grid-template-columns: 1fr 1fr; } th, td { padding: 8px 8px; } }
</style>
</head>
<body>

<div id="loginScreen">
  <div class="login-card">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
      <div class="k-nav-logo-icon"><i class="ti ti-bolt"></i></div>
      <div>
        <div class="k-nav-logo-text" style="font-size:18px;">keep<span>l</span></div>
        <div style="font-size:12px;color:var(--k-ink-tertiary);margin-top:1px;">Admin dashboard</div>
      </div>
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:13px;color:var(--k-ink-secondary);display:block;margin-bottom:6px;">Phone number</label>
      <input type="tel" id="adminPhone" class="k-input" placeholder="Your phone" style="width:100%;box-sizing:border-box;" />
    </div>
    <div style="margin-bottom:20px;">
      <label style="font-size:13px;color:var(--k-ink-secondary);display:block;margin-bottom:6px;">Password</label>
      <input type="password" id="adminPassword" class="k-input" placeholder="Your password" style="width:100%;box-sizing:border-box;" onkeydown="if(event.key==='Enter') adminLogin()" />
    </div>
    <button class="k-btn k-btn-primary" style="width:100%;justify-content:center;" onclick="adminLogin()">
      <i class="ti ti-login"></i> Sign in
    </button>
    <div id="loginError" style="margin-top:12px;font-size:13px;color:var(--k-danger);display:none;text-align:center;"></div>
  </div>
</div>

<div id="mainDashboard" style="display:none;">
  <nav class="k-nav">
    <div class="k-nav-logo">
      <div class="k-nav-logo-icon"><i class="ti ti-bolt"></i></div>
      <div class="k-nav-logo-text">keep<span>l</span></div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:12px;color:var(--k-ink-tertiary);background:var(--k-bg);border:0.5px solid var(--k-border);border-radius:20px;padding:3px 10px;">
        <i class="ti ti-shield-check" style="font-size:12px;"></i> Admin
      </span>
      <span id="lastRefreshed" style="font-size:11px;color:var(--k-ink-tertiary);"></span>
      <button class="k-btn k-btn-ghost k-btn-sm" onclick="refreshAll()"><i class="ti ti-refresh"></i></button>
      <button class="k-btn k-btn-danger k-btn-sm" onclick="adminLogout()"><i class="ti ti-logout"></i> Logout</button>
    </div>
  </nav>

  <div class="k-page">
    <div style="margin-bottom:24px;">
      <h2 style="font-size:22px;font-weight:500;color:var(--k-ink);margin:0 0 4px;">Overview</h2>
      <p style="font-size:14px;color:var(--k-ink-tertiary);margin:0;">All shops · live data</p>
    </div>

    <div class="admin-stat-grid" id="statGrid">
      <div class="k-stat-card k-stat-saffron"><div class="skeleton" style="height:14px;width:80px;margin-bottom:8px;"></div><div class="skeleton" style="height:30px;width:50px;"></div></div>
      <div class="k-stat-card k-stat-teal"><div class="skeleton" style="height:14px;width:80px;margin-bottom:8px;"></div><div class="skeleton" style="height:30px;width:50px;"></div></div>
      <div class="k-stat-card k-stat-dark"><div class="skeleton" style="height:14px;width:80px;margin-bottom:8px;"></div><div class="skeleton" style="height:30px;width:50px;"></div></div>
      <div class="k-stat-card k-stat-saffron"><div class="skeleton" style="height:14px;width:80px;margin-bottom:8px;"></div><div class="skeleton" style="height:30px;width:50px;"></div></div>
      <div class="k-stat-card k-stat-teal"><div class="skeleton" style="height:14px;width:80px;margin-bottom:8px;"></div><div class="skeleton" style="height:30px;width:50px;"></div></div>
      <div class="k-stat-card k-stat-dark"><div class="skeleton" style="height:14px;width:80px;margin-bottom:8px;"></div><div class="skeleton" style="height:30px;width:50px;"></div></div>
    </div>

    <div class="two-col">
      <div class="k-card" style="overflow:auto;">
        <div class="k-card-title"><i class="ti ti-building-store" style="color:var(--k-saffron);"></i> Shop activity</div>
        <div id="shopTable"><div class="skeleton" style="height:40px;margin-bottom:8px;border-radius:8px;"></div><div class="skeleton" style="height:40px;margin-bottom:8px;border-radius:8px;"></div><div class="skeleton" style="height:40px;border-radius:8px;"></div></div>
      </div>
      <div class="k-card">
        <div class="k-card-title"><i class="ti ti-activity" style="color:var(--k-saffron);"></i> Live activity</div>
        <div id="activityFeed"><div class="skeleton" style="height:36px;margin-bottom:8px;border-radius:8px;"></div><div class="skeleton" style="height:36px;margin-bottom:8px;border-radius:8px;"></div><div class="skeleton" style="height:36px;border-radius:8px;"></div></div>
      </div>
    </div>

    <div class="two-col">
      <div class="k-card">
        <div class="k-card-title"><i class="ti ti-chart-bar" style="color:var(--k-saffron);"></i> QR scans — last 7 days</div>
        <div id="scanChart"><div class="skeleton" style="height:48px;border-radius:8px;"></div></div>
      </div>
      <div class="k-card">
        <div class="k-card-title"><i class="ti ti-alert-triangle" style="color:var(--k-saffron);"></i> Needs attention</div>
        <div id="attentionPanel"><div class="skeleton" style="height:32px;margin-bottom:8px;border-radius:8px;"></div><div class="skeleton" style="height:32px;margin-bottom:8px;border-radius:8px;"></div><div class="skeleton" style="height:32px;border-radius:8px;"></div></div>
      </div>
    </div>

    <div class="k-card" style="margin-top:16px;overflow-x:auto;">
      <div class="k-card-title" style="margin-bottom:16px;"><i class="ti ti-table" style="color:var(--k-saffron);"></i> All shops</div>
      <table id="allShopsTable">
        <thead>
          <tr>
            <th>Shop</th><th>Owner</th><th>Scans today</th><th>Pts today</th>
            <th>Queue</th><th>Total customers</th><th>Revenue</th><th>Trial</th><th>Last active</th>
          </tr>
        </thead>
        <tbody id="allShopsBody">
          <tr><td colspan="9" style="text-align:center;padding:20px;color:var(--k-ink-tertiary);">Loading...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<script>
const BASE_URL = "https://keepl.onrender.com";
let adminToken = localStorage.getItem("adminToken");

(function init() {
  if (adminToken) { showDashboard(); refreshAll(); }
})();

async function adminLogin() {
  const phone    = document.getElementById("adminPhone").value.trim();
  const password = document.getElementById("adminPassword").value.trim();
  const errEl    = document.getElementById("loginError");
  errEl.style.display = "none";
  if (!phone || !password) { errEl.innerText = "Enter phone and password"; errEl.style.display = "block"; return; }
  try {
    const res  = await fetch(`${BASE_URL}/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }) });
    const data = await res.json();
    if (res.ok && data.token) { localStorage.setItem("adminToken", data.token); adminToken = data.token; showDashboard(); refreshAll(); }
    else { errEl.innerText = data.message || "Login failed"; errEl.style.display = "block"; }
  } catch (err) { errEl.innerText = "Server error — try again"; errEl.style.display = "block"; }
}

function adminLogout() {
  if (confirm("Logout?")) { localStorage.removeItem("adminToken"); adminToken = null; document.getElementById("mainDashboard").style.display = "none"; document.getElementById("loginScreen").style.display = "flex"; }
}

function showDashboard() { document.getElementById("loginScreen").style.display = "none"; document.getElementById("mainDashboard").style.display = "block"; }

async function adminFetch(path) {
  const res = await fetch(`${BASE_URL}/admin${path}`, { headers: { "Authorization": `Bearer ${adminToken}` } });
  if (res.status === 401 || res.status === 403) { localStorage.removeItem("adminToken"); adminToken = null; document.getElementById("mainDashboard").style.display = "none"; document.getElementById("loginScreen").style.display = "flex"; throw new Error("Auth failed"); }
  return res.json();
}

async function refreshAll() {
  await Promise.all([loadOverview(), loadShopStats(), loadDailyScans(), loadActivityFeed(), loadAttention()]);
  const now = new Date();
  document.getElementById("lastRefreshed").innerText = "Updated " + now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

async function loadOverview() {
  try {
    const d = await adminFetch("/api/overview");
    document.getElementById("statGrid").innerHTML = `
      <div class="k-stat-card k-stat-saffron"><i class="ti ti-building-store k-stat-icon"></i><div class="k-stat-label">Total shops</div><div class="k-stat-num">${d.totalShops}</div></div>
      <div class="k-stat-card k-stat-teal"><i class="ti ti-users k-stat-icon"></i><div class="k-stat-label">Total customers</div><div class="k-stat-num">${d.totalCustomers}</div></div>
      <div class="k-stat-card k-stat-dark"><i class="ti ti-qrcode k-stat-icon"></i><div class="k-stat-label">QR scans today</div><div class="k-stat-num">${d.scansToday}</div></div>
      <div class="k-stat-card k-stat-saffron"><i class="ti ti-bolt k-stat-icon"></i><div class="k-stat-label">Points today</div><div class="k-stat-num">${d.pointsToday.toLocaleString("en-IN")}</div></div>
      <div class="k-stat-card k-stat-teal"><i class="ti ti-gift k-stat-icon"></i><div class="k-stat-label">Redeems today</div><div class="k-stat-num">${d.redeemsToday}</div></div>
      <div class="k-stat-card k-stat-dark"><i class="ti ti-repeat k-stat-icon"></i><div class="k-stat-label">Repeat rate</div><div class="k-stat-num">${d.repeatRate}%</div></div>`;
  } catch (err) { console.error("Overview error:", err); }
}

async function loadShopStats() {
  try {
    const shops = await adminFetch("/api/shops");
    if (!shops.length) { document.getElementById("shopTable").innerHTML = `<p style="font-size:13px;color:var(--k-ink-tertiary);text-align:center;padding:20px;">No shops yet</p>`; return; }
    const top = [...shops].sort((a, b) => b.scansToday - a.scansToday).slice(0, 6);
    const maxScans = Math.max(...top.map(s => s.scansToday), 1);
    document.getElementById("shopTable").innerHTML = top.map(s => {
      const initials = s.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      const pct = Math.round((s.scansToday / maxScans) * 100);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--k-border);">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--k-saffron-lt);color:var(--k-saffron-dk);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:500;color:var(--k-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.name}</div>
          <div class="bar-track" style="margin-top:4px;"><div class="bar-fill" style="width:${pct}%"></div></div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:13px;font-weight:500;color:var(--k-ink);">${s.scansToday}</div>
          <span class="${s.scansToday > 0 ? 'pill-active' : 'pill-idle'}">${s.scansToday > 0 ? 'active' : 'idle'}</span>
        </div>
      </div>`;
    }).join("");
    loadAllShopsTable(shops);
  } catch (err) { console.error("Shop stats error:", err); }
}

function loadAllShopsTable(shops) {
  const tbody = document.getElementById("allShopsBody");
  if (!shops.length) { tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--k-ink-tertiary);">No shops yet</td></tr>`; return; }
  tbody.innerHTML = shops.map(s => {
    const trialDays = s.trialDaysLeft;
    let trialBadge = "";
    if (trialDays === null) trialBadge = `<span class="pill-idle">—</span>`;
    else if (trialDays <= 0) trialBadge = `<span style="font-size:10px;padding:2px 7px;border-radius:20px;background:#FCEBEB;color:#791F1F;border:0.5px solid #F09595;">Expired</span>`;
    else if (trialDays <= 3) trialBadge = `<span class="pill-warn">${trialDays}d left</span>`;
    else trialBadge = `<span class="pill-active">${trialDays}d left</span>`;
    return `<tr>
      <td><div style="font-weight:500;">${s.name}</div><div style="font-size:11px;color:var(--k-ink-tertiary);">${s.phone}</div></td>
      <td style="color:var(--k-ink-secondary);">${s.ownerName}</td>
      <td style="font-weight:500;color:${s.scansToday > 0 ? 'var(--k-saffron)' : 'var(--k-ink-tertiary)'};">${s.scansToday}</td>
      <td>${s.pointsToday.toLocaleString("en-IN")}</td>
      <td>${s.activeQueue > 0 ? `<span style="color:var(--k-teal);font-weight:500;">${s.activeQueue} waiting</span>` : `<span style="color:var(--k-ink-tertiary);">—</span>`}</td>
      <td>${s.totalCustomers}</td>
      <td>₹${(s.totalRevenue || 0).toLocaleString("en-IN")}</td>
      <td>${trialBadge}</td>
      <td style="font-size:11px;color:var(--k-ink-tertiary);">${s.lastActive ? timeAgo(new Date(s.lastActive)) : "never"}</td>
    </tr>`;
  }).join("");
}

async function loadDailyScans() {
  try {
    const data = await adminFetch("/api/daily-scans");
    const max = Math.max(...data.map(d => d.scans), 1);
    document.getElementById("scanChart").innerHTML = `
      <div class="spark">${data.map(d => `<div class="spark-bar" style="height:${Math.max(Math.round((d.scans / max) * 100), 4)}%;" title="${d.date}: ${d.scans} scans"></div>`).join("")}</div>
      <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:0.5px solid var(--k-border);">
        ${data.map(d => `<div style="text-align:center;flex:1;"><div style="font-size:13px;font-weight:500;color:var(--k-ink);">${d.scans}</div><div style="font-size:10px;color:var(--k-ink-tertiary);">${d.date.split(",")[0]}</div></div>`).join("")}
      </div>`;
  } catch (err) { console.error("Daily scans error:", err); }
}

async function loadActivityFeed() {
  try {
    const events = await adminFetch("/api/feed");
    if (!events.length) { document.getElementById("activityFeed").innerHTML = `<p style="font-size:13px;color:var(--k-ink-tertiary);text-align:center;padding:16px;">No activity yet</p>`; return; }
    const dotMap = { scan: "dot-scan", points: "dot-points", redeem: "dot-redeem", register: "dot-register" };
    document.getElementById("activityFeed").innerHTML = events.slice(0, 12).map(e => `
      <div class="feed-row">
        <div class="feed-dot ${dotMap[e.type] || 'dot-scan'}"></div>
        <div><p class="feed-text">${e.text}</p><p class="feed-time">${timeAgo(new Date(e.time))}</p></div>
      </div>`).join("");
  } catch (err) { console.error("Feed error:", err); }
}

async function loadAttention() {
  try {
    const d = await adminFetch("/api/attention");
    const items = [
      { label: "Shops with 0 scans today", val: d.idleShopsToday, sub: d.idleShopNames.join(", "), danger: d.idleShopsToday > 0 },
      { label: "Expired queues (no action)", val: d.expiredQueues, sub: "", danger: d.expiredQueues > 2 },
      { label: "Customers close to reward", val: d.closeToReward, sub: "≥80% of threshold", danger: false },
      { label: "Shops inactive 3+ days", val: d.inactiveShops, sub: d.inactiveShopNames.join(", "), warn: d.inactiveShops > 0 },
      { label: "Zero-point transactions", val: d.zeroPointTx, sub: "possible ₹0 entries", danger: d.zeroPointTx > 0 },
      { label: "Trials expiring soon", val: d.expiringTrials, sub: d.expiringTrialNames.join(", "), warn: d.expiringTrials > 0 },
    ];
    document.getElementById("attentionPanel").innerHTML = items.map(item => `
      <div class="attention-row">
        <div><div class="attention-label">${item.label}</div>${item.sub ? `<div style="font-size:11px;color:var(--k-ink-tertiary);margin-top:1px;">${item.sub}</div>` : ""}</div>
        <div class="attention-val ${item.danger ? 'val-danger' : item.warn ? 'val-warn' : 'val-ok'}">${item.val}</div>
      </div>`).join("");
  } catch (err) { console.error("Attention error:", err); }
}

function timeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " hr ago";
  return Math.floor(s / 86400) + " days ago";
}

setInterval(() => { if (adminToken && !document.hidden) refreshAll(); }, 60000);
</script>
</body>
</html>
EJSEOF
echo "✅ views/admin.ejs"

# ── 5. Patch server.js ───────────────────────────────────────
if grep -q "adminRoutes" server.js; then
  echo "⚠️  server.js already has adminRoutes — skipping patch"
else
  # Add import after the last require() route import line
  sed -i '' 's|const analyticsRoutes = require("./routes/analyticsRoutes");|const analyticsRoutes = require("./routes/analyticsRoutes");\nconst adminRoutes = require("./routes/adminRoutes");|' server.js

  # Add mount before the scan routes line
  sed -i '' 's|app.use("/scan", scanRoutes);|app.use("/admin", adminRoutes);\napp.use("/scan", scanRoutes);|' server.js

  echo "✅ server.js patched (2 lines added)"
fi

# ── 6. Remind about .env ─────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All files created!"
echo ""
echo "⚠️  One manual step:"
echo "   Add this to your .env and Render environment variables:"
echo ""
echo "   ADMIN_PHONE=your_phone_number_here"
echo ""
echo "   Then deploy and visit: https://keepl.onrender.com/admin"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
