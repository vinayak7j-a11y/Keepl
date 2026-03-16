const express = require("express");
const router = express.Router();

const transactionController = require("../controllers/transactionController");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================
   ADD TRANSACTION (ADD POINTS)
========================= */

router.post(
  "/add-transaction",
  authMiddleware,
  transactionController.addTransaction
);

/* =========================
   SHOP TRANSACTION HISTORY
========================= */

router.get(
  "/shop-transactions/:shopId",
  authMiddleware,
  transactionController.getTransactions
);

/* =========================
   CUSTOMER TRANSACTION HISTORY
========================= */

router.get(
  "/customer-transactions/:phone",
  transactionController.getCustomerTransactions
);

module.exports = router;