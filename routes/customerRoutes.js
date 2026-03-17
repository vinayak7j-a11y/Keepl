const express = require("express");
const router = express.Router();

/* ===== CONTROLLER IMPORT (SAFE) ===== */
const customerController = require("../controllers/customerController");


/* =========================
   CUSTOMER ROUTES
========================= */

// 📲 Customer scans QR → submit details
router.post("/capture", customerController.captureCustomer);

// 📊 Shop dashboard → fetch customer details
router.get("/customer/:shopId/:phone", customerController.getCustomer);


/* =========================
   EXPORT
========================= */

module.exports = router;