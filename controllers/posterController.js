const PDFDocument = require("pdfkit");
const Shop = require("../models/Shop");

/* =========================
   DOWNLOAD QR POSTER (IMPROVED)
========================= */

exports.downloadPoster = async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).send("ShopId required");
    }

    const shop = await Shop.findOne({ shopId }).lean();

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    if (!shop.qrCode) {
      return res.status(400).send("QR code not available");
    }

    /* ===== SAFE FILE NAME ===== */

    const safeName = (shop.name || "shop")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    /* ===== PDF SETUP ===== */

    const doc = new PDFDocument({
      size: "A4",
      margin: 50
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${safeName}-qr-poster.pdf`
    );

    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    /* ===== HEADER ===== */

    doc
      .fontSize(32)
      .fillColor("#2c3e50")
      .text(shop.name, {
        align: "center"
      });

    doc.moveDown(0.5);

    doc
      .fontSize(18)
      .fillColor("#27ae60")
      .text("Scan & Earn Rewards 🎉", {
        align: "center"
      });

    doc.moveDown(2);

    /* ===== QR CODE ===== */

    try {
      doc.image(shop.qrCode, {
        fit: [260, 260],
        align: "center"
      });
    } catch (imgErr) {
      console.error("QR image error:", imgErr);
      doc
        .fontSize(14)
        .fillColor("red")
        .text("QR Code could not be loaded", { align: "center" });
    }

    doc.moveDown(2);

    /* ===== STEPS ===== */

    doc
      .fontSize(16)
      .fillColor("#000")
      .text("How it works:", { align: "center" });

    doc.moveDown();

    doc
      .fontSize(13)
      .text("1. Scan the QR Code", { align: "center" });

    doc.text("2. Enter your phone number", { align: "center" });

    doc.text("3. Get reward points instantly", { align: "center" });

    doc.moveDown(3);

    /* ===== FOOTER ===== */

    doc
      .fontSize(12)
      .fillColor("gray")
      .text("Powered by Keepl", {
        align: "center"
      });

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor("#bbb")
      .text("Turn every customer into a returning customer", {
        align: "center"
      });

    doc.end();

  } catch (error) {
    console.error("Poster generation error:", error);

    res.status(500).send("Error generating poster");
  }
};