require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const shopRoutes = require("./routes/shopRoutes");
const scanRoutes = require("./routes/scanRoutes");
const customerRoutes = require("./routes/customerRoutes");
const transactionRoutes = require("./routes/transactionRoutes"); 
const redeemRoutes = require("./routes/redeemRoutes"); 
const dashboardRoutes = require("./routes/dashboardRoutes"); 
const queueRoutes=require("./routes/queueRoutes")
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/api/shops", shopRoutes); 
app.use("/api", transactionRoutes); 
app.use("/api", redeemRoutes);
app.use("/", scanRoutes);
app.use("/", customerRoutes);
app.use("/api", dashboardRoutes); 
app.use("/api",queueRoutes)
const PORT = process.env.PORT || 5050;

console.log("Attempting Mongo Connection...");

// CONNECT TO MONGODB FIRST
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