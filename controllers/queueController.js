const CustomerQueue = require("../models/CustomerQueue");
const Shop = require("../models/Shop");

/* =========================
   GET QUEUE
========================= */

exports.getQueue = async (req, res) => {

  try {

    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const queue = await CustomerQueue.find({
      shopId: shop._id,
      status: "waiting"
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .select("name phone createdAt")
      .lean();

    res.json(queue);

  } catch (error) {

    console.error("Queue fetch error:", error);

    res.status(500).json({ message: "Server error" });

  }

};


/* =========================
   ADD CUSTOMER TO QUEUE
========================= */

exports.addToQueue = async (req, res) => {

  try {

    const { shopId, name, phone } = req.body;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    /* PREVENT DUPLICATE QUEUE */

    const existing = await CustomerQueue.findOne({
      phone,
      shopId: shop._id,
      status: "waiting"
    });

    if (existing) {
      return res.json({
        message: "Customer already in queue"
      });
    }

    const queueItem = await CustomerQueue.create({
      name,
      phone,
      shopId: shop._id,
      status: "waiting"
    });

    res.json({
      message: "Customer added to queue",
      queueItem
    });

  } catch (error) {

    console.error("Queue add error:", error);

    res.status(500).json({ message: "Server error" });

  }

};


/* =========================
   REMOVE QUEUE ITEM
========================= */

exports.removeFromQueue = async (req, res) => {

  try {

    const { id } = req.params;

    await CustomerQueue.findByIdAndDelete(id);

    res.json({
      message: "Customer removed from queue"
    });

  } catch (error) {

    console.error("Queue remove error:", error);

    res.status(500).json({ message: "Server error" });

  }

};


/* =========================
   CLEAR COMPLETED QUEUE
========================= */

exports.clearQueue = async (req, res) => {

  try {

    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    await CustomerQueue.deleteMany({
      shopId: shop._id,
      status: "completed"
    });

    res.json({
      message: "Completed queue cleared"
    });

  } catch (error) {

    console.error("Queue clear error:", error);

    res.status(500).json({ message: "Server error" });

  }

};