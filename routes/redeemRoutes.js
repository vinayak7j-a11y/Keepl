const express = require("express");
const router = express.Router();

const redeemController = require("../controllers/redeemController");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================
   REDEEM ROUTES (FIXED)
========================= */

// 💰 Redeem points
router.post("/", authMiddleware, redeemController.redeemPoints);

// 👤 Customer redemption history
router.get("/customer/:phone", authMiddleware, redeemController.getCustomerRedemptions);

// 🏪 Shop redemption history
router.get("/shop/:shopId", authMiddleware, redeemController.getRedemptions);

module.exports = router;