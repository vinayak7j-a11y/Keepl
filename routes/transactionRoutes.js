const express = require("express");
const router = express.Router();

console.log("✅ transactionRoutes loaded");

router.post("/", (req, res) => {
  res.json({
    success: true,
    message: "Transactions route works"
  });
});

module.exports = router;