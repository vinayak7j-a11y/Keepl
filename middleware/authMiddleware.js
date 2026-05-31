const jwt = require("jsonwebtoken");
const Shop = require("../models/Shop");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.shopId = decoded.shopId;

    const shop = await Shop.findOne({ shopId: decoded.shopId }).select("isActive").lean();

    if (shop && !shop.isActive) {
      return res.status(403).json({ message: "Account suspended. Contact support." });
    }

    next();

  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
