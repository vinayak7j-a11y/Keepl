const express = require("express");
const router = express.Router();

const { redeemPoints } = require("../controllers/redeemController");

router.post("/redeem", redeemPoints);

module.exports = router;