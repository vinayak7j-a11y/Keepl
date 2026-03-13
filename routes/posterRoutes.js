const express = require("express");
const router = express.Router();

const { downloadPoster } = require("../controllers/posterController");

router.get("/poster/:shopId", downloadPoster);

module.exports = router;