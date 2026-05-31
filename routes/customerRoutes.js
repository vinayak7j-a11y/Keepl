const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

/* =========================
   CONTROLLER IMPORT
========================= */

const customerController = require("../controllers/customerController");

/* =========================
   SAFETY CHECK
========================= */

if (
  !customerController ||
  typeof customerController.captureCustomer !== "function" ||
  typeof customerController.getCustomer !== "function" ||
  typeof customerController.getWallet !== "function" ||
  typeof customerController.getShopCustomers !== "function"
) {
  console.error("❌ CustomerController not loaded correctly:", customerController);
  throw new Error("CustomerController functions are undefined");
}

/* =========================
   ROUTES
========================= */

/**
 * @route   POST /api/customers/customer/capture
 * @desc    Capture customer from QR scan
 */
router.post("/customer/capture", customerController.captureCustomer);

/**
 * @route   GET /api/customers/customer/:phone/:shopId
 * @desc    Get customer details for a shop (shopkeeper, needs auth)
 */
router.get("/customer/:phone/:shopId", authMiddleware, customerController.getCustomer);

/**
 * @route   GET /api/customers/wallet/:phone/:shopId
 * @desc    Get wallet points — polled by thank you page (no auth, customer facing)
 */
router.get("/wallet/:phone/:shopId", customerController.getWallet);

/**
 * @route   GET /api/customers/shop/:shopId
 * @desc    Get all customers for a shop (shopkeeper, needs auth)
 */
router.get("/shop/:shopId", authMiddleware, customerController.getShopCustomers);
router.get("/search/:shopId", authMiddleware, customerController.searchCustomers);
/* =========================
   EXPORT
========================= */

module.exports = router;