const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const formatDate = (date) => 
    date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

const generateBillPdf = async (billOrBills, settings = {}) => {
    const isArray = Array.isArray(billOrBills);
    const bills = isArray ? billOrBills : [billOrBills];

    // Create a document
    const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    for (let i = 0; i < bills.length; i++) {
        const bill = bills[i];
        if (i > 0) doc.addPage();

        const bookNum = bill.serialNumber ? String(Math.floor((bill.serialNumber - 1) / 100) + 1).padStart(2, '0') : '01';
        const billNum = bill.serialNumber ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') : bill._id.substring(bill._id.length - 4).toUpperCase();

        // Header - Shop Info
        doc.fillColor('#1e3a8a').fontSize(24).font('Helvetica-Bold').text(settings.shopName || 'SHREE HARI DRESSES', { align: 'left' });
        doc.fontSize(10).fillColor('#3b82f6').text('Wholesale & Retail Market', { align: 'left' });
        doc.fillColor('#64748b').fontSize(10).text(settings.shopAddress || 'MAVDI, RAJKOT - 360 004', { align: 'left' });
        doc.fillColor('#0f172a').text(`GSTIN: ${settings.gstin || '24BRNPM8073Q1ZU'}`, { align: 'left' });

        // Header - Bill Meta (Right Side)
        const top = 40;
        doc.fillColor('#1e3a8a').fontSize(14).font('Helvetica-Bold').text(`TAX INVOICE`, 400, top, { align: 'right' });
        doc.fontSize(10).fillColor('#64748b').text(`Date: ${formatDate(bill.createdAt)}`, 400, top + 20, { align: 'right' });
        doc.text(`Bill No: #${billNum}`, 400, top + 35, { align: 'right' });
        doc.text(`Status: ${bill.status?.toUpperCase() || 'PAID'}`, 400, top + 50, { align: 'right' });

        doc.moveDown(2);
        const yStart = doc.y;

        // Billed To Section
        doc.rect(40, yStart, 250, 80).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('BILLED TO', 50, yStart + 10);
        doc.fillColor('#1e3a8a').fontSize(12).text(bill.customerName || 'Cash Customer', 50, yStart + 25);
        doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(bill.customerAddress || 'Walk-in Customer', 50, yStart + 40);
        doc.text(`Phone: ${bill.customerPhone || 'N/A'}`, 50, yStart + 55);

        // Payment Info Section
        doc.rect(300, yStart, 255, 80).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('PAYMENT INFO', 310, yStart + 10);
        doc.fillColor('#1e3a8a').fontSize(10).text(`Method: ${bill.paymentMode?.toUpperCase() || 'CASH'}`, 310, yStart + 25);
        doc.text('Place of Supply: Gujarat (24)', 310, yStart + 40);

        doc.moveDown(4);

        // Items Table
        const tableTop = doc.y;
        doc.fillColor('#f8fafc').rect(40, tableTop, 515, 25).fill();
        doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold');
        doc.text('SR', 45, tableTop + 8);
        doc.text('Product Description', 80, tableTop + 8);
        doc.text('Qty', 350, tableTop + 8);
        doc.text('Rate', 420, tableTop + 8, { align: 'right', width: 50 });
        doc.text('Amount', 490, tableTop + 8, { align: 'right', width: 60 });

        let itemY = tableTop + 25;
        doc.font('Helvetica').fontSize(10).fillColor('#0f172a');
        
        bill.items.forEach((item, idx) => {
            doc.text(idx + 1, 45, itemY + 8);
            doc.text(item.name, 80, itemY + 8);
            doc.text(item.quantity, 350, itemY + 8);
            doc.text(`₹${item.price.toFixed(2)}`, 420, itemY + 8, { align: 'right', width: 50 });
            doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 490, itemY + 8, { align: 'right', width: 60 });
            
            doc.moveTo(40, itemY + 25).lineTo(555, itemY + 25).strokeColor('#e2e8f0').stroke();
            itemY += 25;
        });

        // Totals
        const totalsY = itemY + 20;
        doc.font('Helvetica-Bold').fillColor('#64748b');
        doc.text('Subtotal:', 400, totalsY);
        doc.text(`₹${bill.totalAmount.toFixed(2)}`, 490, totalsY, { align: 'right', width: 60 });
        
        doc.text('GST (5%):', 400, totalsY + 20);
        doc.text(`₹${(bill.cgst + bill.sgst).toFixed(2)}`, 490, totalsY + 20, { align: 'right', width: 60 });

        doc.fillColor('#1e3a8a').fontSize(14).text('TOTAL:', 400, totalsY + 45);
        doc.text(`₹${bill.actualTotal.toLocaleString('en-IN')}`, 490, totalsY + 45, { align: 'right', width: 60 });

        // QR Code
        try {
            const upiId = settings.upiId || "9924387087@okbizaxis";
            const shopName = settings.shopName || "Shree Hari Dresses";
            const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${bill.actualTotal}&cu=INR`;
            const qrDataUrl = await QRCode.toDataURL(upiUrl);
            doc.image(qrDataUrl, 40, totalsY, { width: 80 });
            doc.fontSize(8).fillColor('#64748b').text('Scan to Pay', 40, totalsY + 85);
        } catch (e) {}

        // Footer
        doc.fontSize(8).fillColor('#94a3b8').text(`Generated on ${new Date().toLocaleString('en-IN')}`, 40, 780, { align: 'center', width: 515 });
    }

    doc.end();

    return new Promise((resolve, reject) => {
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);
    });
};

module.exports = { generateBillPdf };
