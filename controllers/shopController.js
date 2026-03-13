const Shop = require("../models/Shop");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");

exports.registerShop = async (req, res) => {

  try {

    const { name, ownerName, phone, password } = req.body;

    // Check if shop already exists
    const existingShop = await Shop.findOne({ phone });

    if (existingShop) {
      return res.status(400).json({
        message: "Shop already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique shop ID
    const shopId = uuidv4();

    // Create QR URL
    const qrData = `${process.env.BASE_URL}/s/${shopId}`;

    // Generate QR code
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff"
      }
    });

    // Create shop
    const shop = new Shop({
      name,
      ownerName,
      phone,
      password: hashedPassword,
      shopId,
      qrCode
    });

    await shop.save();

    res.json({
      message: "Shop registered successfully",
      shopId,
      qrCode
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Server error"
    });

  }

};

exports.loginShop = async (req, res) => {

  try {

    const { phone, password } = req.body;

    const shop = await Shop.findOne({ phone });

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    const isMatch = await bcrypt.compare(password, shop.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { shopId: shop._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      shopId: shop.shopId,
      qrCode: shop.qrCode
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Server error"
    });

  }

};