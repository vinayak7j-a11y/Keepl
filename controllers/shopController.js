const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Shop = require("../models/Shop");

/* =========================
   REGISTER SHOP
========================= */

exports.getShopProfile = async (req, res) => {
  res.json({ message: "Profile coming soon" });
};

exports.updateShop = async (req, res) => {
  res.json({ message: "Update coming soon" });
};

exports.registerShop = async (req, res) => {
  try {

    // ✅ FIX: added ownerName
    const { name, ownerName, phone, password } = req.body;

    // ✅ FIX: validate ownerName too
    if (!name || !ownerName || !phone || !password) {
      return res.status(400).json({
        message: "All fields required"
      });
    }

    const existing = await Shop.findOne({ phone });

    if (existing) {
      return res.status(400).json({
        message: "Shop already exists with this phone number"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const shopId = "SHOP" + Date.now();

    // ✅ FIX: pass ownerName to Shop.create()
    const shop = await Shop.create({
      name,
      ownerName,
      phone,
      password: hashedPassword,
      shopId
    });

    res.json({
      message: "Shop registered successfully",
      shopId: shop.shopId
    });

  } catch (error) {
    console.error("Register error:", error);
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

    if (!phone || !password) {
      return res.status(400).json({
        message: "Phone and password required"
      });
    }

    // ✅ select password explicitly since it's hidden by default
    const shop = await Shop.findOne({ phone }).select("+password");

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    if (!shop.password) {
      return res.status(400).json({
        message: "Account not properly set up"
      });
    }

    const isMatch = await bcrypt.compare(password, shop.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Server config error"
      });
    }

    const token = jwt.sign(
      {
        shopId: shop.shopId,
        id: shop._id
      },
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
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};