const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuthMiddleware");
const {
  getAdminPage,
  getOverviewStats,
  getShopStats,
  getDailyScans,
  getActivityFeed,
  getAttentionItems,
  adminLogin, 
  toggleShopBlock, 
} = require("../controllers/adminController");

router.post("/login", adminLogin);
router.get("/", getAdminPage);
router.get("/api/overview", adminAuth, getOverviewStats);
router.get("/api/shops", adminAuth, getShopStats);
router.get("/api/daily-scans", adminAuth, getDailyScans);
router.get("/api/feed", adminAuth, getActivityFeed);
router.get("/api/attention", adminAuth, getAttentionItems);
router.patch("/api/shops/:shopId/toggle-block", adminAuth, toggleShopBlock);
router.patch("/api/shops/:shopId/toggle-block", adminAuth, require("../controllers/adminController").toggleShopBlock);

module.exports = router;
