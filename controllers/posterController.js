const PDFDocument = require("pdfkit");
const Shop = require("../models/Shop");

/* =========================
   DOWNLOAD QR POSTER
========================= */

exports.downloadPoster = async (req, res) => {

  try {

    const { shopId } = req.params;

    /* ===== VALIDATION ===== */

    if (!shopId) {
      return res.status(400).send("ShopId required");
    }

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.status(404).send("Shop not found");
    }

    if (!shop.qrCode) {
      return res.status(400).send("QR code not available");
    }

    /* ===== CREATE PDF ===== */

    const doc = new PDFDocument({
      size: "A4",
      margin: 50
    });

    const safeName = shop.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${safeName}-qr-poster.pdf`
    );

    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    /* ===== TITLE ===== */

    doc
      .fontSize(30)
      .text(shop.name, {
        align: "center"
      });

    doc.moveDown();

    doc
      .fontSize(18)
      .text("Scan & Earn Rewards", {
        align: "center"
      });

    doc.moveDown(2);

    /* ===== QR CODE ===== */

    doc.image(shop.qrCode, {
      fit: [260, 260],
      align: "center"
    });

    doc.moveDown(2);

    /* ===== INSTRUCTIONS ===== */

    doc
      .fontSize(14)
      .text("1. Scan the QR Code", { align: "center" });

    doc
      .text("2. Enter your phone number", { align: "center" });

    doc
      .text("3. Earn reward points instantly", { align: "center" });

    doc.moveDown(2);

    /* ===== FOOTER ===== */

    doc
      .fontSize(12)
      .fillColor("gray")
      .text("Powered by Keepl Rewards Platform", {
        align: "center"
      });

    doc.end();

  } catch (error) {

    console.error("Poster generation error:", error);

    res.status(500).send("Error generating poster");

  }

};