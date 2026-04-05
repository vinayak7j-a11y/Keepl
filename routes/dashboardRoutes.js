const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");

/* SAFETY CHECK */
if (!dashboardController || typeof dashboardController.getDashboard !== "function") {
  console.error("❌ DashboardController error:", dashboardController);
  throw new Error("DashboardController not loaded properly");
}

/* ROUTE - ✅ fixed: removed /dashboard prefix (already set in server.js) */
router.get("/:shopId", dashboardController.getDashboard);

module.exports = router;