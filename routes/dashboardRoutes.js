const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================
   DASHBOARD ROUTES (SECURE)
========================= */

router.get(
  "/dashboard/:shopId",
  authMiddleware,
  dashboardController.getDashboard
);

router.get(
  "/api/dashboard/:shopId",
  authMiddleware,
  dashboardController.getStats
);

router.get(
  "/dashboard/:shopId/customers",
  authMiddleware,
  dashboardController.getCustomerAnalytics
);

router.get(
  "/dashboard/:shopId/revenue",
  authMiddleware,
  dashboardController.getRevenueAnalytics
);

module.exports = router;