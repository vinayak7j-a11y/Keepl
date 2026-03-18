const express = require("express");
const router = express.Router();

/* =========================
   CONTROLLER IMPORT
========================= */

const transactionController = require("../controllers/transactionController");

/* =========================
   SAFETY CHECK
========================= */

if (
  !transactionController ||
  typeof transactionController.addTransaction !== "function" ||
  typeof transactionController.getTransactions !== "function" ||
  typeof transactionController.getCustomerTransactions !== "function"
) {
  console.error("❌ TransactionController error:", transactionController);
  throw new Error("TransactionController functions are undefined");
}

/* =========================
   ROUTES
========================= */

// Add transaction (earn points)
router.post("/transaction", transactionController.addTransaction);

// Get shop transactions
router.get("/transactions/:shopId", transactionController.getTransactions);

// Get customer transactions
router.get("/transactions/customer/:phone", transactionController.getCustomerTransactions);

/* =========================
   EXPORT
========================= */

module.exports = router;