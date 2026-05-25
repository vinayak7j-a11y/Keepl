const express = require("express");
const router = express.Router();

const transactionController = require("../controllers/transactionController");

router.post("/", transactionController.addTransaction);
router.post("/undo", transactionController.undoTransaction);

module.exports = router;