const express = require("express");
const router = express.Router();

const shopController = require("../controllers/shopController");

/* =========================
   SHOP ROUTES (SAFE)
========================= */

// Register (only if exists)
router.post("/register", shopController.registerShop || ((req,res)=>res.send("Not implemented")));

// Login (you already have)
router.post("/login", shopController.loginShop);

module.exports = router;