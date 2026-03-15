const express = require("express");
const router = express.Router();

const transactionController = require("../controllers/transactionController");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================
   ADD TRANSACTION
   (Shop gives points)
========================= */

router.post(
  "/transactions",
  authMiddleware,
  transactionController.addTransaction
);


/* =========================
   SHOP TRANSACTION HISTORY
========================= */

router.get(
  "/transactions/:shopId",
  authMiddleware,
  transactionController.getTransactions
);


/* =========================
   CUSTOMER TRANSACTIONS
========================= */

router.get(
  "/transactions/customer/:phone",
  authMiddleware,
  transactionController.getCustomerTransactions
);


module.exports = router;