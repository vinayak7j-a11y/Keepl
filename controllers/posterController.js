const PDFDocument = require("pdfkit");
const Shop = require("../models/Shop");

exports.downloadPoster = async (req, res) => {

  try {

    const { shopId } = req.params;

    const shop = await Shop.findOne({ shopId });

    if (!shop) {
      return res.send("Shop not found");
    }

    const doc = new PDFDocument({
      size: "A4",
      margin: 50
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${shop.name}-QR.pdf`
    );

    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Title
    doc
      .fontSize(28)
      .text(shop.name, { align: "center" });

    doc.moveDown();

    doc
      .fontSize(20)
      .text("Scan to Earn Rewards", { align: "center" });

    doc.moveDown(2);

    // QR Code
    const qrImage = shop.qrCode;

    doc.image(qrImage, {
      fit: [250, 250],
      align: "center"
    });

    doc.moveDown(2);

    doc
      .fontSize(14)
      .text("Powered by Keepl", { align: "center" });

    doc.end();

  } catch (error) {

    console.error(error);
    res.send("Error generating poster");

  }

};