const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { numberToWords } = require('./numberToWords');
const Settings = require('../models/Settings');

const formatDate = (date) => date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'N/A';

const generatePurchaseReportPdf = async (bills, month, year) => {
    const settings = await Settings.findOne().lean() || {};

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

        // Header - Supplier Info
        doc.fillColor('#1e3a8a').fontSize(24).font('Helvetica-Bold').text(bill.supplierName || 'SUPPLIER', { align: 'left' });
        doc.fontSize(10).fillColor('#3b82f6').text('PURCHASE INVOICE', { align: 'left' });
        doc.fillColor('#64748b').fontSize(10).text(bill.supplierAddress || '', { align: 'left' });
        doc.fillColor('#0f172a').text(`GSTIN: ${bill.supplierGstin || 'N/A'}`, { align: 'left' });

        // Header - Metadata (Right)
        const top = 40;
        doc.fillColor('#1e3a8a').fontSize(14).font('Helvetica-Bold').text('OFFICIAL RECORD', 400, top, { align: 'right' });
        doc.fontSize(10).fillColor('#64748b').text(`Date: ${formatDate(bill.billDate)}`, 400, top + 20, { align: 'right' });
        doc.text(`Invoice: #${bill.billNumber}`, 400, top + 35, { align: 'right' });
        doc.text(`Transport: ${bill.transport || 'N/A'}`, 400, top + 50, { align: 'right' });

        doc.moveDown(2);
        const yStart = doc.y;

        // Recipient Section
        doc.rect(40, yStart, 250, 70).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('BILLED TO (RECIPIENT)', 50, yStart + 10);
        doc.fillColor('#1e3a8a').fontSize(12).text(settings.shopName || 'SHREE HARI DRESSES', 50, yStart + 25);
        doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(settings.shopAddress || 'MAVDI, RAJKOT', 50, yStart + 40);

        // Logistics Section
        doc.rect(300, yStart, 255, 70).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('LOGISTICS', 310, yStart + 10);
        doc.fillColor('#1e3a8a').fontSize(10).text(`L R No: ${bill.lrNo || 'N/A'}`, 310, yStart + 25);
        doc.text(`Broker: ${bill.broker || 'DIRECT'}`, 310, yStart + 40);

        doc.moveDown(4);

        // Table
        const tableTop = doc.y;
        doc.fillColor('#f8fafc').rect(40, tableTop, 515, 20).fill();
        doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold');
        doc.text('SR', 45, tableTop + 5);
        doc.text('Product Description', 80, tableTop + 5);
        doc.text('PCS', 300, tableTop + 5);
        doc.text('Meters', 350, tableTop + 5);
        doc.text('Rate', 420, tableTop + 5, { align: 'right', width: 50 });
        doc.text('Amount', 490, tableTop + 5, { align: 'right', width: 60 });

        let itemY = tableTop + 20;
        doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
        
        bill.items.forEach((item, idx) => {
            doc.text(idx + 1, 45, itemY + 5);
            doc.text(item.name || '', 80, itemY + 5);
            doc.text(item.pcs || 0, 300, itemY + 5);
            doc.text(item.meters || 0, 350, itemY + 5);
            doc.text(`₹${(item.rate || 0).toFixed(2)}`, 420, itemY + 5, { align: 'right', width: 50 });
            doc.text(`₹${(item.amount || 0).toFixed(2)}`, 490, itemY + 5, { align: 'right', width: 60 });
            itemY += 20;
        });

        // Summary
        const summaryY = Math.max(itemY + 20, 400);
        doc.font('Helvetica-Bold').fillColor('#64748b');
        doc.text('Subtotal:', 400, summaryY);
        doc.text(`₹${bill.subTotal.toFixed(2)}`, 490, summaryY, { align: 'right', width: 60 });
        
        doc.text('GST (5%):', 400, summaryY + 15);
        doc.text(`₹${(bill.totalAmount - bill.subTotal - (bill.roundOff || 0)).toFixed(2)}`, 490, summaryY + 15, { align: 'right', width: 60 });

        doc.fillColor('#1e3a8a').fontSize(14).text('TOTAL:', 400, summaryY + 40);
        doc.text(`₹${bill.totalAmount.toLocaleString('en-IN')}`, 490, summaryY + 40, { align: 'right', width: 60 });

        // Amount in Words
        doc.fillColor('#94a3b8').fontSize(8).text('Amount in Words:', 40, summaryY);
        doc.fillColor('#1e293b').fontSize(10).text(`${numberToWords(bill.totalAmount)} ONLY`, 40, summaryY + 15, { width: 300 });

        // E-Way Bill (Simplified)
        if (bill.ewayBillDetails?.uniqueNo) {
            doc.addPage();
            doc.fillColor('#1e3a8a').fontSize(20).text('E-WAY BILL SLIP', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).fillColor('#0f172a').text(`Unique No: ${bill.ewayBillDetails.uniqueNo}`);
            doc.text(`Entered Date: ${bill.ewayBillDetails.enteredDate}`);
            doc.text(`Supplier GSTIN: ${bill.ewayBillDetails.supplierGstin}`);
            doc.text(`Recipient GSTIN: ${bill.ewayBillDetails.recipientGstin}`);
            doc.text(`Value of Goods: ₹${bill.ewayBillDetails.valueOfGoods?.toLocaleString('en-IN')}`);
        }
    }

    doc.end();

    return new Promise((resolve, reject) => {
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);
    });
};

const generateSingleBillPdf = (bill) => generatePurchaseReportPdf([bill], null, null);

module.exports = { generatePurchaseReportPdf, generateSingleBillPdf };
