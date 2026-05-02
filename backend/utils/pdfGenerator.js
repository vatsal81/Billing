const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const buildBillHTML = (bill, settings = {}) => {
    const formatDate = (date) => 
        date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-') : 'N/A';

    const renderBookNo = () => {
        if (!bill.serialNumber) return "01";
        const book = Math.floor((bill.serialNumber - 1) / 100) + 1;
        return String(book).padStart(2, '0');
    };

    const renderBillNo = () => {
        if (!bill.serialNumber) return "001";
        const num = ((bill.serialNumber - 1) % 100) + 1;
        return String(num).padStart(3, '0');
    };

    const finalTotal = bill.actualTotal || 0;

    const itemRows = bill.items.map((item, idx) => `
        <tr class="item-row">
            <td class="col-desc">${item.name}</td>
            <td class="col-hsn"></td>
            <td class="col-qty">${item.quantity}</td>
            <td class="col-rate">${item.price.toFixed(0)}</td>
            <td class="col-amount">${(item.price * item.quantity).toFixed(0)}</td>
        </tr>
    `).join('');

    const emptyRowsHTML = Array.from({length: Math.max(1, 12 - bill.items.length)}).map((_, i) => `
        <tr class="empty-row">
            <td class="col-desc">&nbsp;</td>
            <td class="col-hsn"></td>
            <td class="col-qty"></td>
            <td class="col-rate"></td>
            <td class="col-amount"></td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="gu">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Noto+Sans+Gujarati:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Noto Sans Gujarati', sans-serif; 
            background: #fff;
            padding: 0;
        }
        .bill-wrapper {
            width: 210mm;
            padding: 10mm;
            background: #fff;
        }
        .bill-container {
            width: 190mm;
            min-height: 277mm;
            background: #fdf5e6;
            color: black;
            padding: 0;
            border: 2px solid #000;
            display: flex;
            flex-direction: column;
            position: relative;
            margin: 0 auto;
        }
        
        /* Header Section */
        .header-section { 
            display: flex; 
            border-bottom: 2px solid #000; 
        }
        .header-left { 
            width: 32%; 
            border-right: 2px solid #000; 
            padding: 10px; 
            font-size: 13px; 
            line-height: 1.4;
            display: flex;
            flex-direction: column;
        }
        .tax-invoice-title {
            text-align: center; 
            font-weight: bold; 
            margin-bottom: 8px;
            font-size: 15px;
        }
        .header-right { 
            width: 68%; 
            padding: 15px 10px; 
            text-align: center; 
        }
        .shop-name {
            font-size: 32px; 
            margin: 0 0 5px 0; 
            color: #002060; 
            font-weight: bold;
        }
        .shop-subtitle {
            font-size: 16px; 
            margin: 0; 
            font-weight: bold;
            color: #000;
        }
        .shop-address {
            font-size: 12px; 
            margin: 5px 0 0 0; 
            font-weight: 600;
            line-height: 1.5;
        }

        /* Meta Section (Bill No, Date) */
        .meta-section {
            display: flex;
            border-bottom: 2px solid #000;
        }
        .customer-area {
            width: 68%;
            border-right: 2px solid #000;
            padding: 10px;
        }
        .bill-info-area {
            width: 32%;
            display: flex;
            flex-direction: column;
        }
        .bill-info-row {
            display: flex;
            border-bottom: 1px solid #000;
            padding: 8px 10px;
            font-size: 14px;
            font-weight: bold;
        }
        .bill-info-row:last-child {
            border-bottom: none;
        }
        .bill-info-label {
            width: 70px;
        }
        .bill-info-value {
            flex: 1;
        }
        .red-text { color: #d00; }
        .blue-handwriting {
            font-family: 'Kalam', cursive;
            color: #0f3c88;
            font-size: 18px;
            font-weight: bold;
        }

        .customer-row {
            display: flex;
            align-items: flex-end;
            margin-bottom: 8px;
            font-weight: bold;
        }
        .customer-label {
            min-width: 45px;
        }
        .dotted-line {
            flex: 1;
            border-bottom: 1px dotted #000;
            padding-left: 10px;
            min-height: 25px;
        }
        .gst-meta-row {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            font-size: 14px;
            font-weight: bold;
        }

        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            flex-grow: 1;
        }
        .items-table th {
            border-bottom: 2px solid #000;
            border-right: 1px solid #000;
            padding: 8px;
            font-size: 14px;
            background: rgba(0,0,0,0.02);
        }
        .items-table th:last-child {
            border-right: none;
        }
        .item-row td {
            border-right: 1px solid #000;
            padding: 8px;
            font-family: 'Kalam', cursive;
            color: #0f3c88;
            font-size: 18px;
            height: 38px;
        }
        .item-row td:last-child {
            border-right: none;
        }
        .empty-row td {
            border-right: 1px solid #000;
            height: 38px;
        }
        .empty-row td:last-child {
            border-right: none;
        }
        
        /* Column Widths */
        .col-desc { width: 45%; text-align: left; }
        .col-hsn { width: 15%; text-align: center; }
        .col-qty { width: 10%; text-align: center; }
        .col-rate { width: 12%; text-align: right; border-right: 2px solid #000 !important; }
        .col-amount { width: 18%; text-align: right; }

        /* Footer Section */
        .footer-section {
            display: flex;
            border-top: 2px solid #000;
            min-height: 280px;
        }
        .footer-left {
            width: 68%;
            border-right: 2px solid #000;
            padding: 15px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
        }
        .gpay-mark {
            position: absolute;
            top: 20px;
            left: 30px;
            font-family: 'Kalam', cursive;
            font-size: 42px;
            color: #0f3c88;
            transform: rotate(-10deg);
            opacity: 0.8;
        }
        .amount-words-area {
            margin-top: 80px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 10px 0;
        }
        .terms-area {
            font-size: 12px;
            font-weight: bold;
            line-height: 1.6;
        }
        
        .footer-right {
            width: 32%;
            display: flex;
            flex-direction: column;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 10px;
            border-bottom: 1px solid #000;
            font-size: 14px;
            font-weight: bold;
        }
        .total-row.grand-total {
            border-bottom: 2px solid #000;
            padding: 10px;
            align-items: center;
        }
        .total-label { flex: 1; }
        .total-value { 
            width: 90px; 
            text-align: right; 
            font-family: 'Kalam', cursive;
            color: #0f3c88;
            font-size: 18px;
        }
        .grand-total .total-value {
            font-size: 28px;
        }
        
        .signature-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            padding-bottom: 15px;
            position: relative;
        }
        .stamp {
            position: absolute;
            top: 15px;
            border: 2px dashed #0f3c88;
            color: #0f3c88;
            padding: 5px 10px;
            border-radius: 10px;
            font-weight: bold;
            font-size: 13px;
            transform: rotate(-5deg);
            background: rgba(253, 245, 230, 0.7);
        }
        .sig-text {
            font-weight: bold;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="bill-wrapper">
        <div class="bill-container">
            <!-- Header -->
            <div class="header-section">
                <div class="header-left">
                    <div class="tax-invoice-title">TAX INVOICE<br/>CASH / DEBIT</div>
                    <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px;">
                        <span>Original</span>
                        <span>Duplicate</span>
                    </div>
                    <div style="font-weight: bold;">GSTIN - 24BRNPM8073Q1ZU</div>
                    <div style="font-weight: bold;">State : Gujarat &nbsp;&nbsp; Code : 24</div>
                </div>
                <div class="header-right">
                    <h1 class="shop-name">શ્રી હરિ ડ્રેસીસ & કટપીસ</h1>
                    <p class="shop-subtitle">Wholesale & Retail</p>
                    <p class="shop-address">માધવ પાર્ક ૧, શ્રી હરિ કોમ્પલેક્ષની બાજુમાં, આલાપ રોયલ પામની પાછળ,<br/>બાપાસીતારામ ચોક, મવડી, રાજકોટ - ૩૬૦ ૦૦૪.</p>
                </div>
            </div>

            <!-- Customer & Bill Info -->
            <div class="meta-section">
                <div class="customer-area">
                    <div class="customer-row">
                        <div class="customer-label">મે. :</div>
                        <div class="dotted-line blue-handwriting">${bill.customerNameGujarati || bill.customerName || ''}</div>
                    </div>
                    <div class="customer-row">
                        <div class="customer-label">એડ્રેસ :</div>
                        <div class="dotted-line blue-handwriting">${bill.customerAddressGujarati || bill.customerAddress || ''}</div>
                    </div>
                    <div class="gst-meta-row">
                        <span>GSTIN :</span>
                        <span>State :</span>
                        <span>Code :</span>
                        <span style="width: 50px;"></span>
                    </div>
                </div>
                <div class="bill-info-area">
                    <div class="bill-info-row">
                        <span class="bill-info-label">બુક નં. :</span>
                        <span class="bill-info-value red-text">${renderBookNo()}</span>
                    </div>
                    <div class="bill-info-row">
                        <span class="bill-info-label">બીલ નં. :</span>
                        <span class="bill-info-value red-text">${renderBillNo()}</span>
                    </div>
                    <div class="bill-info-row">
                        <span class="bill-info-label">તા. :</span>
                        <span class="bill-info-value blue-handwriting">${formatDate(bill.createdAt)}</span>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="col-desc">માલની વિગત</th>
                        <th class="col-hsn">HSN Code</th>
                        <th class="col-qty">નંગ / મીટર</th>
                        <th class="col-rate">ભાવ</th>
                        <th class="col-amount">રકમ રૂ.</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                    ${emptyRowsHTML}
                </tbody>
            </table>

            <!-- Footer -->
            <div class="footer-section">
                <div class="footer-left">
                    <div class="gpay-mark">GPay</div>
                    <div class="amount-words-area">
                        <span class="blue-handwriting">${finalTotal}-only</span>
                    </div>
                    <div class="terms-area">
                        ટર્મ્સ એન્ડ કન્ડિશન :<br/>
                        ૧. ન્યાયક્ષેત્ર રાજકોટ રહેશે.<br/>
                        ૨. ભૂલચૂક લેવી દેવી.
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
                        <span class="total-label">રાઉન્ડ ઓફ</span>
                        <span class="total-value">${bill.roundOff >= 0 ? '+' : ''}${bill.roundOff.toFixed(2)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span class="total-label" style="font-size: 18px;">કુલ (Total)</span>
                        <span class="total-value">${finalTotal}/-</span>
                    </div>
                    <div class="signature-area">
                        <div class="stamp">શ્રી હરિ ડ્રેસીસ & કટપીસ</div>
                        <div class="sig-text">શ્રી હરિ ડ્રેસીસ & કટપીસ</div>
                    </div>
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
    
    const puppeteerCore = require('puppeteer-core');
    let chromium;
    try {
        chromium = require('@sparticuz/chromium');
    } catch (e) {
        console.log('@sparticuz/chromium not found, using standard puppeteer-core');
    }

    const launchOptions = {
        args: chromium ? chromium.args : [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ],
        defaultViewport: chromium ? chromium.defaultViewport : null,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        headless: chromium ? chromium.headless : 'new'
    };

    console.log('--- PDF SYSTEM DIAGNOSTICS ---');
    console.log('Current Working Directory:', process.cwd());
    
    // Auto-detect local chrome if not set
    if (!launchOptions.executablePath) {
        if (chromium) {
            try {
                launchOptions.executablePath = await chromium.executablePath();
                console.log('USING SPARTICUZ CHROMIUM PATH:', launchOptions.executablePath);
            } catch (e) {
                console.log('Sparticuz failed to get path:', e.message);
            }
        }

        if (!launchOptions.executablePath) {
            const cacheDir = path.join(process.cwd(), '.cache', 'puppeteer');
            const findChrome = (dir) => {
                try {
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        const fullPath = path.join(dir, file);
                        if (fs.statSync(fullPath).isDirectory()) {
                            const found = findChrome(fullPath);
                            if (found) return found;
                        } else if (file === 'chrome' || file === 'chrome.exe') {
                            return fullPath;
                        }
                    }
                } catch (e) {}
                return null;
            };
            const foundPath = findChrome(cacheDir);
            if (foundPath) {
                console.log('SUCCESS: AUTO-DETECTED CHROME AT:', foundPath);
                launchOptions.executablePath = foundPath;
                try { fs.chmodSync(foundPath, '755'); } catch (e) {}
            }
        }
    }

    console.log('Final Launch Options:', JSON.stringify({ ...launchOptions, executablePath: launchOptions.executablePath || 'DEFAULT' }));
    
    let browser;
    let retries = 3;
    while (retries > 0) {
        try {
            browser = await puppeteerCore.launch(launchOptions);
            console.log('Browser launched successfully');
            break;
        } catch (launchError) {
            console.error(`Launch attempt failed (${retries} retries left):`, launchError.message);
            if (launchError.message.includes('ETXTBSY') && retries > 1) {
                console.log('File busy, waiting 2 seconds before retry...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries--;
                continue;
            }
            console.error('--- BROWSER LAUNCH CRITICAL FAILURE ---');
            console.error('Message:', launchError.message);
            console.error('Stack:', launchError.stack);
            throw new Error(`Browser launch failed: ${launchError.message}`);
        }
    }

    try {
        const pdfBuffers = [];
        for (const bill of bills) {
            console.log(`Generating PDF for bill serial: ${bill.serialNumber}`);
            const page = await browser.newPage();
            const html = buildBillHTML(bill, settings);
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' }
            });
            pdfBuffers.push(pdf);
            await page.close();
        }

        if (!isArray) {
            return pdfBuffers[0];
        }

        return pdfBuffers[0];
    } catch (genError) {
        console.error('PDF GENERATION ERROR:', genError.message);
        throw genError;
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { generateBillPdf };
