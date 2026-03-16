require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const shopRoutes = require("./routes/shopRoutes");
const scanRoutes = require("./routes/scanRoutes");
const customerRoutes = require("./routes/customerRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const redeemRoutes = require("./routes/redeemRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const queueRoutes = require("./routes/queueRoutes");
const posterRoutes = require("./routes/posterRoutes");

const app = express();

/* =========================
   APP SETTINGS
========================= */

app.set("trust proxy", 1); // useful for deployments (Render, Heroku)

/* =========================
   MIDDLEWARE
========================= */

app.use(
  cors({
    origin: "*", // later restrict to your frontend domain
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC FILES
========================= */

app.use(express.static(path.join(__dirname, "public")));
/* =========================
   HOME PAGE
========================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
/* =========================
   VIEW ENGINE
========================= */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* =========================
   API ROUTES
========================= */

app.use("/api/shops", shopRoutes);
app.use("/api", transactionRoutes);
app.use("/api", redeemRoutes);
app.use("/api", queueRoutes);

/* =========================
   PAGE ROUTES
========================= */

app.use("/", scanRoutes);
app.use("/", customerRoutes);
app.use("/", dashboardRoutes);
app.use("/", posterRoutes);

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
  res.status(404).send("Page not found");
});

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    message: "Internal server error"
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