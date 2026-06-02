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

    const token = jwt.sign(
  {
    shopId: shop.shopId,
    id: shop._id
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

res.json({
  message: "Shop registered successfully",
  token,
  shopId: shop.shopId,
  qrCode: shop.qrCode
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
/* =========================
   ADMIN PASSWORD RESET
   POST /api/shops/reset-password
========================= */

exports.resetPassword = async (req, res) => {
  try {
    const { phone, newPassword, adminSecret } = req.body;

    // ✅ Protect with admin secret — change this to something only you know
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!phone || !newPassword) {
      return res.status(400).json({ message: "Phone and new password required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const shop = await Shop.findOne({ phone });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found with this phone number" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Shop.updateOne({ phone }, { password: hashedPassword });

    console.log(`✅ Password reset for shop: ${shop.name} (${phone})`);

    res.json({
      message: "Password reset successful",
      shop: shop.name,
      phone: shop.phone
    });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   UPDATE REWARD NAME
   PATCH /api/shops/:shopId/reward-name
========================= */

exports.updateRewardName = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { rewardName } = req.body;

    if (req.shopId !== shopId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!rewardName || rewardName.trim().length === 0) {
      return res.status(400).json({ message: "Reward name cannot be empty" });
    }

    if (rewardName.length > 80) {
      return res.status(400).json({ message: "Reward name too long (max 80 chars)" });
    }

    await Shop.updateOne({ shopId }, { rewardName: rewardName.trim() });

    res.json({
      message: "Reward name updated",
      rewardName: rewardName.trim()
    });

  } catch (error) {
    console.error("Update reward name error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================
   GET SHOP QR
   GET /api/shops/:shopId/qr
========================= */

exports.getShopQR = async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findOne({ shopId }).select('qrCode').lean();
    if(!shop) return res.status(404).json({ message: 'Shop not found' });
    res.json({ qrCode: shop.qrCode || null });
  } catch(err) {
    console.error('QR fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.extendTrial = async (req, res) => {
  try {
    const { phone, days, adminSecret } = req.body;

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const shop = await Shop.findOne({ phone });
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const newDate = new Date(
      Math.max(Date.now(), shop.trialEndsAt?.getTime() || Date.now()) 
      + 1000 * 60 * 60 * 24 * (days || 30)
    );

    await Shop.updateOne({ phone }, { trialEndsAt: newDate });

    res.json({ 
      message: `Trial extended`,
      trialEndsAt: newDate,
      shop: shop.name
    });

  } catch (err) {
    console.error("Extend trial error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
