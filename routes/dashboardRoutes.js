const express = require("express");
const router = express.Router();

const { getDashboard } = require("../controllers/dashboardController");

router.get("/dashboard/:shopId", getDashboard);

module.exports = router;