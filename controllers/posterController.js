const PDFDocument = require("pdfkit");
const Shop = require("../models/Shop");

/* =========================
   DOWNLOAD QR POSTER
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

    const W = 595.28;  // A4 width pts
    const H = 841.89;  // A4 height pts

    /* ===================================================
       BACKGROUND
    =================================================== */

    // Warm off-white base
    doc.rect(0, 0, W, H).fill("#F7F6F2");

    // Saffron top section
    doc.rect(0, 0, W, 310).fill("#FF6B00");

    // Subtle diagonal accent on top section
    doc.save();
    doc.rect(0, 0, W, 310).clip();
    doc
      .moveTo(W * 0.55, 0)
      .lineTo(W, 0)
      .lineTo(W, 310)
      .lineTo(W * 0.75, 310)
      .fill("rgba(255,255,255,0.05)");
    doc.restore();

    // Dark ink footer
    doc.rect(0, H - 60, W, 60).fill("#1A1A2E");

    /* ===================================================
       TOP SECTION — branding + shop name
    =================================================== */

    // keepl. wordmark
    doc
      .fontSize(42)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("keepl.", 0, 36, { align: "center" });

    // Gold dot accent under wordmark
    doc
      .circle(W / 2 + 52, 46, 5)
      .fill("#F5C518");

    // Tagline
    doc
      .fontSize(12)
      .fillColor("rgba(255,255,255,0.75)")
      .font("Helvetica")
      .text("LOYALTY SIMPLIFIED", 0, 88, {
        align: "center",
        characterSpacing: 3
      });

    // Divider line
    doc
      .moveTo(W / 2 - 60, 108)
      .lineTo(W / 2 + 60, 108)
      .strokeColor("rgba(255,255,255,0.3)")
      .lineWidth(0.5)
      .stroke();

    // Shop name
    doc
      .fontSize(26)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text(shop.name, 48, 120, {
        align: "center",
        width: W - 96
      });

    // Shop subline
    doc
      .fontSize(13)
      .fillColor("rgba(255,255,255,0.8)")
      .font("Helvetica")
      .text("invites you to earn rewards on every visit", 0, 158, {
        align: "center"
      });

    /* ===================================================
       WHITE CARD
    =================================================== */

    const cardX = 40;
    const cardY = 218;
    const cardW = W - 80;
    const cardH = 490;

    // Card shadow (simulated with slightly larger darker rect)
    doc
      .roundedRect(cardX + 2, cardY + 3, cardW, cardH, 18)
      .fill("rgba(26,26,46,0.07)");

    // Card body
    doc
      .roundedRect(cardX, cardY, cardW, cardH, 18)
      .fill("#FFFFFF");

    // Top accent bar
    doc
      .roundedRect(cardX, cardY, cardW, 5, 2)
      .fill("#FF6B00");

    /* ===================================================
       QR CODE SECTION
    =================================================== */

    const qrSize = 186;
    const qrX = (W - qrSize) / 2;
    const qrY = cardY + 28;

    // QR frame — teal ring
    doc
      .roundedRect(qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 14)
      .fill("#E0F2F0");

    // Inner white background for QR
    doc
      .roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 10)
      .fill("#FFFFFF");

    // Corner decorations — saffron squares
    const corners = [
      [qrX - 14, qrY - 14],
      [qrX + qrSize - 6, qrY - 14],
      [qrX - 14, qrY + qrSize - 6],
      [qrX + qrSize - 6, qrY + qrSize - 6],
    ];
    corners.forEach(([cx, cy]) => {
      doc.roundedRect(cx, cy, 20, 20, 4).fill("#FF6B00");
    });

    // QR code image
    try {
      doc.image(shop.qrCode, qrX, qrY, {
        fit: [qrSize, qrSize],
        align: "center"
      });
    } catch (imgErr) {
      console.error("QR image error:", imgErr);
      doc
        .fontSize(13)
        .fillColor("#EF4444")
        .text("QR Code could not be loaded", { align: "center" });
    }

    // "Scan Me" label under QR
    doc
      .roundedRect(qrX + 30, qrY + qrSize + 10, qrSize - 60, 26, 13)
      .fill("#FF6B00");

    doc
      .fontSize(11)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("SCAN ME", qrX + 30, qrY + qrSize + 17, {
        align: "center",
        width: qrSize - 60,
        characterSpacing: 1.5
      });

    /* ===================================================
       POINTS CALLOUT PILL
    =================================================== */

    const rewardThreshold = shop.rewardThreshold || 100;
    const pillY = qrY + qrSize + 48;

    doc
      .roundedRect(cardX + 16, pillY, cardW - 32, 38, 19)
      .fill("#FFF0E6");

    doc
      .fontSize(12)
      .fillColor("#C24E00")
      .font("Helvetica-Bold")
      .text(
        `⚡ 10 points per ₹100 spent   ·   🎁 ${rewardThreshold} points = free reward`,
        cardX + 16,
        pillY + 13,
        { align: "center", width: cardW - 32 }
      );

    /* ===================================================
       WHY USE KEEPL — 3 benefit pills
    =================================================== */

    const benefitY = pillY + 54;

    doc
      .fontSize(10)
      .fillColor("#9090A8")
      .font("Helvetica")
      .text("WHY JOIN?", 0, benefitY, {
        align: "center",
        characterSpacing: 2
      });

    const benefits = [
      { icon: "★", text: "Get rewarded for every purchase" },
      { icon: "♻", text: "Points never expire at this shop" },
      { icon: "🎁", text: "Redeem for free rewards — no app needed" },
    ];

    const benefitStartY = benefitY + 18;
    const benefitSpacing = 30;

    benefits.forEach((b, i) => {
      const y = benefitStartY + i * benefitSpacing;
      const bx = cardX + 24;
      const bw = cardW - 48;

      // Benefit row background
      doc
        .roundedRect(bx, y, bw, 24, 8)
        .fill(i % 2 === 0 ? "#F7F6F2" : "#FFFFFF");

      // Icon circle
      doc
        .circle(bx + 16, y + 12, 10)
        .fill("#FF6B00");

      doc
        .fontSize(10)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text(b.icon, bx + 9, y + 6, { width: 14, align: "center" });

      // Benefit text
      doc
        .fontSize(12)
        .fillColor("#1A1A2E")
        .font("Helvetica")
        .text(b.text, bx + 34, y + 7);
    });

    /* ===================================================
       HOW IT WORKS — 3 steps
    =================================================== */

    const stepsY = benefitStartY + benefits.length * benefitSpacing + 20;

    doc
      .fontSize(10)
      .fillColor("#9090A8")
      .font("Helvetica")
      .text("HOW IT WORKS", 0, stepsY, {
        align: "center",
        characterSpacing: 2
      });

    const steps = [
      { num: "1", text: "Scan the QR code above" },
      { num: "2", text: "Enter your name & phone number" },
      { num: "3", text: "Points added after your bill is entered" },
    ];

    const stepStartY = stepsY + 18;
    const stepSpacing = 30;
    const lineX = W / 2 - 80;

    steps.forEach((step, i) => {
      const y = stepStartY + i * stepSpacing;

      // Step number circle — teal
      doc
        .circle(lineX, y + 10, 11)
        .fill("#00796B");

      doc
        .fontSize(11)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text(step.num, lineX - 4, y + 4);

      // Connector line
      if (i < steps.length - 1) {
        doc
          .moveTo(lineX, y + 21)
          .lineTo(lineX, y + stepSpacing - 1)
          .strokeColor("#E0F2F0")
          .lineWidth(2)
          .stroke();
      }

      // Step text
      doc
        .fontSize(12)
        .fillColor("#1A1A2E")
        .font("Helvetica")
        .text(step.text, lineX + 20, y + 4);
    });

    /* ===================================================
       FOOTER
    =================================================== */

    // keepl wordmark in footer
    doc
      .fontSize(15)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("keepl.", 0, H - 40, { align: "center" });

    doc
      .fontSize(9)
      .fillColor("rgba(255,255,255,0.45)")
      .font("Helvetica")
      .text("Turn every visit into a reward", 0, H - 22, {
        align: "center",
        characterSpacing: 0.5
      });

    doc.end();

  } catch (error) {
    console.error("Poster generation error:", error);
    res.status(500).send("Error generating poster");
  }
};