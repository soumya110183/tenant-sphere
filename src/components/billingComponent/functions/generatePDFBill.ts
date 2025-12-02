import jsPDF from "jspdf";

export const generatePDFBill = (
  invoiceNumber: string,
  serverItems: any[],
  finalAmount: number,
  paymentMethod: string
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 297],
  });

  const date = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const paymentMethodDisplay: Record<string, string> = {
    cash: "CASH",
    card: "CARD",
    upi: "UPI",
    credit: "CREDIT",
  };

  let y = 10;

  // Top border stars
  doc.setFontSize(10);
  doc.setFont("courier", "normal");
  doc.text("********************************", 40, y, { align: "center" });
  y += 5;

  // Store name
  doc.setFontSize(16);
  doc.setFont("courier", "bold");
  doc.text("SUPERMART", 40, y, { align: "center" });
  y += 5;

  // Bottom border stars
  doc.setFontSize(10);
  doc.setFont("courier", "normal");
  doc.text("********************************", 40, y, { align: "center" });
  y += 6;

  // Invoice number and timestamp
  doc.setFontSize(9);
  doc.text(`Invoice No: ${invoiceNumber}`, 5, y);
  y += 4;
  doc.text(`Date: ${date} ${time}`, 5, y);
  y += 4;

  // Dashed line
  doc.text("----------------------------------------", 5, y);
  y += 6;

  // Items
  doc.setFont("courier", "normal");
  doc.setFontSize(10);

  serverItems.forEach((item) => {
    const itemLine = `${item.quantity}x ${item.name || "Item"}`;
    const priceLine = `AED ${Number(
      item.total ?? item.net_price ?? 0
    ).toFixed(2)}`;

    doc.text(itemLine, 5, y);
    doc.text(priceLine, 75, y, { align: "right" });
    y += 5;
  });

  // Dashed line before totals
  y += 2;
  doc.setFontSize(9);
  doc.text("----------------------------------------", 5, y);
  y += 6;

  // Total amount from server
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL:", 40, y, { align: "right" });
  doc.text(`AED ${Number(finalAmount).toFixed(2)}`, 75, y, {
    align: "right",
  });
  y += 6;

  // Payment method
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.text("Payment Method:", 5, y);
  doc.text(
  (paymentMethodDisplay[paymentMethod] || paymentMethod || "CASH")
    .toString()
    .toUpperCase(),
  75,
  y,
  { align: "right" }
);

  y += 5;

  // Dashed line
  doc.setFontSize(9);
  doc.text("----------------------------------------", 5, y);
  y += 6;

  // Thank you message
  doc.setFontSize(10);
  doc.setFont("courier", "bold");
  doc.text("********* THANK YOU! *********", 40, y, {
    align: "center",
  });
  y += 8;

  // Simple barcode simulation
  doc.setLineWidth(0.5);
  const barcodeY = y;
  const barcodeWidth = 60;
  const barcodeStart = (80 - barcodeWidth) / 2;

  for (let i = 0; i < 40; i++) {
    const lineWidth = Math.random() > 0.5 ? 1 : 0.5;
    doc.setLineWidth(lineWidth);
    doc.line(
      barcodeStart + i * 1.5,
      barcodeY,
      barcodeStart + i * 1.5,
      barcodeY + 15
    );
  }

  doc.save(`receipt-${invoiceNumber}.pdf`);
};