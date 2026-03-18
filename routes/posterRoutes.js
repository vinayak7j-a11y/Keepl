const express = require("express");
const router = express.Router();

const posterController = require("../controllers/posterController");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================
   POSTER ROUTES
========================= */

// 📄 Download QR Poster
router.get("/:shopId", authMiddleware, posterController.downloadPoster);

module.exports = router;