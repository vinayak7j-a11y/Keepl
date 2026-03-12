const express = require("express");
const router = express.Router();

const { getStats } = require("../controllers/dashboardController");

router.get("/dashboard/:shopId", getStats);

module.exports = router;