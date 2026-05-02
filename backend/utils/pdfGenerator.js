const puppeteer = require('puppeteer-core');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const formatDate = (date) => 
    date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

const buildBillHTML = async (bill, settings = {}) => {
    // Generate UPI QR Code Data
    let qrDataUrl = '';
    try {
        const upiId = settings.upiId || "9924387087@okbizaxis";
        const shopName = settings.shopName || "Shree Hari Dresses";
        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${bill.actualTotal}&cu=INR`;
        qrDataUrl = await QRCode.toDataURL(upiUrl);
    } catch (err) {
        console.error("QR Generation error:", err);
    }

    const itemRows = bill.items.map((item, idx) => `
        <tr>
            <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; color: #64748b;">${idx + 1}</td>
            <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 500;">${item.name}</td>
            <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; color: #64748b;">${item.hsn || '6211'}</td>
            <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-weight: 600;">${item.quantity}</td>
            <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right; color: #64748b;">₹${item.price.toFixed(2)}</td>
            <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right; font-weight: 700; background: #f8fafc;">₹${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');

    const emptyRowsCount = Math.max(0, 10 - bill.items.length);
    const emptyRowsHTML = Array(emptyRowsCount).fill(0).map(() => `
        <tr style="height: 35px;">
            <td style="border: 1px solid #f1f5f9;"></td>
            <td style="border: 1px solid #f1f5f9;"></td>
            <td style="border: 1px solid #f1f5f9;"></td>
            <td style="border: 1px solid #f1f5f9;"></td>
            <td style="border: 1px solid #f1f5f9;"></td>
            <td style="border: 1px solid #f1f5f9; background: #f8fafc;"></td>
        </tr>
    `).join('');

    const bookNum = bill.serialNumber ? String(Math.floor((bill.serialNumber - 1) / 100) + 1).padStart(2, '0') : '01';
    const billNum = bill.serialNumber ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') : bill._id.substring(bill._id.length - 4).toUpperCase();

    return `
<!DOCTYPE html>
<html lang="gu">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Noto+Sans+Gujarati:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #1e3a8a;
            --accent: #3b82f6;
            --text-dark: #0f172a;
            --text-muted: #64748b;
            --bg-light: #f8fafc;
            --border: #e2e8f0;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Outfit', 'Noto Sans Gujarati', sans-serif; 
            padding: 40px;
            color: var(--text-dark);
            background: #fff;
            line-height: 1.5;
        }
        .bill-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid var(--primary);
            padding: 24px;
            position: relative;
            background: #fff;
            box-shadow: 0 0 40px rgba(0,0,0,0.05);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid var(--primary);
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .shop-info { flex: 2; }
        .tax-invoice-badge {
            background: var(--primary);
            color: white;
            padding: 6px 16px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 4px;
            display: inline-block;
            margin-bottom: 12px;
            border-radius: 4px;
        }
        .shop-name {
            font-size: 32px;
            font-weight: 800;
            color: var(--primary);
            line-height: 1;
            margin-bottom: 4px;
        }
        .shop-subtitle {
            font-size: 14px;
            color: var(--accent);
            font-weight: 600;
            margin-bottom: 8px;
        }
        .shop-address {
            font-size: 11px;
            color: var(--text-muted);
            max-width: 300px;
        }
        .bill-meta {
            flex: 1;
            text-align: right;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .meta-item {
            font-size: 12px;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }
        .meta-label { font-weight: 600; color: var(--text-muted); text-transform: uppercase; font-size: 10px; }
        .meta-value { font-weight: 700; color: var(--primary); }

        .party-details {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
        }
        .party-card {
            background: var(--bg-light);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
        }
        .card-title {
            font-size: 9px;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 4px;
        }
        .party-name {
            font-size: 18px;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 4px;
        }
        .party-info { font-size: 11px; color: var(--text-muted); margin-bottom: 2px; }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            font-size: 12px;
        }
        .items-table th {
            background: var(--bg-light);
            padding: 12px;
            text-align: left;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            border: 1px solid var(--border);
            color: var(--text-muted);
        }
        .items-table td { border: 1px solid var(--border); }

        .footer {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 40px;
        }
        .qr-section {
            display: flex;
            align-items: center;
            gap: 20px;
            background: var(--bg-light);
            padding: 16px;
            border-radius: 12px;
            border: 1px solid var(--border);
        }
        .qr-code { width: 80px; height: 80px; border: 1px solid #fff; border-radius: 8px; }
        .payment-info h4 { font-size: 14px; color: var(--primary); margin-bottom: 4px; }
        .payment-info p { font-size: 10px; color: var(--text-muted); }

        .totals-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
        }
        .total-row.grand-total {
            background: var(--primary);
            color: white;
            padding: 12px;
            border-radius: 8px;
            margin-top: 10px;
            font-weight: 800;
            font-size: 18px;
        }
        .signature-area {
            margin-top: 40px;
            text-align: right;
            padding-right: 20px;
        }
        .signature-line {
            width: 180px;
            border-top: 1px solid var(--primary);
            margin-left: auto;
            margin-top: 60px;
            padding-top: 8px;
            font-size: 10px;
            font-weight: 700;
            color: var(--primary);
        }
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            font-weight: 900;
            color: rgba(30, 58, 138, 0.03);
            white-space: nowrap;
            z-index: -1;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="watermark">SHREE HARI</div>
    
    <div class="bill-container">
        <div class="header">
            <div class="shop-info">
                <div class="tax-invoice-badge">TAX INVOICE</div>
                <h1 class="shop-name">${settings.shopName || 'SHREE HARI DRESSES'}</h1>
                <div class="shop-subtitle">Wholesale & Retail Market</div>
                <div class="shop-address">${settings.shopAddress || 'MAVDI, RAJKOT - 360 004'}</div>
                <div class="party-info" style="margin-top: 8px; font-weight: 700;">GSTIN: ${settings.gstin || '24BRNPM8073Q1ZU'}</div>
            </div>
            <div class="bill-meta">
                <div class="meta-item">
                    <span class="meta-label">Bill Date:</span>
                    <span class="meta-value">${formatDate(bill.createdAt)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Book No:</span>
                    <span class="meta-value">${bookNum}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Bill No:</span>
                    <span class="meta-value" style="font-size: 16px;">#${billNum}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Status:</span>
                    <span class="meta-value" style="color: ${bill.status === 'void' ? '#ef4444' : '#10b981'}">${bill.status?.toUpperCase() || 'PAID'}</span>
                </div>
            </div>
        </div>

        <div class="party-details">
            <div class="party-card">
                <div class="card-title">Billed To (Customer)</div>
                <div class="party-name">${bill.customerNameGujarati || bill.customerName || 'Cash Customer'}</div>
                ${bill.customerNameGujarati && bill.customerName ? `<div class="party-info">(${bill.customerName})</div>` : ''}
                <div class="party-info">${bill.customerAddressGujarati || bill.customerAddress || 'Walk-in Customer'}</div>
                <div class="party-info">Phone: ${bill.customerPhone || 'N/A'}</div>
            </div>
            <div class="party-card">
                <div class="card-title">Payment Info</div>
                <div class="meta-item" style="justify-content: flex-start; margin-top: 8px;">
                    <span class="meta-label">Method:</span>
                    <span class="meta-value" style="text-transform: uppercase;">${bill.paymentMode || 'Cash'}</span>
                </div>
                <div class="meta-item" style="justify-content: flex-start; margin-top: 8px;">
                    <span class="meta-label">Place of Supply:</span>
                    <span class="meta-value">Gujarat (24)</span>
                </div>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 40px; text-align: center;">SR</th>
                    <th>Product Description</th>
                    <th style="width: 80px; text-align: center;">HSN</th>
                    <th style="width: 80px; text-align: center;">Qty</th>
                    <th style="width: 100px; text-align: right;">Rate</th>
                    <th style="width: 120px; text-align: right;">Total Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
                ${emptyRowsHTML}
            </tbody>
        </table>

        <div class="footer">
            <div class="qr-section">
                <img src="${qrDataUrl}" class="qr-code" />
                <div class="payment-info">
                    <h4>Scan to Pay</h4>
                    <p>Easily pay via GPay, PhonePe, or any UPI app.</p>
                    <p style="margin-top: 4px; font-weight: 700; color: var(--text-dark);">${settings.upiId || '9924387087@okbizaxis'}</p>
                </div>
            </div>
            
            <div class="totals-section">
                <div class="total-row">
                    <span class="meta-label">Taxable Value</span>
                    <span class="meta-value">₹${bill.totalAmount.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span class="meta-label">CGST (2.5%)</span>
                    <span class="meta-value">₹${bill.cgst.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span class="meta-label">SGST (2.5%)</span>
                    <span class="meta-value">₹${bill.sgst.toFixed(2)}</span>
                </div>
                ${bill.roundOff ? `
                <div class="total-row">
                    <span class="meta-label">Round Off</span>
                    <span class="meta-value">₹${bill.roundOff.toFixed(2)}</span>
                </div>` : ''}
                <div class="total-row grand-total">
                    <span>TOTAL</span>
                    <span>₹${bill.actualTotal.toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>

        <div class="signature-area">
            ${settings.signature ? `<img src="${settings.signature}" style="height: 60px; margin-bottom: -15px; opacity: 0.8;" />` : ''}
            <div class="signature-line">Authorized Signatory</div>
        </div>
        
        <div style="margin-top: 32px; font-size: 9px; color: var(--text-muted); text-align: center; border-top: 1px dashed var(--border); padding-top: 12px;">
            Thank you for shopping at ${settings.shopName || 'Shree Hari Dresses'}. Visit again!
        </div>
    </div>
</body>
</html>
    `;
};

const generateBillPdf = async (billOrBills, settings) => {
    const isArray = Array.isArray(billOrBills);
    const bills = isArray ? billOrBills : [billOrBills];

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'shell',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    try {
        const page = await browser.newPage();
        const pdfBuffers = [];

        for (const bill of bills) {
            const html = await buildBillHTML(bill, settings);
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' }
            });
            pdfBuffers.push(pdf);
        }

        await browser.close();
        
        // If single bill, return buffer directly. 
        // If multiple (for bill book), return the first one for now (or use a merger if strictly needed)
        // Note: For bill books, we usually want one continuous PDF. 
        // Puppeteer generates one per setContent. To get all in one, we'd need to put all HTML in one page with page-breaks.
        
        if (pdfBuffers.length === 1) return pdfBuffers[0];
        
        // For multiple bills, we'll re-run with all HTML combined and page-breaks
        const combinedBrowser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: 'shell',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        });
        const combinedPage = await combinedBrowser.newPage();
        
        let combinedHTML = '';
        for (const bill of bills) {
            const html = await buildBillHTML(bill, settings);
            combinedHTML += `<div style="page-break-after: always;">${html}</div>`;
        }
        
        await combinedPage.setContent(combinedHTML, { waitUntil: 'networkidle0' });
        const finalPdf = await combinedPage.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });
        
        await combinedBrowser.close();
        return finalPdf;

    } catch (err) {
        if (browser) await browser.close();
        throw err;
    }
};

module.exports = { generateBillPdf };
