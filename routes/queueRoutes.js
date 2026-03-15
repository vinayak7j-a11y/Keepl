const express = require("express");
const router = express.Router();

const queueController = require("../controllers/queueController");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================
   QUEUE ROUTES
========================= */

// Get queue for shop
router.get(
  "/queue/:shopId",
  authMiddleware,
  queueController.getQueue
);

// Remove single customer from queue
router.delete(
  "/queue/:id",
  authMiddleware,
  queueController.removeFromQueue
);

// Clear completed queue
router.delete(
  "/queue/clear/:shopId",
  authMiddleware,
  queueController.clearQueue
);

module.exports = router;