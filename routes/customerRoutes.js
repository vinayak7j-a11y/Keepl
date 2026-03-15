const express = require("express");
const router = express.Router();

const {
  captureCustomer,
  getCustomer
} = require("../controllers/customerController");

/* Customer scan submit */
router.post("/capture", captureCustomer);

/* Dashboard fetch customer */
router.get("/customer/:shopId/:phone", getCustomer);

module.exports = router;