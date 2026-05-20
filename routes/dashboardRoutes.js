const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");

/* SAFETY CHECK */
if (!dashboardController || typeof dashboardController.getDashboard !== "function") {
  console.error("❌ DashboardController error:", dashboardController);
  throw new Error("DashboardController not loaded properly");
}

// ✅ Specific route MUST come before the wildcard /:shopId
router.get("/stats/:shopId", dashboardController.getLiveStats);
router.get("/:shopId", dashboardController.getDashboard);

module.exports = router;