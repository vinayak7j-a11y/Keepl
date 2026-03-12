const express = require("express");
const router = express.Router();
const Shop = require("../models/Shop");

router.get("/s/:shopId", async (req, res) => {

  try {

    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.send("Shop not found");
    }

    res.send(`
      <h2>Welcome to ${shop.name} Rewards</h2> 
      <p>Enter your details to collect points</p>

      <form method="POST" action="/capture">

        <input 
          name="name" 
          placeholder="Your Name" 
          required 
        />

        <br/><br/> 
        <input  
        type="tel" 
        name="phone" 
        placeholder="Phone Number" 
        required 
        /> 

        <input 
          type="hidden" 
          name="shopId" 
          value="${shopId}" 
        /> 
        
        <style>
        body { font-family: Arial; padding: 20px; }
        input { padding: 10px; width: 250px; margin-bottom: 10px; }
        button { padding: 10px 20px; }
        </style>
        router.get("/s/:shopId", async (req, res) => {

        const { shopId } = req.params;

        console.log("ShopId received:", shopId);

        const shop = await Shop.findOne({ shopId });

        console.log("Shop found:", shop);

  if (!shop) {
    return res.send("Shop not found");
  }
        <br/><br/>

        <button type="submit">Submit</button>

      </form>
    `);

  } catch (error) {

    console.error(error);
    res.send("Something went wrong");

  }

});

module.exports = router;