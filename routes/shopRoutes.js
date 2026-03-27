console.log("🔥🔥🔥 SHOP ROUTES LOADED");
const express = require("express");
const router = express.Router();

const shopController = require("../controllers/shopController");

/* =========================
   DEBUG + VALIDATION
========================= */

console.log("✅ shopRoutes loaded");

if (!shopController || typeof shopController !== "object") {
  throw new Error("❌ shopController not loaded properly");
}

if (typeof shopController.registerShop !== "function") {
  throw new Error("❌ registerShop missing");
}

if (typeof shopController.loginShop !== "function") {
  throw new Error("❌ loginShop missing");
}

/* =========================
   ROUTES
========================= */

// Register
router.post("/register", (req, res, next) => {
  console.log("🔥 REGISTER ROUTE HIT");
  next();
}, shopController.registerShop);

// Login
router.post("/login", (req, res, next) => {
  console.log("🔥 LOGIN ROUTE HIT");
  next();
}, shopController.loginShop);

module.exports = router;