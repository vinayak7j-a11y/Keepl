const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Shop = require("../models/Shop");
const CustomerQueue=require("../models/CustomerQueue")
exports.captureCustomer = async (req, res) => {
await CustomerQueue.create({

name:user.name,
phone:user.phone,
shopId:shop._id

})
  try { 


    const { name, phone, shopId } = req.body;

    let user = await User.findOne({ phone });

    // Create user if not exists
    if (!user) {

      user = new User({
        name,
        phone
      });

      await user.save();
    }

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.send("Shop not found");
    }

    // Check wallet
    let wallet = await Wallet.findOne({
      userId: user._id,
      shopId: shop._id
    });

    if (!wallet) {

      wallet = new Wallet({
        userId: user._id,
        shopId: shop._id,
        points: 0
      });

      await wallet.save();

    }

    res.send(`
      <h2>Success</h2>
      <p>Hello ${name}, you are now registered with ${shop.name}</p>
    `);

  } catch (error) {

    res.send("Error capturing customer");

  }

};