const express = require("express");
const router = express.Router();

const {
  captureCustomer
} = require("../controllers/customerController");

router.post("/capture", captureCustomer);

module.exports = router;