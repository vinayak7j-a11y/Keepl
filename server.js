require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

/* =========================
   ROUTE IMPORTS
========================= */

const shopRoutes = require("./routes/shopRoutes");
const scanRoutes = require("./routes/scanRoutes");
const customerRoutes = require("./routes/customerRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const redeemRoutes = require("./routes/redeemRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const queueRoutes = require("./routes/queueRoutes");
const posterRoutes = require("./routes/posterRoutes");
const shopPageRoutes = require("./routes/shopPageRoutes");

/* =========================
   APP SETTINGS
========================= */

app.set("trust proxy", 1);

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC FILES
========================= */

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   VIEW ENGINE
========================= */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* =========================
   HOME PAGE
========================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* =========================
   PAGE ROUTES (UI)
========================= */

// 🏪 Shop pages 
app.use("/api/shops", shopRoutes);
app.use("/shop", shopPageRoutes);

// 📲 Scan page + capture flow
app.use("/", scanRoutes); 
// IMPORTANT: this keeps /s/:shopId working cleanly

// 📊 Dashboard
app.use("/dashboard", dashboardRoutes);

// 📄 Poster
app.use("/poster", posterRoutes);

/* =========================
   API ROUTES (STRICT)
========================= */

app.use("/api/shops", shopRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/redeem", redeemRoutes);
app.use("/api/queue", queueRoutes);

/* =========================
   HEALTH CHECK
========================= */

app.get("/health", (req, res) => {
  res.json({
    status: "running",
    service: "Keepl API",
    time: new Date()
  });
});

/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    message: err.message || "Internal server error"
  });
});

/* =========================
   DATABASE CONNECTION
========================= */

const PORT = process.env.PORT || 5050;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true
    });

    console.log("MongoDB Connected ✅");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

startServer();