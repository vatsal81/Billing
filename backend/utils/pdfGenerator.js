const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Auto-install browser on Render if missing
const ensureBrowser = async () => {
    if (process.env.RENDER) {
        const cachePath = process.env.PUPPETEER_CACHE_DIR || '/opt/render/.cache/puppeteer';
        if (!fs.existsSync(cachePath)) {
            console.log('Installing Chrome for Render...');
            try {
                execSync(`PUPPETEER_CACHE_DIR=${cachePath} npx puppeteer browsers install chrome-headless-shell`, { stdio: 'inherit' });
            } catch (err) {
                console.error('Auto-install failed, please set Build Command manually on Render.', err);
            }
        }
    }
};

const formatDate = (date) => 
    date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

const buildBillHTML = async (bill, settings = {}) => {
    // ... (Classic Yellow Design remains exactly the same)
    const bookNum = bill.serialNumber ? String(Math.floor((bill.serialNumber - 1) / 100) + 1).padStart(2, '0') : '01';
    const billNum = bill.serialNumber ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') : bill._id.substring(bill._id.length - 4).toUpperCase();

    const itemRows = bill.items.map((item, idx) => `
        <tr style="height: 35px;">
            <td style="border-right: 2px solid #000; border-bottom: 1px solid #000; padding: 2px 10px; text-align: left; font-family: 'Noto Sans Gujarati', sans-serif;">${item.name}</td>
            <td style="border-right: 2px solid #000; border-bottom: 1px solid #000; padding: 2px 10px; text-align: center;">${item.hsn || ''}</td>
            <td style="border-right: 2px solid #000; border-bottom: 1px solid #000; padding: 2px 10px; text-align: center; font-style: italic;">${item.quantity}</td>
            <td style="border-right: 2px solid #000; border-bottom: 1px solid #000; padding: 2px 10px; text-align: right; font-style: italic;">${item.price.toFixed(0)}</td>
            <td style="border-bottom: 1px solid #000; padding: 2px 10px; text-align: right; font-style: italic;">${(item.price * item.quantity).toFixed(0)}</td>
        </tr>
    `).join('');

    const emptyRowsCount = Math.max(0, 12 - bill.items.length);
    const emptyRowsHTML = Array(emptyRowsCount).fill(0).map(() => `
        <tr style="height: 35px;">
            <td style="border-right: 2px solid #000; border-bottom: 1px solid #000;"></td>
            <td style="border-right: 2px solid #000; border-bottom: 1px solid #000;"></td>
            <td style="border-right: 2px solid #000; border-bottom: 1px solid #000;"></td>
            <td style="border-right: 2px solid #000; border-bottom: 1px solid #000;"></td>
            <td style="border-bottom: 1px solid #000;"></td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="gu">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&family=Kalam:wght@700&family=Roboto:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
    <style>
        body { 
            font-family: 'Roboto', 'Noto Sans Gujarati', sans-serif; 
            margin: 0; padding: 10px;
            background: #fff;
            color: #000;
        }
        .bill-container {
            width: 780px;
            margin: 0 auto;
            border: 3px solid #000;
            background: #f4e89f;
            padding: 0;
            position: relative;
        }
        table { width: 100%; border-collapse: collapse; }
        .top-header { display: grid; grid-template-columns: 280px 1fr; border-bottom: 3px solid #000; }
        .header-left { border-right: 3px solid #000; padding: 15px; font-size: 13px; line-height: 1.6; font-weight: 700; }
        .header-right { padding: 15px; text-align: center; }
        .shop-name { font-family: 'Noto Sans Gujarati', sans-serif; font-size: 42px; font-weight: 700; color: #1e3a8a; margin: 0; }
        .shop-subtitle { font-weight: 700; font-size: 16px; margin: 5px 0; color: #000; }
        .shop-address { font-size: 13px; font-weight: 700; font-family: 'Noto Sans Gujarati', sans-serif; color: #000; }
        .meta-section { display: grid; grid-template-columns: 1fr 240px; border-bottom: 3px solid #000; }
        .meta-left { padding: 15px; border-right: 3px solid #000; }
        .meta-right { padding: 10px 15px; font-weight: 700; color: #000; font-size: 16px; border-left: 3px solid #000; }
        .meta-row { display: flex; margin-bottom: 12px; align-items: flex-end; }
        .meta-label { font-family: 'Noto Sans Gujarati', sans-serif; font-weight: 700; font-size: 18px; width: 80px; }
        .meta-value { border-bottom: 2px dotted #000; flex: 1; padding-left: 10px; font-weight: 700; color: #1e40af; font-size: 18px; font-style: italic; }
        .gst-row { display: flex; padding: 10px 15px; border-bottom: 3px solid #000; font-weight: 700; font-size: 16px; gap: 60px; }
        .items-table th { border-bottom: 3px solid #000; border-right: 2px solid #000; background: #eab308; padding: 8px; font-family: 'Noto Sans Gujarati', sans-serif; font-size: 16px; font-weight: 700; }
        .items-table td { font-size: 18px; font-weight: 700; color: #1e40af; }
        .footer { display: grid; grid-template-columns: 1fr 260px; border-top: 2px solid #000; }
        .footer-left { border-right: 3px solid #000; padding: 25px; position: relative; }
        .gpay-text { font-family: 'Kalam', cursive; font-size: 64px; color: #475569; margin: 0; line-height: 1; }
        .amount-only { font-family: 'Kalam', cursive; font-size: 32px; color: #1e40af; margin-top: 10px; border-bottom: 3px solid #000; display: inline-block; width: 100%; }
        .terms { font-size: 13px; font-weight: 700; margin-top: 60px; font-family: 'Noto Sans Gujarati', sans-serif; line-height: 1.4; }
        .footer-right { background: #fde047; }
        .total-row { display: grid; grid-template-columns: 1fr 100px; border-bottom: 2px solid #000; font-size: 14px; font-weight: 700; padding: 8px 12px; }
        .total-row:last-child { border-bottom: none; font-size: 22px; color: #1e3a8a; background: #fde047; }
        .total-label { font-family: 'Noto Sans Gujarati', sans-serif; }
        .total-value { text-align: right; font-style: italic; color: #1e40af; }
        .stamp-area { padding: 15px; text-align: center; border-top: 2px solid #000; background: #fde047; }
        .stamp-box { border: 2px dashed #475569; color: #475569; padding: 8px 15px; border-radius: 12px; display: inline-block; font-size: 14px; font-family: 'Noto Sans Gujarati', sans-serif; font-weight: 700; }
        .stamp-text { font-size: 16px; font-weight: 700; font-family: 'Noto Sans Gujarati', sans-serif; margin-top: 12px; color: #000; }
    </style>
</head>
<body>
    <div class="bill-container">
        <div class="top-header">
            <div class="header-left">
                <div style="text-align:center; font-size:16px; margin-bottom:5px;">TAX INVOICE</div>
                <div style="text-align:center; font-size:16px; margin-bottom:20px;">CASH / DEBIT</div>
                <div style="display:flex; justify-content:space-between;"><span>Original :</span><span>Duplicate :</span></div>
                <div style="margin-top:15px;">GSTIN - 24BRNPM8073Q1ZU</div>
                <div>State : Gujarat Code : 24</div>
            </div>
            <div class="header-right">
                <h1 class="shop-name">શ્રી હરિ ડ્રેસીસ & કટપીસ</h1>
                <div class="shop-subtitle">Wholesale & Retail</div>
                <div class="shop-address">માધવ પાર્ક ૧, શ્રી હરિ કોમ્પલેક્ષની બાજુમાં, આલાપ રોયલ પામની પાછળ,<br>બાપાસીતારામ ચોક, મવડી, રાજકોટ - ૩૬૦ ૦૦૪.</div>
            </div>
        </div>
        <div class="meta-section">
            <div class="meta-left">
                <div class="meta-row"><span class="meta-label">મે. :</span><span class="meta-value">${bill.customerNameGujarati || bill.customerName || ''}</span></div>
                <div class="meta-row"><span class="meta-label">એડ્રેસ :</span><span class="meta-value">${bill.customerAddressGujarati || bill.customerAddress || ''}</span></div>
            </div>
            <div class="meta-right">
                <div style="margin-bottom:12px;">બુક નં. : &nbsp;&nbsp;&nbsp;<span style="color:#b91c1c;">${bookNum}</span></div>
                <div style="margin-bottom:12px;">બીલ નં. : &nbsp;&nbsp;<span style="color:#b91c1c;">${billNum}</span></div>
                <div>તા. : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#1e40af; font-style:italic;">${new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</span></div>
            </div>
        </div>
        <div class="gst-row"><div>GSTIN :</div><div>State : Gujarat</div><div>Code : 24</div></div>
        <table class="items-table">
            <thead><tr><th style="width: 350px;">માલની વિગત</th><th style="width: 110px;">HSN Code</th><th style="width: 90px;">નંગ /<br>મીટર</th><th style="width: 110px;">ભાવ</th><th style="width: 120px; border-right: none;">રકમ રૂ.</th></tr></thead>
            <tbody>${itemRows}${emptyRowsHTML}</tbody>
        </table>
        <div class="footer">
            <div class="footer-left"><div class="gpay-text">GPay</div><div class="amount-only">${bill.actualTotal}-only</div><div class="terms">ટર્મ્સ એન્ડ કન્ડીશન :<br>૧. ન્યાયક્ષેત્ર રાજકોટ રહેશે.<br>૨. ભુલચુક લેવી દેવી.</div></div>
            <div class="footer-right">
                <div class="total-row"><span class="total-label">સબટોટલ (Subtotal)</span><span class="total-value">${bill.totalAmount.toFixed(2)}</span></div>
                <div class="total-row"><span class="total-label">CGST 2.5%</span><span class="total-value">${bill.cgst.toFixed(2)}</span></div>
                <div class="total-row"><span class="total-label">SGST 2.5%</span><span class="total-value">${bill.sgst.toFixed(2)}</span></div>
                <div class="total-row"><span class="total-label">IGST %</span><span class="total-value"></span></div>
                <div class="total-row" style="background:#fde047;"><span class="total-label">સબટોટલ (Subtotal)</span><span class="total-value">${(bill.totalAmount + bill.cgst + bill.sgst).toFixed(2)}</span></div>
                <div class="total-row"><span class="total-label">રાઉન્ડ ઓફ</span><span class="total-value">${bill.roundOff > 0 ? '+' : ''}${bill.roundOff.toFixed(2)}</span></div>
                <div class="total-row" style="border-top:3px solid #000; padding:12px;"><span class="total-label" style="font-size:20px;">કુલ (Total)</span><span class="total-value" style="font-size:24px; font-weight:900;">${bill.actualTotal}/-</span></div>
                <div class="stamp-area"><div class="stamp-box">શ્રી હરિ ડ્રેસીસ & કટપીસ</div><div class="stamp-text">શ્રી હરિ ડ્રેસીસ & કટપીસ</div></div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
};

const generateBillPdf = async (billOrBills, settings) => {
    const isArray = Array.isArray(billOrBills);
    const bills = isArray ? billOrBills : [billOrBills];

    await ensureBrowser();

    const browser = await puppeteer.launch({
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
        
        if (pdfBuffers.length === 1) return pdfBuffers[0];
        
        const combinedBrowser = await puppeteer.launch({
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

module.exports = { generateBillPdf };
