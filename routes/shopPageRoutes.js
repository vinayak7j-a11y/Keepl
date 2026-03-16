const express = require("express");
const router = express.Router();

/* =========================
   SHOP REGISTRATION PAGE
========================= */

router.get("/register", (req, res) => {
  res.render("register");
});

module.exports = router;