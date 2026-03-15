const express = require("express");
const router = express.Router();

const redeemController = require("../controllers/redeemController");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================
   REDEEM ROUTES
========================= */

// Redeem points
router.post(
  "/redeem",
  authMiddleware,
  redeemController.redeemPoints
);

// Customer redemption history
router.get(
  "/redeem/customer/:phone",
  authMiddleware,
  redeemController.getCustomerRedemptions
);

// Redemption history for shop
router.get(
  "/redeem/:shopId",
  authMiddleware,
  redeemController.getRedemptions
);

module.exports = router;