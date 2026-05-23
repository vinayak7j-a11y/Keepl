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
      margin: 0
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${safeName}-qr-poster.pdf`
    );

    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    const W = 595.28; // A4 width in points
    const H = 841.89; // A4 height in points

    /* ===== BACKGROUND ===== */

    // Main background — warm off-white
    doc
      .rect(0, 0, W, H)
      .fill("#F7F6F2");

    // Top saffron band
    doc
      .rect(0, 0, W, 220)
      .fill("#FF6B00");

    // Bottom footer band
    doc
      .rect(0, H - 70, W, 70)
      .fill("#1A1A2E");

    /* ===== TOP BAND — logo + tagline ===== */

    // Small bolt icon area (simulated as a rounded rect)
    doc
      .roundedRect(W / 2 - 22, 28, 44, 44, 10)
      .fill("rgba(255,255,255,0.2)");

    // keepl wordmark
    doc
      .fontSize(36)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("keepl.", 0, 82, { align: "center" });

    // Tagline
    doc
      .fontSize(13)
      .fillColor("rgba(255,255,255,0.85)")
      .font("Helvetica")
      .text("LOYALTY SIMPLIFIED", 0, 126, {
        align: "center",
        characterSpacing: 2
      });

    // Shop name
    doc
      .fontSize(22)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text(shop.name, 50, 158, {
        align: "center",
        width: W - 100
      });

    /* ===== WHITE CARD AREA ===== */

    const cardX = 60;
    const cardY = 200;
    const cardW = W - 120;
    const cardH = 430;

    doc
      .roundedRect(cardX, cardY, cardW, cardH, 16)
      .fill("#FFFFFF");

    // Card top accent line
    doc
      .rect(cardX, cardY, cardW, 4)
      .fill("#FF6B00");

    /* ===== HEADING INSIDE CARD ===== */

    doc
      .fontSize(18)
      .fillColor("#1A1A2E")
      .font("Helvetica-Bold")
      .text("Scan to Earn Reward Points", 0, cardY + 24, {
        align: "center"
      });

    doc
      .fontSize(12)
      .fillColor("#9090A8")
      .font("Helvetica")
      .text("Show this QR at the counter every visit", 0, cardY + 50, {
        align: "center"
      });

    /* ===== QR CODE ===== */

    const qrSize = 200;
    const qrX = (W - qrSize) / 2;
    const qrY = cardY + 78;

    // QR background box
    doc
      .roundedRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 12)
      .fill("#F7F6F2");

    try {
      doc.image(shop.qrCode, qrX, qrY, {
        fit: [qrSize, qrSize],
        align: "center"
      });
    } catch (imgErr) {
      console.error("QR image error:", imgErr);
      doc
        .fontSize(14)
        .fillColor("#EF4444")
        .text("QR Code could not be loaded", { align: "center" });
    }

    /* ===== POINTS CALLOUT ===== */

    const rewardThreshold = shop.rewardThreshold || 100;
    const calloutY = qrY + qrSize + 28;

    // Saffron pill
    doc
      .roundedRect(cardX + 20, calloutY, cardW - 40, 40, 20)
      .fill("#FFF0E6");

    doc
      .fontSize(13)
      .fillColor("#C24E00")
      .font("Helvetica-Bold")
      .text(
        `⚡ 10 points per ₹100 spent   ·   🎁 ${rewardThreshold} points = free reward`,
        cardX + 20,
        calloutY + 13,
        { align: "center", width: cardW - 40 }
      );

    /* ===== HOW IT WORKS ===== */

    const stepsY = calloutY + 58;

    doc
      .fontSize(11)
      .fillColor("#9090A8")
      .font("Helvetica")
      .text("HOW IT WORKS", 0, stepsY, {
        align: "center",
        characterSpacing: 1.5
      });

    const steps = [
      { num: "1", text: "Scan the QR code" },
      { num: "2", text: "Enter your phone number" },
      { num: "3", text: "Earn points on every visit" },
    ];

    const stepStartY = stepsY + 20;
    const stepSpacing = 38;
    const circleX = W / 2 - 110;

    steps.forEach((step, i) => {
      const y = stepStartY + i * stepSpacing;

      // Circle
      doc
        .circle(circleX, y + 10, 12)
        .fill("#FF6B00");

      doc
        .fontSize(11)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text(step.num, circleX - 4, y + 4);

      // Step text
      doc
        .fontSize(13)
        .fillColor("#1A1A2E")
        .font("Helvetica")
        .text(step.text, circleX + 22, y + 3);

      // Connector line between steps
      if (i < steps.length - 1) {
        doc
          .moveTo(circleX, y + 22)
          .lineTo(circleX, y + stepSpacing - 2)
          .strokeColor("#E8E6DF")
          .lineWidth(1.5)
          .stroke();
      }
    });

    /* ===== FOOTER ===== */

    doc
      .fontSize(13)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("Powered by keepl.", 0, H - 46, {
        align: "center"
      });

    doc.end();

  } catch (error) {
    console.error("Poster generation error:", error);
    res.status(500).send("Error generating poster");
  }
};