const express = require("express");
const router = express.Router();

console.log("✅ transactionRoutes.js LOADED");

router.get("/", (req, res) => {
  res.json({
    working: true,
    route: "transactions"
  });
});

router.post("/", (req, res) => {
  res.json({
    success: true,
    message: "POST transaction works"
  });
});

module.exports = router;