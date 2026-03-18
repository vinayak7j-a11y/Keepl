const express = require("express");
const router = express.Router();

const shopController = require("../controllers/shopController");

/* =========================
   VALIDATION CHECK
========================= */

if (!shopController.registerShop || typeof shopController.registerShop !== "function") {
  console.error("❌ registerShop is missing in shopController");
  throw new Error("registerShop not implemented properly");
}

/* =========================
   ROUTES
========================= */

router.post("/register", shopController.registerShop);
router.post("/login", shopController.loginShop);

module.exports = router;