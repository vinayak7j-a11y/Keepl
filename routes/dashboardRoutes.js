const express = require("express");
const router = express.Router();

const { getDashboard, getStats } = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");

/* Dashboard page (NO auth middleware) */
router.get("/dashboard/:shopId", getDashboard);

/* Stats API (protected) */
router.get("/api/dashboard/:shopId", authMiddleware, getStats);

module.exports = router;