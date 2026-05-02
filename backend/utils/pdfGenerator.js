const puppeteer = require('puppeteer');
const QRCode = require('qrcode');

const formatDate = (date) => 
    date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

const buildBillHTML = async (bill, settings = {}) => {
    const bookNum = bill.serialNumber ? String(Math.floor((bill.serialNumber - 1) / 100) + 1).padStart(2, '0') : '01';
    const billNum = bill.serialNumber ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') : bill._id.substring(bill._id.length - 4).toUpperCase();

    const itemRows = bill.items.map((item, idx) => `
        <tr style="height: 30px;">
            <td style="border-right: 1px solid #000; padding: 2px 10px; text-align: left; font-family: 'Noto Sans Gujarati', sans-serif;">${item.name}</td>
            <td style="border-right: 1px solid #000; padding: 2px 10px; text-align: center;">${item.hsn || ''}</td>
            <td style="border-right: 1px solid #000; padding: 2px 10px; text-align: center;">${item.quantity}</td>
            <td style="border-right: 1px solid #000; padding: 2px 10px; text-align: right;">${item.price.toFixed(0)}</td>
            <td style="padding: 2px 10px; text-align: right;">${(item.price * item.quantity).toFixed(0)}</td>
        </tr>
    `).join('');

    const emptyRowsCount = Math.max(0, 15 - bill.items.length);
    const emptyRowsHTML = Array(emptyRowsCount).fill(0).map(() => `
        <tr style="height: 30px;">
            <td style="border-right: 1px solid #000;"></td>
            <td style="border-right: 1px solid #000;"></td>
            <td style="border-right: 1px solid #000;"></td>
            <td style="border-right: 1px solid #000;"></td>
            <td></td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="gu">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&family=Kalam:wght@700&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { 
            font-family: 'Roboto', 'Noto Sans Gujarati', sans-serif; 
            margin: 0; padding: 20px;
            background: #fff;
            color: #000;
        }
        .bill-container {
            width: 750px;
            margin: 0 auto;
            border: 2px solid #000;
            background: #f4e89f; /* Exact yellow from screenshot */
            padding: 0;
            position: relative;
        }
        table { width: 100%; border-collapse: collapse; }
        
        .top-header {
            display: grid;
            grid-template-columns: 250px 1fr;
            border-bottom: 2px solid #000;
        }
        .header-left {
            border-right: 2px solid #000;
            padding: 10px;
            font-size: 11px;
            line-height: 1.4;
        }
        .header-right {
            padding: 10px;
            text-align: center;
        }
        .shop-name {
            font-family: 'Noto Sans Gujarati', sans-serif;
            font-size: 34px;
            font-weight: 700;
            color: #1e3a8a;
            margin: 0;
        }
        .shop-subtitle { font-weight: 700; font-size: 14px; margin: 5px 0; }
        .shop-address { font-size: 12px; font-weight: 700; font-family: 'Noto Sans Gujarati', sans-serif; }

        .meta-section {
            display: grid;
            grid-template-columns: 1fr 180px;
            border-bottom: 2px solid #000;
        }
        .meta-left {
            padding: 10px;
            border-right: 2px solid #000;
        }
        .meta-right { padding: 5px 10px; font-weight: 700; color: #b91c1c; font-size: 14px; }
        
        .meta-row { display: flex; margin-bottom: 8px; align-items: flex-end; }
        .meta-label { font-family: 'Noto Sans Gujarati', sans-serif; font-weight: 700; font-size: 14px; width: 60px; }
        .meta-value { border-bottom: 1px dotted #000; flex: 1; padding-left: 10px; font-weight: 700; color: #1e40af; }

        .gst-row { display: flex; padding: 10px; border-bottom: 2px solid #000; font-weight: 700; font-size: 14px; gap: 40px; }

        .items-table th {
            border-bottom: 2px solid #000;
            border-right: 1px solid #000;
            background: #eab308;
            padding: 5px;
            font-family: 'Noto Sans Gujarati', sans-serif;
            font-size: 14px;
        }
        .items-table td { font-size: 14px; font-weight: 700; color: #1e40af; }

        .footer {
            display: grid;
            grid-template-columns: 1fr 250px;
            border-top: 2px solid #000;
        }
        .footer-left {
            border-right: 2px solid #000;
            padding: 20px;
            position: relative;
        }
        .gpay-text {
            font-family: 'Kalam', cursive;
            font-size: 48px;
            color: #475569;
            margin: 0;
        }
        .amount-only {
            font-family: 'Kalam', cursive;
            font-size: 24px;
            color: #1e40af;
            margin-top: -10px;
            border-bottom: 2px solid #000;
            display: inline-block;
            width: 100%;
        }
        .terms { font-size: 11px; font-weight: 700; margin-top: 50px; font-family: 'Noto Sans Gujarati', sans-serif; }

        .footer-right { background: #fde047; }
        .total-row {
            display: grid;
            grid-template-columns: 1fr 80px;
            border-bottom: 1px solid #000;
            font-size: 12px;
            font-weight: 700;
            padding: 5px 10px;
        }
        .total-row:last-child { border-bottom: none; font-size: 16px; color: #b91c1c; }
        .total-label { font-family: 'Noto Sans Gujarati', sans-serif; }
        .total-value { text-align: right; font-style: italic; color: #1e40af; }

        .stamp-area {
            padding: 10px;
            text-align: center;
        }
        .stamp-box {
            border: 2px dashed #64748b;
            color: #64748b;
            padding: 5px;
            border-radius: 10px;
            display: inline-block;
            font-size: 12px;
            font-family: 'Noto Sans Gujarati', sans-serif;
        }
        .stamp-text { font-size: 14px; font-weight: 700; font-family: 'Noto Sans Gujarati', sans-serif; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="bill-container">
        <div class="top-header">
            <div class="header-left">
                <div style="text-align:center; font-weight:700; font-size:13px; margin-bottom:5px;">TAX INVOICE</div>
                <div style="text-align:center; font-weight:700; font-size:13px; margin-bottom:15px;">CASH / DEBIT</div>
                <div>Original : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Duplicate :</div>
                <div style="font-weight:700; margin-top:10px;">GSTIN - 24BRNPM8073Q1ZU</div>
                <div style="font-weight:700;">State : Gujarat Code : 24</div>
            </div>
            <div class="header-right">
                <h1 class="shop-name">શ્રી હરિ ડ્રેસીસ & કટપીસ</h1>
                <div class="shop-subtitle">Wholesale & Retail</div>
                <div class="shop-address">માધવ પાર્ક ૧, શ્રી હરિ કોમ્પલેક્ષની બાજુમાં, આલાપ રોયલ પામની પાછળ,<br>બાપાસીતારામ ચોક, મવડી, રાજકોટ - ૩૬૦ ૦૦૪.</div>
            </div>
        </div>

        <div class="meta-section">
            <div class="meta-left">
                <div class="meta-row">
                    <span class="meta-label">મે. :</span>
                    <span class="meta-value">${bill.customerNameGujarati || bill.customerName || ''}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">એડ્રેસ :</span>
                    <span class="meta-value">${bill.customerAddressGujarati || bill.customerAddress || ''}</span>
                </div>
            </div>
            <div class="meta-right">
                <div style="margin-bottom:10px;">બુક નં. : &nbsp;&nbsp;&nbsp;<span style="color:#b91c1c;">${bookNum}</span></div>
                <div style="margin-bottom:10px;">બીલ નં. : &nbsp;&nbsp;<span style="color:#b91c1c;">${billNum}</span></div>
                <div>તા. : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#1e40af; font-style:italic;">${new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</span></div>
            </div>
        </div>

        <div class="gst-row">
            <div>GSTIN :</div>
            <div>State : Gujarat</div>
            <div>Code : 24</div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 320px; border-right: 2px solid #000;">માલની વિગત</th>
                    <th style="width: 100px; border-right: 2px solid #000;">HSN Code</th>
                    <th style="width: 80px; border-right: 2px solid #000;">નંગ /<br>મીટર</th>
                    <th style="width: 100px; border-right: 2px solid #000;">ભાવ</th>
                    <th style="width: 100px;">રકમ રૂ.</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
                ${emptyRowsHTML}
            </tbody>
        </table>

        <div class="footer">
            <div class="footer-left">
                <div class="gpay-text">GPay</div>
                <div class="amount-only">${bill.actualTotal}-only</div>
                <div class="terms">
                    ટર્મ્સ એન્ડ કન્ડીશન :<br>
                    ૧. ન્યાયક્ષેત્ર રાજકોટ રહેશે.<br>
                    ૨. ભુલચુક લેવી દેવી.
                </div>
            </div>
            <div class="footer-right">
                <div class="total-row">
                    <span class="total-label">સબટોટલ (Subtotal)</span>
                    <span class="total-value">${bill.totalAmount.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">CGST 2.5%</span>
                    <span class="total-value">${bill.cgst.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">SGST 2.5%</span>
                    <span class="total-value">${bill.sgst.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">IGST %</span>
                    <span class="total-value"></span>
                </div>
                <div class="total-row">
                    <span class="total-label">સબટોટલ (Subtotal)</span>
                    <span class="total-value">${(bill.totalAmount + bill.cgst + bill.sgst).toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">રાઉન્ડ ઓફ</span>
                    <span class="total-value">${bill.roundOff > 0 ? '+' : ''}${bill.roundOff.toFixed(2)}</span>
                </div>
                <div class="total-row" style="border-top:2px solid #000;">
                    <span class="total-label">કુલ (Total)</span>
                    <span class="total-value" style="font-size:20px;">${bill.actualTotal}/-</span>
                </div>
                <div class="stamp-area">
                    <div class="stamp-box">શ્રી હરિ ડ્રેસીસ & કટપીસ</div>
                    <div class="stamp-text">શ્રી હરિ ડ્રેસીસ & કટપીસ</div>
                </div>
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
