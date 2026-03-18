const express = require("express");
const router = express.Router();

const queueController = require("../controllers/queueController");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================
   QUEUE ROUTES (FIXED)
========================= */

// 📋 Get queue
router.get("/:shopId", authMiddleware, queueController.getQueue);

// ✅ Mark queue item as completed (IMPORTANT)
router.patch("/:id/complete", authMiddleware, queueController.completeQueue);

// 🧹 Clear completed queue
router.delete("/clear/:shopId", authMiddleware, queueController.clearQueue);

module.exports = router;