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

    /* ── FULL PAGE LAYOUT PLAN ──
       0   - 155  : orange top band
       155 - 789  : white card (634px tall)
       789 - 841  : dark footer
    ── */

    // Background
    doc.rect(0, 0, W, H).fill("#F7F6F2");
    doc.rect(0, 0, W, 155).fill("#FF6B00");
    doc.rect(0, 789, W, 52).fill("#1A1A2E");

    /* ── TOP BAND ── */
    doc.fontSize(36).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text("keepl.", 0, 20, { align: "center", width: W });

    doc.fontSize(10).fillColor("rgba(255,255,255,0.7)").font("Helvetica")
      .text("LOYALTY SIMPLIFIED", 0, 63, { align: "center", width: W, characterSpacing: 3 });

    doc.moveTo(W/2-40, 80).lineTo(W/2+40, 80)
      .strokeColor("rgba(255,255,255,0.3)").lineWidth(0.5).stroke();

    doc.fontSize(20).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text(shop.name, 48, 88, { align: "center", width: W - 96 });

    doc.fontSize(10.5).fillColor("rgba(255,255,255,0.75)").font("Helvetica")
      .text("Scan below to earn reward points on every visit", 0, 118, { align: "center", width: W });

    /* ── WHITE CARD ── */
    const cardX = 32;
    const cardY = 142;
    const cardW = W - 64;
    const cardH = 648; // fills to 790

    doc.roundedRect(cardX+2, cardY+3, cardW, cardH, 16).fill("rgba(26,26,46,0.05)");
    doc.roundedRect(cardX, cardY, cardW, cardH, 16).fill("#FFFFFF");
    doc.roundedRect(cardX, cardY, cardW, 4, 2).fill("#FF6B00");

    /* ── QR CODE ── */
    const qrSize = 140;
    const qrX = (W - qrSize) / 2;
    const qrY = cardY + 18;

    doc.roundedRect(qrX-10, qrY-10, qrSize+20, qrSize+20, 12).fill("#E0F2F0");
    doc.roundedRect(qrX-4, qrY-4, qrSize+8, qrSize+8, 8).fill("#FFFFFF");

    [[qrX-10,qrY-10],[qrX+qrSize-6,qrY-10],[qrX-10,qrY+qrSize-6],[qrX+qrSize-6,qrY+qrSize-6]]
      .forEach(([cx,cy]) => doc.roundedRect(cx, cy, 16, 16, 4).fill("#FF6B00"));

    try {
      doc.image(shop.qrCode, qrX, qrY, { fit: [qrSize, qrSize] });
    } catch(e) {
      doc.fontSize(11).fillColor("#EF4444").text("QR unavailable", { align: "center" });
    }

    // SCAN ME
    const scanW = 90;
    const scanX = (W - scanW) / 2;
    const scanY = qrY + qrSize + 8;
    doc.roundedRect(scanX, scanY, scanW, 20, 10).fill("#FF6B00");
    doc.fontSize(9.5).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text("SCAN ME", scanX, scanY+6, { align: "center", width: scanW, characterSpacing: 1.5 });

    /* ── POINTS PILL ── */
    const pillY = scanY + 28;
    doc.roundedRect(cardX+14, pillY, cardW-28, 28, 14).fill("#FFF0E6");
    doc.fontSize(11).fillColor("#C24E00").font("Helvetica-Bold")
      .text(`10 pts per Rs.100   |   ${rewardThreshold} pts = FREE reward`,
        cardX+14, pillY+9, { align: "center", width: cardW-28 });

    /* ── HOW IT WORKS ── */
    const howY = pillY + 40;
    doc.fontSize(9).fillColor("#9090A8").font("Helvetica")
      .text("HOW IT WORKS", 0, howY, { align: "center", width: W, characterSpacing: 2 });

    const steps = [
      { num: "1", title: "Scan the QR code", desc: "Open your camera and point it at the QR above" },
      { num: "2", title: "Enter your details", desc: "Type your name and phone number — only once ever" },
      { num: "3", title: "Earn points on every bill", desc: "Shopkeeper adds your points after each payment" },
      { num: "4", title: "Redeem your free reward", desc: `Collect ${rewardThreshold} points and ask the shopkeeper` },
    ];

    const stepStartY = howY + 14;
    const stepH = 42;
    const stepGap = 7;

    steps.forEach((step, i) => {
      const y = stepStartY + i * (stepH + stepGap);
      const bx = cardX + 12;
      const bw = cardW - 24;

      doc.roundedRect(bx, y, bw, stepH, 8).fill(i % 2 === 0 ? "#F7F6F2" : "#FFFFFF");
      doc.circle(bx+20, y+stepH/2, 13).fill("#FF6B00");
      doc.fontSize(11).fillColor("#FFFFFF").font("Helvetica-Bold")
        .text(step.num, bx+14, y+stepH/2-6, { width: 12, align: "center" });

      if (i < steps.length - 1) {
        doc.moveTo(bx+20, y+stepH).lineTo(bx+20, y+stepH+stepGap)
          .strokeColor("#FFD4B3").lineWidth(1.5).stroke();
      }

      doc.fontSize(11.5).fillColor("#1A1A2E").font("Helvetica-Bold")
        .text(step.title, bx+42, y+8);
      doc.fontSize(9.5).fillColor("#9090A8").font("Helvetica")
        .text(step.desc, bx+42, y+24);
    });

    /* ── WHY JOIN ── */
    const whyY = stepStartY + steps.length * (stepH + stepGap) + 16;
    doc.fontSize(9).fillColor("#9090A8").font("Helvetica")
      .text("WHY JOIN?", 0, whyY, { align: "center", width: W, characterSpacing: 2 });

    const benefits = [
      "No app download needed — just scan and go",
      "Points never expire at this shop",
      "Get a WhatsApp confirmation after every visit",
    ];

    const benefitH = 22;
    const benefitsStartY = whyY + 14;

    benefits.forEach((b, i) => {
      const y = benefitsStartY + i * benefitH;
      const bx = cardX + 20;

      doc.roundedRect(bx, y, cardW-40, benefitH-2, 6)
        .fill(i % 2 === 0 ? "#F7F6F2" : "#FFFFFF");
      doc.circle(bx+10, y+10, 4).fill("#00796B");
      doc.fontSize(10.5).fillColor("#1A1A2E").font("Helvetica")
        .text(b, bx+22, y+5);
    });

    /* ── FOOTER ── */
    doc.fontSize(14).fillColor("#FFFFFF").font("Helvetica-Bold")
      .text("keepl.", 0, 800, { align: "center", width: W });
    doc.fontSize(8).fillColor("rgba(255,255,255,0.4)").font("Helvetica")
      .text("Turn every visit into a reward", 0, 819, { align: "center", width: W, characterSpacing: 0.5 });

    doc.end();

  } catch (error) {
    console.error("Poster error:", error);
    res.status(500).send("Error generating poster");
  }
};