const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

if (
  !dashboardController ||
  typeof dashboardController.getDashboard !== "function" ||
  typeof dashboardController.getCustomersPage !== "function" ||
  typeof dashboardController.getLiveStats !== "function"
) {
  console.error("❌ DashboardController error:", dashboardController);
  throw new Error("DashboardController not loaded properly");
}

router.get("/stats/:shopId", authMiddleware, dashboardController.getLiveStats);
router.get("/customers/:shopId", dashboardController.getCustomersPage);
router.get("/:shopId", dashboardController.getDashboard);

module.exports = router;
