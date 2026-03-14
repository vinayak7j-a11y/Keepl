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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/dashboard/:shopId", async (req,res)=>{

const shopId = req.params.shopId

const shop = await Shop.findOne({ shopId })

if(!shop){

return res.send("Shop not found")

}

res.render("dashboard",{

shopName: shop.name,
qrCode: shop.qrCode,
shopId: shop.shopId

})

})
// static files
app.use(express.static("public"));

// view engine
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

const PORT = process.env.PORT || 5050;

console.log("Attempting Mongo Connection...");

/* =========================
   DATABASE CONNECTION
========================= */

mongoose.connect(process.env.MONGO_URI)
.then(() => {

    console.log("MongoDB Connected ✅");

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

})
.catch((err) => {
    console.error("MongoDB connection error:", err);
});