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

    /* ── TOP ORANGE BAND: 0 → 175 ── */
    doc.rect(0, 0, W, 175).fill("#FF6B00");

    doc.fontSize(40).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text("keepl.", 0, 20, { align: "center", width: W });

    doc.fontSize(10).fillColor("rgba(255,255,255,0.7)").font("Helvetica")
      .text("LOYALTY SIMPLIFIED", 0, 66, { align: "center", width: W, characterSpacing: 3 });

    doc.moveTo(W/2 - 36, 82).lineTo(W/2 + 36, 82)
      .strokeColor("rgba(255,255,255,0.3)").lineWidth(0.5).stroke();

    doc.fontSize(22).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text(shop.name, 48, 90, { align: "center", width: W - 96 });

    doc.fontSize(11).fillColor("rgba(255,255,255,0.8)").font("Helvetica")
      .text("Scan below to earn reward points on every visit", 0, 130, { align: "center", width: W });

    /* ── WHITE CARD: 158 → 785 (627px tall) ── */
    const cardX = 32;
    const cardY = 158;
    const cardW = W - 64;
    const cardH = 627;

    doc.roundedRect(cardX + 2, cardY + 3, cardW, cardH, 16).fill("rgba(26,26,46,0.05)");
    doc.roundedRect(cardX, cardY, cardW, cardH, 16).fill("#FFFFFF");
    doc.roundedRect(cardX, cardY, cardW, 4, 2).fill("#FF6B00");

    /* ── QR: y=170, size=180 → ends at 350 ── */
    const qrSize = 180;
    const qrX = (W - qrSize) / 2;
    const qrY = cardY + 18;

    doc.roundedRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 14).fill("#E0F2F0");
    doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 10).fill("#FFFFFF");

    [[qrX-12,qrY-12],[qrX+qrSize-8,qrY-12],[qrX-12,qrY+qrSize-8],[qrX+qrSize-8,qrY+qrSize-8]]
      .forEach(([cx,cy]) => doc.roundedRect(cx, cy, 18, 18, 4).fill("#FF6B00"));

    try {
      doc.image(shop.qrCode, qrX, qrY, { fit: [qrSize, qrSize] });
    } catch(e) {
      doc.fontSize(11).fillColor("#EF4444").text("QR unavailable", { align: "center" });
    }

    /* ── SCAN ME pill: y=362 → 384 ── */
    const scanPillW = 110;
    const scanPillX = (W - scanPillW) / 2;
    const scanPillY = qrY + qrSize + 10; // 358
    doc.roundedRect(scanPillX, scanPillY, scanPillW, 24, 12).fill("#FF6B00");
    doc.fontSize(10).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text("SCAN ME", scanPillX, scanPillY + 8, { align: "center", width: scanPillW, characterSpacing: 2 });

    /* ── POINTS PILL: y=392 → 422 ── */
    const pillY = scanPillY + 32;
    doc.roundedRect(cardX + 14, pillY, cardW - 28, 30, 15).fill("#FFF0E6");
    doc.fontSize(11).fillColor("#C24E00").font("Helvetica-Bold")
      .text(`10 pts per Rs.100   |   ${rewardThreshold} pts = FREE reward`,
        cardX + 14, pillY + 10, { align: "center", width: cardW - 28 });

    /* ── HOW IT WORKS: y=438 ── */
    const howY = pillY + 42;
    doc.fontSize(9).fillColor("#9090A8").font("Helvetica")
      .text("HOW IT WORKS", 0, howY, { align: "center", width: W, characterSpacing: 2 });

    const steps = [
      { num: "1", title: "Scan the QR code", desc: "Open your camera and point it at the QR above" },
      { num: "2", title: "Enter your details", desc: "Type your name and phone number — only once" },
      { num: "3", title: "Earn points on every bill", desc: "Shopkeeper adds your points after each payment" },
      { num: "4", title: "Redeem your free reward", desc: `Collect ${rewardThreshold} points and claim your free reward` },
    ];

    /* 4 steps × 42px each = 168px, starts at 454, ends at 622 */
    const stepStartY = howY + 14;
    const stepH = 50;
    const stepGap = 8;

    steps.forEach((step, i) => {
      const y = stepStartY + i * (stepH + stepGap);
      const bx = cardX + 12;
      const bw = cardW - 24;

      doc.roundedRect(bx, y, bw, stepH, 8).fill(i % 2 === 0 ? "#F7F6F2" : "#FFFFFF");

      doc.circle(bx + 21, y + stepH/2, 13).fill("#FF6B00");
      doc.fontSize(11).fillColor("#FFFFFF").font("Helvetica-Bold")
        .text(step.num, bx + 15, y + stepH/2 - 6, { width: 12, align: "center" });

      if (i < steps.length - 1) {
        doc.moveTo(bx + 21, y + stepH).lineTo(bx + 21, y + stepH + stepGap)
          .strokeColor("#FFD4B3").lineWidth(1.5).stroke();
      }

      doc.fontSize(11).fillColor("#1A1A2E").font("Helvetica-Bold")
        .text(step.title, bx + 44, y + 8);
      doc.fontSize(9.5).fillColor("#9090A8").font("Helvetica")
        .text(step.desc, bx + 44, y + 22);
    });

    /* ── BOTTOM NOTE: y=634 → 666 ── */
    const noteY = stepStartY + steps.length * (stepH + stepGap) + 14;
    doc.roundedRect(cardX + 14, noteY, cardW - 28, 56, 12).fill("#E0F2F0");
    doc.fontSize(12).fillColor("#004D40").font("Helvetica-Bold")
      .text("No app needed  |  Points never expire", cardX + 14, noteY + 12, { align: "center", width: cardW - 28 });
    doc.fontSize(11).fillColor("#00796B").font("Helvetica")
      .text("Get a WhatsApp message after every visit", cardX + 14, noteY + 32, { align: "center", width: cardW - 28 });

    /* ── FOOTER: 785 → 841 ── */
    doc.rect(0, H - 56, W, 56).fill("#1A1A2E");
    doc.fontSize(15).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text("keepl.", 0, H - 40, { align: "center", width: W });
    doc.fontSize(9).fillColor("rgba(255,255,255,0.4)").font("Helvetica")
      .text("Turn every visit into a reward", 0, H - 20, { align: "center", width: W, characterSpacing: 0.5 });

    doc.end();

  } catch (error) {
    console.error("Poster error:", error);
    res.status(500).send("Error generating poster");
  }
};