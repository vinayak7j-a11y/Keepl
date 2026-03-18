const express = require("express");
const router = express.Router();

/* =========================
   CONTROLLER IMPORT
========================= */

const customerController = require("../controllers/customerController");

/* =========================
   SAFETY CHECK (DEBUG)
========================= */

// 🔥 This prevents server crash + helps debugging
if (
  !customerController ||
  typeof customerController.captureCustomer !== "function" ||
  typeof customerController.getCustomer !== "function"
) {
  console.error("❌ CustomerController not loaded correctly:", customerController);
  throw new Error("CustomerController functions are undefined");
}

/* =========================
   ROUTES
========================= */

/**
 * @route   POST /customer/capture
 * @desc    Capture customer from QR scan
 */
router.post("/customer/capture", customerController.captureCustomer);

/**
 * @route   GET /customer/:phone/:shopId
 * @desc    Get customer details for a shop
 */
router.get("/customer/:phone/:shopId", customerController.getCustomer);

/* =========================
   EXPORT
========================= */

module.exports = router;