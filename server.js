console.log("🚀 SERVER VERSION: V2 FIXED ROUTING");
require("dotenv").config();

const Sentry = require("@sentry/node");
Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0 }); 

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

/* =========================
   ROUTE IMPORTS
========================= */

const authMiddleware = require("./middleware/authMiddleware");
const shopRoutes = require("./routes/shopRoutes");
console.log("🔥 server imported shopRoutes");
const scanRoutes = require("./routes/scanRoutes");
const customerRoutes = require("./routes/customerRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const redeemRoutes = require("./routes/redeemRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const dashboardController = require("./controllers/dashboardController");
const queueRoutes = require("./routes/queueRoutes");
const posterRoutes = require("./routes/posterRoutes");
const shopPageRoutes = require("./routes/shopPageRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

/* =========================
   APP SETTINGS
========================= */

app.set("trust proxy", 1);

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC FILES
========================= */

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   VIEW ENGINE
========================= */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* =========================
   HOME PAGE
========================= */

// ✅ index.html is the login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ /login also serves index.html
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ /register renders register.ejs via EJS view engine
app.get("/register", (req, res) => {
  res.render("register");
});

/* =========================
   API ROUTES (MUST BE FIRST)
========================= */

app.use("/api/shops", shopRoutes);
console.log("🔥 /api/shops mounted");
app.use("/api/customers", customerRoutes);
app.use("/api/transactions", transactionRoutes);
app.get("/debug-routes", (req, res) => {
  res.json({
    transactionsLoaded: !!transactionRoutes,
    time: new Date()
  });
});
app.use("/api/redeem", redeemRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/analytics", analyticsRoutes);

/* =========================
   PAGE ROUTES (UI)
========================= */

app.use("/shop", shopPageRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/poster", posterRoutes);
app.get("/analytics/:shopId", (req, res) => {
  res.render("analytics", { shopId: req.params.shopId });
});

app.get("/customers/:shopId", dashboardController.getCustomersPage);

/* =========================
   SCAN ROUTES (MUST BE LAST)
========================= */

app.use("/scan", scanRoutes);

/* =========================
   HEALTH CHECK
========================= */

app.get("/health", (req, res) => {
  res.json({
    status: "running",
    service: "Keepl API",
    time: new Date()
  });
});

/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {
  res.status(404).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 — Keepl</title>
  <link rel="stylesheet" href="/keepl.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
  <style>
    body { font-family: Arial, sans-serif; background: var(--k-bg); display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
  </style>
</head>
<body>
  <div style="text-align:center; padding:40px;">
    <div style="width:72px;height:72px;background:var(--k-saffron-lt);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:32px;color:var(--k-saffron);">
      <i class="ti ti-map-pin-off"></i>
    </div>
    <h1 style="font-size:48px;font-weight:500;color:var(--k-ink);margin:0 0 8px;">404</h1>
    <p style="font-size:16px;color:var(--k-ink-tertiary);margin:0 0 32px;">This page doesn't exist</p>
    <a href="/" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:var(--k-saffron);color:white;border-radius:14px;text-decoration:none;font-size:14px;font-weight:500;">
      <i class="ti ti-home"></i> Go to login
    </a>
  </div>
</body>
</html>`);
});
Sentry.setupExpressErrorHandler(app);
app.use((err, req, res, next) => {
  console.error("Server error:", err); 
}
/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    message: err.message || "Internal server error"
  });
});

/* =========================
   DATABASE CONNECTION
========================= */

const PORT = process.env.PORT || 5050;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true
    });

    console.log("MongoDB Connected ✅");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

startServer();  