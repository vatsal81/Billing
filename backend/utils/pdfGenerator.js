const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');


const drawBillOnPage = async (doc, bill, settings, gujaratiFont) => {
    // Generate UPI QR Code Data
    let qrDataUrl = null;
    try {
        const upiId = settings.upiId || "9924387087@okbizaxis";
        const shopName = settings.shopName || "Shree Hari Dresses";
        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${bill.actualTotal}&cu=INR`;
        qrDataUrl = await QRCode.toDataURL(upiUrl);
    } catch (err) {
        console.error("QR Generation error:", err);
    }

    const startX = 30;
    const startY = 30;
    const width = 535;
    const height = 780;

    // Background color
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#fff9e6');
    
    // BLUE LINE COLOR
    const lineColor = '#0f3c88'; 
    doc.strokeColor(lineColor);
    doc.fillColor('black');

    // Main Outer Border
    doc.lineWidth(1).rect(startX, startY, width, height).stroke();

    // 1. HEADER SECTION
    doc.rect(startX, startY, 160, 80).stroke();
    doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('TAX INVOICE', startX + 5, startY + 8, { width: 150, align: 'center' });
    doc.text('CASH / DEBIT', startX + 5, startY + 20, { width: 150, align: 'center' });
    
    doc.font('Helvetica').fontSize(8).fillColor('black');
    doc.text('Original :', startX + 8, startY + 38);
    doc.text('Duplicate :', startX + 90, startY + 38);
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(`GSTIN - ${settings.gstin || '24BRNPM8073Q1ZU'}`, startX + 8, startY + 52);
    doc.font('Helvetica').fontSize(8);
    doc.text(settings.stateInfo || 'State : Gujarat    Code : 24', startX + 8, startY + 65);

    // Right Box (Shop Name)
    doc.rect(startX + 160, startY, width - 160, 80).stroke();
    
    // MANUAL SHOP NAME PLACEMENT
    const shopX = startX + 160 + (width - 160) / 2;
    doc.fillColor('#0f3c88').fontSize(26);
    
    // Split: "શ્રી હરિ ડ્રેસીસ" & "કટપીસ"
    doc.font(gujaratiFont).text('શ્રી હરિ ડ્રેસીસ', startX + 170, startY + 10, { width: 165, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(22).text('&', startX + 342, startY + 14); // Slightly smaller and lower for better alignment
    doc.font(gujaratiFont).fontSize(26).text('કટપીસ', startX + 365, startY + 10, { width: 140, align: 'left' });
    
    doc.fillColor('black').font('Helvetica-Bold').fontSize(9);
    doc.text('Wholesale & Retail', startX + 165, startY + 42, { width: 360, align: 'center' });
    
    doc.font(gujaratiFont).fontSize(9);
    doc.text(settings.shopAddress || 'માધવ પાર્ક ૧, શ્રી હરિ કોમ્પલેક્ષની બાજુમાં, આલાપ રોયલ પામની પાછળ, બાપાસીતારામ ચોક, મવડી, રાજકોટ - ૩૬૦ ૦૦૪.', startX + 165, startY + 52, { width: 360, align: 'center' });

    // 2. CUSTOMER DETAILS SECTION
    doc.rect(startX, startY + 80, 340, 80).stroke(); 
    doc.rect(startX + 340, startY + 80, width - 340, 80).stroke();

    // Customer Info
    doc.fontSize(11).font(gujaratiFont).fillColor('black');
    doc.text('મે. :', startX + 10, startY + 90);
    
    const displayName = bill.customerNameGujarati || (bill.customerName || '');
    doc.fillColor('#0f3c88').text(displayName, startX + 45, startY + 90);
    
    if (bill.customerNameGujarati && bill.customerName) {
        doc.fontSize(9).font('Helvetica').fillColor('black');
        // FIXED OFFSET TO PREVENT OVERLAP
        doc.text(`(${bill.customerName})`, startX + 210, startY + 92);
    }
    
    doc.strokeColor(lineColor).moveTo(startX + 40, startY + 104).lineTo(startX + 330, startY + 104).dash(1, { space: 2 }).stroke().undash();

    doc.fontSize(11).font(gujaratiFont).fillColor('black').text('એડ્રેસ :', startX + 10, startY + 115);
    const displayAddress = bill.customerAddressGujarati || bill.customerAddress || '';
    doc.fillColor('#0f3c88').text(displayAddress, startX + 55, startY + 115);
    doc.strokeColor(lineColor).moveTo(startX + 50, startY + 129).lineTo(startX + 330, startY + 129).dash(1, { space: 2 }).stroke().undash();

    doc.fontSize(9).font('Helvetica').fillColor('black').text(`GSTIN : ${bill.customerGstin || ''}`, startX + 10, startY + 145);
    doc.text('State : Gujarat', startX + 160, startY + 145);
    doc.text('Code : 24', startX + 260, startY + 145);

    // Bill Info (Right)
    doc.fontSize(11).font(gujaratiFont);
    doc.text('બુક નં. :', startX + 350, startY + 90);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#c00').text(String(Math.floor((bill.serialNumber - 1) / 100) + 1).padStart(2, '0'), startX + 420, startY + 89);
    
    doc.fillColor('black').font(gujaratiFont).text('બીલ નં. :', startX + 350, startY + 110);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#c00').text(String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0'), startX + 420, startY + 109);
    
    doc.fillColor('black').font(gujaratiFont).text('તા. :', startX + 350, startY + 135);
    const dateStr = new Date(bill.createdAt).toLocaleDateString('en-IN', {day: '2-digit', month: '2-digit', year: '2-digit'}).replace(/\//g, '-');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f3c88').text(dateStr, startX + 420, startY + 135);

    // 3. TABLE SECTION
    const tableY = startY + 160;
    doc.strokeColor(lineColor).rect(startX, tableY, width, 400).stroke(); 

    doc.moveTo(startX + 230, tableY).lineTo(startX + 230, tableY + 400).stroke(); 
    doc.moveTo(startX + 290, tableY).lineTo(startX + 290, tableY + 400).stroke(); 
    doc.moveTo(startX + 350, tableY).lineTo(startX + 350, tableY + 400).stroke(); 
    doc.moveTo(startX + 430, tableY).lineTo(startX + 430, height + startY).stroke(); 

    doc.moveTo(startX, tableY + 30).lineTo(startX + width, tableY + 30).stroke();

    doc.fontSize(10).fillColor('black');
    doc.font(gujaratiFont).text('માલની વિગત', startX + 5, tableY + 10, { width: 220, align: 'center' });
    doc.font('Helvetica-Bold').text('HSN Code', startX + 230, tableY + 10, { width: 60, align: 'center' });
    doc.font(gujaratiFont).text('નંગ / મીટર', startX + 290, tableY + 10, { width: 60, align: 'center' });
    doc.font(gujaratiFont).text('ભાવ', startX + 350, tableY + 10, { width: 80, align: 'center' });
    doc.font(gujaratiFont).text('રકમ રૂ.', startX + 430, tableY + 10, { width: 105, align: 'center' });

    // Items
    let y = tableY + 40;
    doc.fontSize(11).fillColor('#0f3c88');
    let totalQty = 0;
    bill.items.forEach(item => {
        doc.font(gujaratiFont).text(item.name, startX + 10, y);
        doc.font('Helvetica').text(item.hsn || '6211', startX + 230, y, { width: 60, align: 'center' });
        doc.text(item.quantity.toString(), startX + 290, y, { width: 60, align: 'center' });
        doc.text(item.price.toFixed(0), startX + 350, y, { width: 70, align: 'right' });
        doc.text((item.price * item.quantity).toFixed(0), startX + 430, y, { width: 95, align: 'right' });
        totalQty += item.quantity;
        y += 22;
    });

    if (totalQty > 0) {
        doc.strokeColor(lineColor).lineWidth(1).moveTo(startX + 290, y + 2).lineTo(startX + 350, y + 2).stroke();
        doc.fontSize(14).font('Helvetica-Bold').fillColor('black').text(totalQty.toString(), startX + 290, y + 8, { width: 60, align: 'center' });
    }

    // 4. FOOTER SECTION
    const footerY = tableY + 400;
    doc.strokeColor(lineColor).rect(startX, footerY, 340, height - (footerY - startY)).stroke(); 
    doc.rect(startX + 340, footerY, width - 340, height - (footerY - startY)).stroke(); 

    if (qrDataUrl) {
        doc.image(qrDataUrl, startX + 15, footerY + 15, { width: 80 });
    }

    doc.fontSize(20).fillColor('#0f3c88').font('Helvetica-Bold').text('GPay / PhonePe', startX + 110, footerY + 25);
    doc.fontSize(16).text(`${bill.actualTotal}-only`, startX + 110, footerY + 55);
    doc.strokeColor(lineColor).moveTo(startX + 110, footerY + 50).lineTo(startX + 300, footerY + 50).stroke();
    doc.moveTo(startX + 110, footerY + 75).lineTo(startX + 300, footerY + 75).stroke();

    doc.fontSize(8).fillColor('black').font(gujaratiFont);
    doc.text('ટર્મ્સ એન્ડ કન્ડીશન :', startX + 10, height + startY - 45);
    doc.text('૧. ન્યાયક્ષેત્ર રાજકોટ રહેશે.', startX + 10, height + startY - 35);
    doc.text('૨. ભૂલચૂક લેવી દેવી.', startX + 10, height + startY - 25);

    const calcWidth = width - 340;
    const calcCol1 = 85;
    const rowH = 18;
    let cy = footerY;

    const drawCalcRow = (gujLabel, engLabel, val) => {
        doc.fillColor('black');
        if (gujLabel) {
            doc.fontSize(8).font(gujaratiFont).text(gujLabel, startX + 345, cy + 5, { continued: true });
            doc.font('Helvetica').text(` (${engLabel})`, { continued: false });
        } else {
            doc.fontSize(8).font('Helvetica').text(engLabel, startX + 345, cy + 5);
        }
        doc.fontSize(10).fillColor('#0f3c88').font('Helvetica').text(val ? val + " -" : " -", startX + 340 + calcCol1, cy + 4, { width: calcWidth - calcCol1 - 5, align: 'right' });
        doc.strokeColor(lineColor).moveTo(startX + 340, cy + rowH).lineTo(startX + width, cy + rowH).stroke();
        cy += rowH;
    };

    drawCalcRow('સબટોટલ', 'Subtotal', bill.totalAmount.toFixed(0));
    drawCalcRow('', 'CGST 2.5%', bill.cgst.toFixed(2));
    drawCalcRow('', 'SGST 2.5%', bill.sgst.toFixed(2));
    drawCalcRow('', 'IGST %', '');
    drawCalcRow('સબટોટલ', 'Subtotal', (bill.totalAmount + bill.cgst + bill.sgst).toFixed(0));
    drawCalcRow('રાઉન્ડ ઓફ', 'RO', (bill.roundOff || 0).toFixed(0));

    const finalTotal = bill.actualTotal || 0;
    doc.fontSize(12).font(gujaratiFont).fillColor('black').text('કુલ', startX + 345, cy + 8, { continued: true });
    doc.font('Helvetica-Bold').text(' (Total)');
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#c00').text(`${finalTotal}/-`, startX + 340 + calcCol1, cy + 7, { width: calcWidth - calcCol1 - 5, align: 'right' });

    doc.save();
    doc.rotate(-8, { origin: [startX + 480, height + startY - 40] });
    // Positioned at the very bottom right to avoid all internal table lines
    const stampBoxX = startX + 435;
    const stampBoxY = height + startY - 55;
    doc.rect(stampBoxX, stampBoxY, 95, 25).lineWidth(1.5).strokeColor('#0f3c88').opacity(0.4).stroke();
    
    doc.fontSize(7).fillColor('#0f3c88');
    doc.font(gujaratiFont).text('શ્રી હરિ ડ્રેસીસ', stampBoxX + 2, stampBoxY + 8, { width: 50, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(6).text('&', stampBoxX + 54, stampBoxY + 10);
    doc.font(gujaratiFont).fontSize(7).text('કટપીસ', stampBoxX + 62, stampBoxY + 8, { width: 30, align: 'left' });
    doc.restore();

    doc.fontSize(9).fillColor('black').font('Helvetica').text('Shree Hari Dresses & Cutpiece', startX + 340, height + startY - 20, { width: calcWidth, align: 'center' });
};

const generateBillPdf = async (billOrBills, settings) => {
    const isArray = Array.isArray(billOrBills);
    const bills = isArray ? billOrBills : [billOrBills];

    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 0, size: 'A4' });
            
            // Highly robust font loading sequence
            const notoPath = path.resolve(__dirname, 'NotoSansGujarati-Regular.ttf');
            const lohitPath = path.resolve(__dirname, 'Lohit-Gujarati.ttf');
            const kalamPath = path.resolve(__dirname, 'Kalam-Regular.ttf');
            
            let mainFont = 'Helvetica';
            
            try {
                if (fs.existsSync(notoPath)) {
                    doc.registerFont('GujaratiFont', notoPath);
                    mainFont = 'GujaratiFont';
                } else if (fs.existsSync(lohitPath)) {
                    doc.registerFont('GujaratiFont', lohitPath);
                    mainFont = 'GujaratiFont';
                } else if (fs.existsSync(kalamPath)) {
                    doc.registerFont('GujaratiFont', kalamPath);
                    mainFont = 'GujaratiFont';
                }
            } catch (err) {
                console.error("Font registration failed:", err);
                mainFont = 'Helvetica';
            }
            
            doc.font(mainFont);

            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('error', (err) => reject(err));
            doc.on('end', () => {
                let pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            for (let i = 0; i < bills.length; i++) {
                if (i > 0) doc.addPage();
                try {
                    await drawBillOnPage(doc, bills[i], settings, mainFont);
                } catch (drawErr) {
                    console.error(`Error drawing bill ${i}:`, drawErr);
                    // Continue to next bill if one fails, or decide to fail all
                }
            }

            doc.end();
        } catch (err) {
            console.error("PDF Generation Final Error:", err);
            reject(err);
        }
    });
};

module.exports = { generateBillPdf };
