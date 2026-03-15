const express = require("express");
const router = express.Router();

const shopController = require("../controllers/shopController");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================
   AUTH ROUTES
========================= */

// Register a new shop
router.post("/register", shopController.registerShop);

// Shop login
router.post("/login", shopController.loginShop);


/* =========================
   PROTECTED SHOP ROUTES
========================= */

// Get shop profile (requires login)
router.get("/profile", authMiddleware, shopController.getShopProfile);


/* =========================
   FUTURE SCALABLE ROUTES
========================= */

// Update shop info (optional future feature)
router.put("/update", authMiddleware, shopController.updateShop || ((req,res)=>{
    res.status(501).json({message:"Update shop not implemented yet"});
}));

// Regenerate QR code (future feature)
router.post("/regenerate-qr", authMiddleware, shopController.regenerateQR || ((req,res)=>{
    res.status(501).json({message:"QR regeneration not implemented yet"});
}));


module.exports = router;