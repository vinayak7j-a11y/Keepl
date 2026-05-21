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
router.get("/stats/:shopId",     authMiddleware, dashboardController.getLiveStats);
router.get("/customers/:shopId", authMiddleware, dashboardController.getCustomersPage);
router.get("/:shopId",           authMiddleware, dashboardController.getDashboard);

module.exports = router;