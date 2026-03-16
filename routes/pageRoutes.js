const express = require("express");
const router = express.Router();

/* =========================
   REGISTER PAGE
========================= */

router.get("/register", (req,res)=>{
  res.render("register");
});

module.exports = router;