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
        <tr style="display: flex; width: 100%; font-family: 'Kalam', cursive; color: #0f3c88; font-size: 18px;">
            <td style="padding: 6px 8px; border-right: 1px solid #000; width: 45%; text-align: left;">${item.name}</td>
            <td style="padding: 6px 8px; border-right: 1px solid #000; width: 15%;"></td>
            <td style="padding: 6px 8px; border-right: 1px solid #000; width: 10%; text-align: center;">${item.quantity}</td>
            <td style="padding: 6px 8px; border-right: 2px solid #000; width: 12%; text-align: right;">${item.price.toFixed(0)}</td>
            <td style="padding: 6px 8px; width: 18%; text-align: right;">${(item.price * item.quantity).toFixed(0)}</td>
        </tr>
    `).join('');

    const emptyRowsHTML = Array.from({length: Math.max(1, 10 - bill.items.length)}).map((_, i) => `
        <tr style="display: flex; width: 100%; ${i === 0 ? 'flex-grow: 1;' : ''}">
            <td style="padding: 12px; border-right: 1px solid #000; width: 45%">&nbsp;</td>
            <td style="border-right: 1px solid #000; width: 15%"></td>
            <td style="border-right: 1px solid #000; width: 10%"></td>
            <td style="border-right: 2px solid #000; width: 12%"></td>
            <td style="width: 18%"></td>
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
            font-family: Arial, sans-serif; 
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
            background: #eedd82;
            color: black;
            padding: 15px;
            border: 2px solid #000;
            display: flex;
            flex-direction: column;
            margin: 0 auto;
        }
        .header-section { display: flex; border-bottom: 2px solid #000; }
        .header-left { width: 35%; border-right: 2px solid #000; padding: 8px; font-size: 13px; line-height: 1.4; }
        .header-right { width: 65%; padding: 10px 8px; text-align: center; }
        .customer-meta-section { display: flex; border-bottom: 2px solid #000; }
        .customer-info { width: 68%; border-right: 2px solid #000; padding: 6px; font-size: 14px; line-height: 1.8; }
        .meta-info { width: 32%; font-size: 14px; }
        .info-row { display: flex; align-items: flex-end; }
        .dotted-line {
            border-bottom: 1px dotted #000;
            flex: 1;
            font-family: 'Kalam', cursive;
            color: #0f3c88;
            font-size: 16px;
            padding-left: 8px;
            margin-left: 5px;
        }
        .items-table { width: 100%; border-collapse: collapse; flex-grow: 1; display: flex; flex-direction: column; }
        .items-table thead tr { border-bottom: 2px solid #000; font-size: 14px; font-weight: bold; display: flex; width: 100%; }
        .items-table tbody { flex-grow: 1; display: flex; flex-direction: column; width: 100%; }
        .footer-section { display: flex; border-top: 2px solid #000; margin-top: auto; height: 300px; }
        .footer-left { width: 68%; border-right: 2px solid #000; padding: 8px; position: relative; display: flex; flex-direction: column; justify-content: space-between; }
        .footer-right { width: 32%; }
        .total-row { display: flex; border-bottom: 1px solid #000; padding: 4px 8px; font-size: 13px; }
        .gpay-text { position: absolute; top: 10px; left: 20px; font-family: 'Kalam', cursive; font-size: 28px; color: #0f3c88; opacity: 0.8; transform: rotate(-15deg); }
        .stamp-area { border-top: 2px solid #000; padding: 8px; text-align: center; position: relative; min-height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
        .stamp { position: absolute; top: 5px; color: #0f3c88; border: 2px dotted #0f3c88; border-radius: 8px; padding: 5px 8px; transform: rotate(-5deg); opacity: 0.9; background: rgba(238, 221, 130, 0.5); font-weight: bold; font-size: 12px; }
    </style>
</head>
<body>
    <div class="bill-wrapper">
        <div class="bill-container">
            <div class="header-section">
                <div class="header-left">
                    <div style="text-align: center; font-weight: bold; margin-bottom: 8px;">TAX INVOICE<br/>CASH / DEBIT</div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span>Original</span>
                        <span>Duplicate</span>
                    </div>
                    <div style="font-weight: bold;">GSTIN - 24BRNPM8073Q1ZU</div>
                    <div>State : Gujarat    Code : 24</div>
                </div>
                <div class="header-right">
                    <h1 style="font-size: 28px; margin: 0 0 4px 0; color: #002060; font-weight: bold;">શ્રી હરિ ડ્રેસીસ & કટપીસ</h1>
                    <p style="font-size: 14px; margin: 0; font-weight: 600;">Wholesale & Retail</p>
                    <p style="font-size: 14px; margin: 0 0 4px 0; font-weight: 600;">માધવ પાર્ક ૧, શ્રી હરિ કોમ્પલેક્ષની બાજુમાં, આલાપ રોયલ પામની પાછળ,<br/>બાપાસીતારામ ચોક, મવડી, રાજકોટ - ૩૬૦ ૦૦૪.</p>
                </div>
            </div>

            <div class="customer-meta-section">
                <div class="customer-info">
                    <div class="info-row">
                        <div style="min-width: 40px; font-weight: bold;">મે. :</div>
                        <div class="dotted-line">${bill.customerNameGujarati || bill.customerName || ''}</div>
                    </div>
                    <div class="info-row" style="margin-top: 4px;">
                        <div style="min-width: 60px; font-weight: bold;">એડ્રેસ :</div>
                        <div class="dotted-line">${bill.customerAddressGujarati || bill.customerAddress || ''}</div>
                    </div>
                    <div style="display: flex; margin-top: 8px; border-top: 1px solid #000; padding-top: 4px;">
                        <div style="min-width: 60px; font-weight: bold;">GSTIN :</div>
                        <div style="flex: 1;"></div>
                        <div style="min-width: 60px; font-weight: bold;">State :</div>
                        <div style="flex: 1;"></div>
                        <div style="min-width: 60px; font-weight: bold;">Code :</div>
                        <div style="flex: 2;"></div>
                    </div>
                </div>
                <div class="meta-info">
                    <div style="display: flex; padding: 6px 8px; border-bottom: 1px solid #000;">
                        <span style="width: 70px; font-weight: bold;">બુક નં. :</span> <span style="color: #c00; font-weight: bold;">${renderBookNo()}</span>
                    </div>
                    <div style="display: flex; padding: 6px 8px; border-bottom: 1px solid #000;">
                        <span style="width: 70px; font-weight: bold;">બીલ નં. :</span> <span style="color: #c00; font-weight: bold;">${renderBillNo()}</span>
                    </div>
                    <div style="display: flex; padding: 6px 8px;">
                        <span style="width: 70px; font-weight: bold;">તા. :</span> <span style="color: #0f3c88; font-family: 'Kalam', cursive; font-size: 15px; font-weight: bold;">${formatDate(bill.createdAt)}</span>
                    </div>
                </div>
            </div>

            <table class="items-table">
                <thead>
                    <tr style="display: flex; width: 100%;">
                        <th style="padding: 8px; border-right: 1px solid #000; width: 45%;">માલની વિગત</th>
                        <th style="padding: 8px; border-right: 1px solid #000; width: 15%;">HSN Code</th>
                        <th style="padding: 8px; border-right: 1px solid #000; width: 10%;">નંગ / મીટર</th>
                        <th style="padding: 8px; border-right: 2px solid #000; width: 12%;">ભાવ</th>
                        <th style="padding: 8px; width: 18%;">રકમ રૂ.</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                    ${emptyRowsHTML}
                </tbody>
            </table>

            <div class="footer-section">
                <div class="footer-left">
                    <div class="gpay-text">GPay</div>
                    <div style="margin-top: 60px; border-bottom: 1px solid #000; border-top: 1px solid #000; padding: 4px 0;">
                        <span style="font-family: 'Kalam', cursive; color: #0f3c88; font-size: 20px; font-weight: bold;">${finalTotal}-only</span>
                    </div>
                    <div style="font-size: 12px; font-weight: bold; line-height: 1.6; margin-top: 15px;">
                        ટર્મ્સ એન્ડ કન્ડિશન :<br/>૧. ન્યાયક્ષેત્ર રાજકોટ રહેશે.<br/>૨. ભૂલચૂક લેવી દેવી.
                    </div>
                </div>
                <div class="footer-right">
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">સબટોટલ (Subtotal)</span>
                        <span style="width: 35%; textAlign: right; font-family: 'Kalam', cursive; color: #0f3c88; font-size: 15px; font-weight: bold;">${bill.totalAmount.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">CGST 2.5%</span>
                        <span style="width: 35%; textAlign: right; font-family: 'Kalam', cursive; color: #0f3c88; font-size: 15px; font-weight: bold;">${bill.cgst.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">SGST 2.5%</span>
                        <span style="width: 35%; textAlign: right; font-family: 'Kalam', cursive; color: #0f3c88; font-size: 15px; font-weight: bold;">${bill.sgst.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">IGST %</span>
                        <span style="width: 35%; textAlign: right; font-family: 'Kalam', cursive; color: #0f3c88; font-size: 15px; font-weight: bold;"></span>
                    </div>
                    <div class="total-row" style="border-bottom: 2px solid #000;">
                        <span style="width: 65%; font-weight: bold;">રાઉન્ડ ઓફ</span>
                        <span style="width: 35%; textAlign: right; font-family: 'Kalam', cursive; color: #0f3c88; font-size: 15px; font-weight: bold;">${bill.roundOff >= 0 ? '+' : ''}${bill.roundOff.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; padding: 8px;">
                        <span style="width: 50%; font-weight: bold; font-size: 16px;">કુલ (Total)</span>
                        <span style="width: 50%; textAlign: right; font-family: 'Kalam', cursive; color: #0f3c88; font-size: 24px; font-weight: bold;">${finalTotal}/-</span>
                    </div>
                    <div class="stamp-area">
                        <div class="stamp">શ્રી હરિ ડ્રેસીસ & કટપીસ</div>
                        <span style="font-weight: bold; font-size: 13px;">શ્રી હરિ ડ્રેસીસ & કટપીસ</span>
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
    
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
    
    // Smart detection for Render environment
    if (!executablePath && process.env.RENDER) {
        const renderPath = path.join(process.env.PUPPETEER_CACHE_DIR || '/opt/render/project/src/.cache/puppeteer', 'chrome');
        if (fs.existsSync(renderPath)) {
            // Find the chrome binary inside the versioned folder
            const versions = fs.readdirSync(renderPath);
            if (versions.length > 0) {
                executablePath = path.join(renderPath, versions[0], 'chrome-linux64', 'chrome');
            }
        }
    }

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        executablePath: executablePath
    });

    try {
        const pdfBuffers = [];
        for (const bill of bills) {
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

        return isArray ? pdfBuffers : pdfBuffers[0];
    } finally {
        await browser.close();
    }
};

module.exports = { generateBillPdf };
