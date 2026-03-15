const Shop = require("../models/Shop");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");

/* =========================
   REGISTER SHOP
========================= */

exports.registerShop = async (req, res) => {
  try {

    const { name, ownerName, phone, password } = req.body;

    /* ===== VALIDATION ===== */

    if (!name || !ownerName || !phone || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    if (phone.length < 10) {
      return res.status(400).json({
        message: "Invalid phone number"
      });
    }

    /* ===== CHECK EXISTING SHOP ===== */

    const existingShop = await Shop.findOne({ phone });

    if (existingShop) {
      return res.status(400).json({
        message: "Shop already registered with this phone"
      });
    }

    /* ===== HASH PASSWORD ===== */

    const hashedPassword = await bcrypt.hash(password, 10);

    /* ===== GENERATE UNIQUE SHOP ID ===== */

    let shopId;
    let existing;

    do {
      shopId = uuidv4();
      existing = await Shop.findOne({ shopId });
    } while (existing);

    /* ===== GENERATE QR ===== */

    const qrUrl = `${process.env.BASE_URL}/s/${shopId}`;

    const qrCode = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "H"
    });

    /* ===== CREATE SHOP ===== */

    const shop = new Shop({
      name,
      ownerName,
      phone,
      password: hashedPassword,
      shopId,
      qrCode
    });

    await shop.save();

    /* ===== RESPONSE ===== */

    res.status(201).json({
      message: "Shop registered successfully",
      shopId: shop.shopId,
      qrCode: shop.qrCode
    });

  } catch (error) {

    console.error("Register shop error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }
};


/* =========================
   LOGIN SHOP
========================= */

exports.loginShop = async (req, res) => {

  try {

    const { phone, password } = req.body;

    /* ===== VALIDATION ===== */

    if (!phone || !password) {
      return res.status(400).json({
        message: "Phone and password required"
      });
    }

    /* ===== FIND SHOP ===== */

    const shop = await Shop.findOne({ phone });

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    /* ===== CHECK PASSWORD ===== */

    const isMatch = await bcrypt.compare(password, shop.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    /* ===== CREATE TOKEN ===== */

    const token = jwt.sign(
      {
        shopId: shop.shopId,
        id: shop._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    /* ===== RESPONSE ===== */

    res.json({
      message: "Login successful",
      token,
      shopId: shop.shopId,
      qrCode: shop.qrCode
    });

  } catch (error) {

    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};


/* =========================
   GET SHOP PROFILE
========================= */

exports.getShopProfile = async (req, res) => {

  try {

    const shop = await Shop.findById(req.shop.id).select("-password");

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    res.json(shop);

  } catch (error) {

    console.error("Profile error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }

};