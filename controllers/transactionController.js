const Transaction = require("../models/Transaction");

console.log("✅ transactionController loaded");

/* =========================
   ADD TRANSACTION
========================= */

const addTransaction = async (req, res) => {
  try {

    console.log("🔥 Transaction request received");

    res.json({
      success: true,
      message: "Transaction route working"
    });

  } catch (error) {

    console.error("Transaction error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }
};

/* =========================
   EXPORT
========================= */

module.exports = {
  addTransaction
};