const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header missing"
      });
    }

    // Expected format: Bearer TOKEN
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "Invalid authorization format"
      });
    }

    const token = parts[1];

    if (!token) {
      return res.status(401).json({
        message: "Token missing"
      });
    }

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attach shop info to request
    req.shopId = decoded.shopId;

    next();

  } catch (error) {

    console.error("Auth error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token"
    });

  }

};

module.exports = authMiddleware;