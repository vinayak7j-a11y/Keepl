const PDFDocument = require("pdfkit");
const Shop = require("../models/Shop");

exports.downloadPoster = async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!shopId) return res.status(400).send("ShopId required");

    const shop = await Shop.findOne({ shopId }).lean();
    if (!shop) return res.status(404).send("Shop not found");
    if (!shop.qrCode) return res.status(400).send("QR code not available");

    const safeName = (shop.name || "shop").replace(/[^a-z0-9]/gi, "_").toLowerCase();

    const doc = new PDFDocument({ size: "A4", margin: 0 });

    res.setHeader("Content-Disposition", `attachment; filename=${safeName}-qr-poster.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    const W = 595.28;
    const H = 841.89;
    const rewardThreshold = shop.rewardThreshold || 100;

    /* ── BACKGROUND ── */
    doc.rect(0, 0, W, H).fill("#F7F6F2");
    doc.rect(0, 0, W, 260).fill("#FF6B00");
    doc.rect(0, H - 60, W, 60).fill("#1A1A2E");

    /* ── TOP BRANDING ── */
    // keepl. wordmark — centered
    doc
      .fontSize(44)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("keepl.", 0, 32, { align: "center", width: W });

    // Tagline
    doc
      .fontSize(11)
      .fillColor("rgba(255,255,255,0.7)")
      .font("Helvetica")
      .text("LOYALTY SIMPLIFIED", 0, 84, {
        align: "center",
        width: W,
        characterSpacing: 3
      });

    // Divider
    doc
      .moveTo(W / 2 - 50, 103)
      .lineTo(W / 2 + 50, 103)
      .strokeColor("rgba(255,255,255,0.25)")
      .lineWidth(0.5)
      .stroke();

    // Shop name
    doc
      .fontSize(24)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text(shop.name, 48, 115, { align: "center", width: W - 96 });

    // Shop subline
    doc
      .fontSize(12)
      .fillColor("rgba(255,255,255,0.75)")
      .font("Helvetica")
      .text("Scan the QR code below to earn reward points", 0, 150, {
        align: "center",
        width: W
      });

    /* ── WHITE CARD ── */
    const cardX = 36;
    const cardY = 208;
    const cardW = W - 72;
    const cardH = 570;

    // Shadow
    doc.roundedRect(cardX + 2, cardY + 3, cardW, cardH, 18).fill("rgba(26,26,46,0.06)");
    // Card
    doc.roundedRect(cardX, cardY, cardW, cardH, 18).fill("#FFFFFF");
    // Top accent
    doc.roundedRect(cardX, cardY, cardW, 5, 2).fill("#FF6B00");

    /* ── QR CODE ── */
    const qrSize = 190;
    const qrX = (W - qrSize) / 2;
    const qrY = cardY + 24;

    // Teal frame
    doc.roundedRect(qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 14).fill("#E0F2F0");
    // White bg
    doc.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 10).fill("#FFFFFF");

    // Corner dots
    const corners = [
      [qrX - 14, qrY - 14],
      [qrX + qrSize - 6, qrY - 14],
      [qrX - 14, qrY + qrSize - 6],
      [qrX + qrSize - 6, qrY + qrSize - 6],
    ];
    corners.forEach(([cx, cy]) => {
      doc.roundedRect(cx, cy, 20, 20, 5).fill("#FF6B00");
    });

    // QR image
    try {
      doc.image(shop.qrCode, qrX, qrY, { fit: [qrSize, qrSize], align: "center" });
    } catch (e) {
      doc.fontSize(12).fillColor("#EF4444").text("QR Code unavailable", { align: "center" });
    }

    // SCAN ME pill
    const scanPillX = qrX + 30;
    const scanPillY = qrY + qrSize + 10;
    doc.roundedRect(scanPillX, scanPillY, qrSize - 60, 26, 13).fill("#FF6B00");
    doc
      .fontSize(11)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("SCAN ME", scanPillX, scanPillY + 8, {
        align: "center",
        width: qrSize - 60,
        characterSpacing: 2
      });

    /* ── POINTS PILL ── */
    const pillY = scanPillY + 42;
    doc.roundedRect(cardX + 16, pillY, cardW - 32, 36, 18).fill("#FFF0E6");
    doc
      .fontSize(12)
      .fillColor("#C24E00")
      .font("Helvetica-Bold")
      .text(
        `10 points per Rs.100 spent   |   ${rewardThreshold} points = free reward`,
        cardX + 16, pillY + 12,
        { align: "center", width: cardW - 32 }
      );

    /* ── HOW IT WORKS ── */
    const howY = pillY + 52;

    doc
      .fontSize(10)
      .fillColor("#9090A8")
      .font("Helvetica")
      .text("HOW IT WORKS", 0, howY, { align: "center", width: W, characterSpacing: 2 });

    const steps = [
      { num: "1", title: "Scan the QR code", desc: "Point your phone camera at the QR above" },
      { num: "2", title: "Enter your details", desc: "Type your name and phone number once" },
      { num: "3", title: "Get points on every bill", desc: "Shopkeeper adds points after payment" },
      { num: "4", title: "Redeem your reward", desc: `Collect ${rewardThreshold} points and claim your free reward` },
    ];

    const stepStartY = howY + 20;
    const stepH = 48;
    const stepPad = 8;

    steps.forEach((step, i) => {
      const y = stepStartY + i * (stepH + stepPad);
      const bx = cardX + 16;
      const bw = cardW - 32;

      // Row bg
      doc.roundedRect(bx, y, bw, stepH, 10).fill(i % 2 === 0 ? "#F7F6F2" : "#FFFFFF");

      // Number circle
      doc.circle(bx + 22, y + stepH / 2, 14).fill("#FF6B00");
      doc
        .fontSize(12)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text(step.num, bx + 16, y + stepH / 2 - 7, { width: 12, align: "center" });

      // Title
      doc
        .fontSize(12)
        .fillColor("#1A1A2E")
        .font("Helvetica-Bold")
        .text(step.title, bx + 46, y + 9);

      // Description
      doc
        .fontSize(10)
        .fillColor("#9090A8")
        .font("Helvetica")
        .text(step.desc, bx + 46, y + 26);

      // Connector line
      if (i < steps.length - 1) {
        doc
          .moveTo(bx + 22, y + stepH)
          .lineTo(bx + 22, y + stepH + stepPad)
          .strokeColor("#FFD4B3")
          .lineWidth(1.5)
          .stroke();
      }
    });

    /* ── WHY JOIN ── */
    const whyY = stepStartY + steps.length * (stepH + stepPad) + 10;

    doc
      .fontSize(10)
      .fillColor("#9090A8")
      .font("Helvetica")
      .text("WHY JOIN?", 0, whyY, { align: "center", width: W, characterSpacing: 2 });

    const benefits = [
      "Free rewards — no app download needed",
      "Points never expire at this shop",
      "Instant WhatsApp confirmation after every visit",
    ];

    const benefitStartY = whyY + 18;

    benefits.forEach((b, i) => {
      const y = benefitStartY + i * 22;
      const bx = cardX + 16;

      doc.circle(bx + 8, y + 8, 5).fill("#00796B");
      doc
        .fontSize(11)
        .fillColor("#1A1A2E")
        .font("Helvetica")
        .text(b, bx + 22, y + 2);
    });

    /* ── FOOTER ── */
    doc
      .fontSize(16)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("keepl.", 0, H - 42, { align: "center", width: W });

    doc
      .fontSize(9)
      .fillColor("rgba(255,255,255,0.4)")
      .font("Helvetica")
      .text("Turn every visit into a reward", 0, H - 22, {
        align: "center",
        width: W,
        characterSpacing: 0.5
      });

    doc.end();

  } catch (error) {
    console.error("Poster error:", error);
    res.status(500).send("Error generating poster");
  }
};