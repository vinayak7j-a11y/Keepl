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

    /* ── TOP ORANGE BAND — compact ── */
    doc.rect(0, 0, W, 160).fill("#FF6B00");

    // keepl. wordmark
    doc.fontSize(38).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text("keepl.", 0, 22, { align: "center", width: W });

    // Tagline
    doc.fontSize(10).fillColor("rgba(255,255,255,0.7)").font("Helvetica")
      .text("LOYALTY SIMPLIFIED", 0, 68, { align: "center", width: W, characterSpacing: 3 });

    // Divider
    doc.moveTo(W/2 - 40, 84).lineTo(W/2 + 40, 84)
      .strokeColor("rgba(255,255,255,0.3)").lineWidth(0.5).stroke();

    // Shop name
    doc.fontSize(22).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text(shop.name, 48, 92, { align: "center", width: W - 96 });

    // Shop subline
    doc.fontSize(11).fillColor("rgba(255,255,255,0.75)").font("Helvetica")
      .text("Scan below to earn reward points on every visit", 0, 124, { align: "center", width: W });

    /* ── WHITE CARD ── */
    const cardX = 32;
    const cardY = 144;
    const cardW = W - 64;
    const cardH = H - cardY - 52;

    doc.roundedRect(cardX + 2, cardY + 3, cardW, cardH, 16).fill("rgba(26,26,46,0.05)");
    doc.roundedRect(cardX, cardY, cardW, cardH, 16).fill("#FFFFFF");
    doc.roundedRect(cardX, cardY, cardW, 4, 2).fill("#FF6B00");

    /* ── QR CODE — smaller ── */
    const qrSize = 150;
    const qrX = (W - qrSize) / 2;
    const qrY = cardY + 20;

    // Teal frame
    doc.roundedRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12).fill("#E0F2F0");
    // White bg
    doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 8).fill("#FFFFFF");

    // Corner dots
    [[qrX-10,qrY-10],[qrX+qrSize-6,qrY-10],[qrX-10,qrY+qrSize-6],[qrX+qrSize-6,qrY+qrSize-6]]
      .forEach(([cx,cy]) => doc.roundedRect(cx, cy, 16, 16, 4).fill("#FF6B00"));

    try {
      doc.image(shop.qrCode, qrX, qrY, { fit: [qrSize, qrSize] });
    } catch(e) {
      doc.fontSize(11).fillColor("#EF4444").text("QR unavailable", { align: "center" });
    }

    // SCAN ME pill
    const scanPillW = 100;
    const scanPillX = (W - scanPillW) / 2;
    const scanPillY = qrY + qrSize + 8;
    doc.roundedRect(scanPillX, scanPillY, scanPillW, 22, 11).fill("#FF6B00");
    doc.fontSize(10).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text("SCAN ME", scanPillX, scanPillY + 7, { align: "center", width: scanPillW, characterSpacing: 1.5 });

    /* ── POINTS PILL ── */
    const pillY = scanPillY + 30;
    doc.roundedRect(cardX + 14, pillY, cardW - 28, 30, 15).fill("#FFF0E6");
    doc.fontSize(11).fillColor("#C24E00").font("Helvetica-Bold")
      .text(`10 pts per Rs.100   |   ${rewardThreshold} pts = FREE reward`, cardX + 14, pillY + 10,
        { align: "center", width: cardW - 28 });

    /* ── HOW IT WORKS ── */
    const howY = pillY + 44;
    doc.fontSize(9).fillColor("#9090A8").font("Helvetica")
      .text("HOW IT WORKS", 0, howY, { align: "center", width: W, characterSpacing: 2 });

    const steps = [
      { num: "1", title: "Scan the QR code", desc: "Open your camera and point it at the QR above" },
      { num: "2", title: "Enter your details", desc: "Type your name and phone number — only once" },
      { num: "3", title: "Earn points on every bill", desc: "Shopkeeper adds your points after payment" },
      { num: "4", title: "Redeem your free reward", desc: `Collect ${rewardThreshold} points and claim your reward` },
    ];

    const stepStartY = howY + 16;
    const stepH = 40;
    const stepGap = 6;

    steps.forEach((step, i) => {
      const y = stepStartY + i * (stepH + stepGap);
      const bx = cardX + 12;
      const bw = cardW - 24;

      doc.roundedRect(bx, y, bw, stepH, 8).fill(i % 2 === 0 ? "#F7F6F2" : "#FFFFFF");

      // Circle
      doc.circle(bx + 20, y + stepH/2, 12).fill("#FF6B00");
      doc.fontSize(11).fillColor("#FFFFFF").font("Helvetica-Bold")
        .text(step.num, bx + 14, y + stepH/2 - 6, { width: 12, align: "center" });

      // Connector
      if (i < steps.length - 1) {
        doc.moveTo(bx + 20, y + stepH).lineTo(bx + 20, y + stepH + stepGap)
          .strokeColor("#FFD4B3").lineWidth(1.5).stroke();
      }

      // Title + desc
      doc.fontSize(11).fillColor("#1A1A2E").font("Helvetica-Bold")
        .text(step.title, bx + 42, y + 8);
      doc.fontSize(9.5).fillColor("#9090A8").font("Helvetica")
        .text(step.desc, bx + 42, y + 22);
    });

    /* ── WHY JOIN ── */
    const whyY = stepStartY + steps.length * (stepH + stepGap) + 12;
    doc.fontSize(9).fillColor("#9090A8").font("Helvetica")
      .text("WHY JOIN?", 0, whyY, { align: "center", width: W, characterSpacing: 2 });

    const benefits = [
      "No app download needed — just scan and go",
      "Points never expire at this shop",
      "Get a WhatsApp message after every visit",
    ];

    benefits.forEach((b, i) => {
      const y = whyY + 14 + i * 20;
      const bx = cardX + 16;
      doc.circle(bx + 7, y + 7, 4).fill("#00796B");
      doc.fontSize(10.5).fillColor("#1A1A2E").font("Helvetica").text(b, bx + 20, y + 1);
    });

    /* ── FOOTER ── */
    doc.rect(0, H - 52, W, 52).fill("#1A1A2E");
    doc.fontSize(15).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text("keepl.", 0, H - 38, { align: "center", width: W });
    doc.fontSize(8).fillColor("rgba(255,255,255,0.4)").font("Helvetica")
      .text("Turn every visit into a reward", 0, H - 20, { align: "center", width: W, characterSpacing: 0.5 });

    doc.end();

  } catch (error) {
    console.error("Poster error:", error);
    res.status(500).send("Error generating poster");
  }
};