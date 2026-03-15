const express = require("express");
const router = express.Router();
const Shop = require("../models/Shop");

/* =========================
   CUSTOMER SCAN PAGE
========================= */

router.get("/s/:shopId", async (req, res) => {

  try {

    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).send("Invalid shop");
    }

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    // prevent HTML injection
    const shopName = String(shop.name)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    res.send(`
<!DOCTYPE html>
<html>

<head>

<title>${shopName} Rewards</title>

<meta name="viewport" content="width=device-width, initial-scale=1">

<style>

body{
font-family:Arial;
background:#f5f5f5;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
margin:0;
}

.card{
background:white;
padding:30px;
border-radius:10px;
width:90%;
max-width:360px;
text-align:center;
box-shadow:0 4px 10px rgba(0,0,0,0.1);
}

h2{
margin-top:0;
}

input{
width:100%;
padding:12px;
margin-top:12px;
border-radius:6px;
border:1px solid #ccc;
font-size:14px;
box-sizing:border-box;
}

button{
margin-top:15px;
padding:12px;
width:100%;
background:#2f80ed;
color:white;
border:none;
border-radius:6px;
font-size:15px;
cursor:pointer;
}

button:hover{
background:#1c60b3;
}

.footer{
margin-top:15px;
font-size:12px;
color:#888;
}

</style>

</head>

<body>

<div class="card">

<h2>${shopName} Rewards</h2>

<p>Enter your details to collect points</p>

<form method="POST" action="/capture" onsubmit="handleSubmit()">

<input
name="name"
placeholder="Your Name"
required
maxlength="80"
/>

<input
type="tel"
name="phone"
placeholder="Phone Number"
pattern="[0-9]{10}"
inputmode="numeric"
required
/>

<input
type="hidden"
name="shopId"
value="${shopId}"
/>

<button type="submit" id="submitBtn">
Join Rewards
</button>

</form>

<div class="footer">
Powered by Keepl
</div>

</div>

<script>

function handleSubmit(){

const btn = document.getElementById("submitBtn")

btn.disabled = true
btn.innerText = "Submitting..."

}

</script>

</body>

</html>
`);

  } catch (error) {

    console.error("Scan page error:", error);

    res.status(500).send("Something went wrong");

  }

});

module.exports = router;