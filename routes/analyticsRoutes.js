const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const analyticsController = require("../controllers/analyticsController");

router.get("/:shopId", authMiddleware, analyticsController.getAnalytics);

module.exports = router;