const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");
const Shop = require("../models/Shop");

/* =========================
   QR GENERATOR — styled
========================= */

async function generateStyledQR(url) {
  // Saffron on warm white — high contrast, branded, still scannable
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",   // High — allows up to 30% of QR to be damaged/covered
    type: "image/png",
    width: 600,                  // High res for poster printing
    margin: 2,
    color: {
      dark:  "#1A1A2E",          // Ink — dark modules
      light: "#F7F6F2"           // Warm off-white background
    }
  });
  return qrDataUrl;
}

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

    const { name, ownerName, phone, password } = req.body;

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

    // ✅ Generate styled QR code pointing to the shop's scan page
    const scanUrl = `${process.env.BASE_URL}/scan/${shopId}`;
    const qrCode = await generateStyledQR(scanUrl);

    const shop = await Shop.create({
      name,
      ownerName,
      phone,
      password: hashedPassword,
      shopId,
      qrCode
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

    // ✅ If QR is missing or still old default style — regenerate on login
    if (!shop.qrCode || shop.qrCode.includes('"dark":"#000000"') || !shop.qrCode.includes("1A1A2E")) {
      const scanUrl = `${process.env.BASE_URL}/scan/${shop.shopId}`;
      shop.qrCode = await generateStyledQR(scanUrl);
      await Shop.updateOne({ _id: shop._id }, { qrCode: shop.qrCode });
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


/* =========================
   UPDATE REWARD THRESHOLD
   PATCH /api/shops/:shopId/reward-threshold
========================= */

exports.updateRewardThreshold = async (req, res) => {
  try {

    const { shopId } = req.params;
    const { rewardThreshold } = req.body;

    // Auth check — shopId from JWT must match param
    if (req.shopId !== shopId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!rewardThreshold || isNaN(rewardThreshold)) {
      return res.status(400).json({ message: "Invalid threshold value" });
    }

    const value = parseInt(rewardThreshold);

    if (value < 10) {
      return res.status(400).json({ message: "Threshold must be at least 10 points" });
    }

    await Shop.updateOne({ shopId }, { rewardThreshold: value });

    res.json({
      message: "Reward threshold updated",
      rewardThreshold: value
    });

  } catch (error) {
    console.error("Update threshold error:", error);
    res.status(500).json({ message: "Server error" });
  }
};