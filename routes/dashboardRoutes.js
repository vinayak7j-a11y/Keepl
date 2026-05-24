const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

/* SAFETY CHECK */
if (
  !dashboardController ||
  typeof dashboardController.getDashboard !== "function" ||
  typeof dashboardController.getCustomersPage !== "function" ||
  typeof dashboardController.getLiveStats !== "function"
) {
  console.error("❌ DashboardController error:", dashboardController);
  throw new Error("DashboardController not loaded properly");
}

// ✅ Specific routes MUST come before the wildcard /:shopId

// API route — needs auth header ✅
router.get("/stats/:shopId", authMiddleware, dashboardController.getLiveStats);

// Page render routes — auth handled client-side via localStorage ✅
router.get("/customers/:shopId", dashboardController.getCustomersPage);
router.get("/:shopId",           dashboardController.getDashboard);

module.exports = router;