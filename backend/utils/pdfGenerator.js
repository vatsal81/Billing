const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Load fonts as Base64 to ensure they are available in Puppeteer (especially on Render)
const loadFontAsBase64 = (fontName) => {
    try {
        const fontPath = path.join(__dirname, fontName);
        if (fs.existsSync(fontPath)) {
            const base64 = fs.readFileSync(fontPath).toString('base64');
            console.log(`Successfully loaded font: ${fontName} (${base64.length} bytes)`);
            return base64;
        } else {
            console.error(`Font file NOT FOUND: ${fontPath}`);
        }
    } catch (e) {
        console.error(`Error loading font ${fontName}:`, e.message);
    }
    return '';
};

const kalamBase64 = loadFontAsBase64('Kalam-Regular.ttf');
const gujaratiBase64 = loadFontAsBase64('NotoSansGujarati-Regular.ttf');

const getBillStyles = () => `
    @font-face {
        font-family: 'Kalam';
        src: url(data:font/ttf;charset=utf-8;base64,${kalamBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
    }
    @font-face {
        font-family: 'Gujarati';
        src: url(data:font/ttf;charset=utf-8;base64,${gujaratiBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
    }
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
        page-break-after: always;
    }
    .bill-wrapper:last-child {
        page-break-after: auto;
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
    .customer-info { width: 68%; border-right: 2px solid #000; padding: 6px; font-size: 14px; line-height: 1.8; font-family: 'Gujarati', sans-serif; }
    .meta-info { width: 32%; font-size: 14px; font-family: 'Gujarati', sans-serif; }
    .info-row { display: flex; align-items: flex-end; }
    .dotted-line {
        border-bottom: 1px dotted #000;
        flex: 1;
        font-family: 'Kalam', 'Gujarati', cursive;
        color: #0f3c88;
        font-size: 16px;
        padding-left: 8px;
        margin-left: 5px;
    }
    .items-table { width: 100%; border-collapse: collapse; flex-grow: 1; display: flex; flex-direction: column; }
    .items-table thead tr { border-bottom: 2px solid #000; font-size: 14px; font-weight: bold; display: flex; width: 100%; font-family: 'Gujarati', sans-serif; }
    .items-table tbody { flex-grow: 1; display: flex; flex-direction: column; width: 100%; }
    .footer-section { display: flex; border-top: 2px solid #000; margin-top: auto; height: 300px; }
    .footer-left { width: 68%; border-right: 2px solid #000; padding: 8px; position: relative; display: flex; flex-direction: column; justify-content: space-between; }
    .footer-right { width: 32%; }
    .total-row { display: flex; border-bottom: 1px solid #000; padding: 4px 8px; font-size: 13px; font-family: 'Gujarati', sans-serif; }
    .gpay-text { position: absolute; top: 10px; left: 20px; font-family: 'Kalam', cursive; font-size: 28px; color: #0f3c88; opacity: 0.8; transform: rotate(-15deg); }
    .stamp-area { border-top: 2px solid #000; padding: 8px; text-align: center; position: relative; min-height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
    .stamp { position: absolute; top: 5px; color: #0f3c88; border: 2px dotted #0f3c88; border-radius: 8px; padding: 5px 8px; transform: rotate(-5deg); opacity: 0.9; background: rgba(238, 221, 130, 0.5); font-weight: bold; font-size: 12px; font-family: 'Gujarati', sans-serif; }
    .gujarati-text { font-family: 'Gujarati', sans-serif; }
    .kalam-text { font-family: 'Kalam', 'Gujarati', cursive; }
`;

const buildSingleBillHTML = (bill, settings = {}) => {
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
    <div class="bill-wrapper">
        <div class="bill-container">
            <div class="header-section">
                <div class="header-left">
                    <div style="text-align: center; font-weight: bold; margin-bottom: 8px;">TAX INVOICE<br/>CASH / DEBIT</div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span>Original</span>
                        <span>Duplicate</span>
                    </div>
                    <div style="font-weight: bold;">GSTIN - ${settings.gstin || '24BRNPM8073Q1ZU'}</div>
                    <div>${settings.stateInfo || 'State : Gujarat    Code : 24'}</div>
                </div>
                <div class="header-right">
                    <h1 class="gujarati-text" style="font-size: 28px; margin: 0 0 4px 0; color: #002060; font-weight: bold;">${settings.shopName || 'શ્રી હરિ ડ્રેસીસ & કટપીસ'}</h1>
                    <p style="font-size: 14px; margin: 0; font-weight: 600;">${settings.shopSubTitle || 'Wholesale & Retail'}</p>
                    <p class="gujarati-text" style="font-size: 14px; margin: 0 0 4px 0; font-weight: 600; white-space: pre-wrap;">${settings.shopAddress || 'માધવ પાર્ક ૧, શ્રી હરિ કોમ્પલેક્ષની બાજુમાં, આલાપ રોયલ પામની પાછળ,\nબાપાસીતારામ ચોક, મવડી, રાજકોટ - ૩૬૦ ૦૦૪.'}</p>
                </div>
            </div>

            <div class="customer-meta-section">
                <div class="customer-info">
                    <div class="info-row">
                        <div style="min-width: 40px; font-weight: bold;">મે. :</div>
                        <div class="dotted-line kalam-text">${bill.customerNameGujarati || bill.customerName || ''}</div>
                    </div>
                    <div class="info-row" style="margin-top: 4px;">
                        <div style="min-width: 60px; font-weight: bold;">એડ્રેસ :</div>
                        <div class="dotted-line kalam-text">${bill.customerAddressGujarati || bill.customerAddress || ''}</div>
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
                        <span style="width: 70px; font-weight: bold;">તા. :</span> <span class="kalam-text" style="color: #0f3c88; font-size: 15px; font-weight: bold;">${formatDate(bill.createdAt)}</span>
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
                    ${bill.items.map((item, idx) => `
                        <tr style="display: flex; width: 100%; font-family: 'Kalam', 'Gujarati', cursive; color: #0f3c88; font-size: 18px;">
                            <td style="padding: 6px 8px; border-right: 1px solid #000; width: 45%; text-align: left;">${item.name}</td>
                            <td style="padding: 6px 8px; border-right: 1px solid #000; width: 15%;"></td>
                            <td style="padding: 6px 8px; border-right: 1px solid #000; width: 10%; text-align: center;">${item.quantity}</td>
                            <td style="padding: 6px 8px; border-right: 2px solid #000; width: 12%; text-align: right;">${item.price.toFixed(0)}</td>
                            <td style="padding: 6px 8px; width: 18%; text-align: right;">${(item.price * item.quantity).toFixed(0)}</td>
                        </tr>
                    `).join('')}
                    ${emptyRowsHTML}
                </tbody>
            </table>

            <div class="footer-section">
                <div class="footer-left">
                    <div class="gpay-text">GPay</div>
                    <div style="margin-top: 60px; border-bottom: 1px solid #000; border-top: 1px solid #000; padding: 4px 0;">
                        <span class="kalam-text" style="color: #0f3c88; font-size: 20px; font-weight: bold;">${finalTotal}-only</span>
                    </div>
                    <div class="gujarati-text" style="font-size: 12px; font-weight: bold; line-height: 1.6; margin-top: 15px;">
                        ટર્મ્સ એન્ડ કન્ડિશન :<br/>${settings.terms1 || '૧. ન્યાયક્ષેત્ર રાજકોટ રહેશે.'}<br/>${settings.terms2 || '૨. ભૂલચૂક લેવી દેવી.'}
                    </div>
                </div>
                <div class="footer-right">
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">સબટોટલ (Subtotal)</span>
                        <span class="kalam-text" style="width: 35%; text-align: right; color: #0f3c88; font-size: 15px; font-weight: bold;">${bill.totalAmount.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">CGST 2.5%</span>
                        <span class="kalam-text" style="width: 35%; text-align: right; color: #0f3c88; font-size: 15px; font-weight: bold;">${bill.cgst.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">SGST 2.5%</span>
                        <span class="kalam-text" style="width: 35%; text-align: right; color: #0f3c88; font-size: 15px; font-weight: bold;">${bill.sgst.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">IGST %</span>
                        <span class="kalam-text" style="width: 35%; text-align: right; color: #0f3c88; font-size: 15px; font-weight: bold;"></span>
                    </div>
                    <div class="total-row" style="border-bottom: 2px solid #000;">
                        <span style="width: 65%; font-weight: bold;">રાઉન્ડ ઓફ</span>
                        <span class="kalam-text" style="width: 35%; text-align: right; color: #0f3c88; font-size: 15px; font-weight: bold;">${bill.roundOff >= 0 ? '+' : ''}${bill.roundOff.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; padding: 8px; font-family: 'Gujarati', sans-serif;">
                        <span style="width: 50%; font-weight: bold; font-size: 16px;">કુલ (Total)</span>
                        <span class="kalam-text" style="width: 50%; text-align: right; color: #0f3c88; font-size: 24px; font-weight: bold;">${finalTotal}/-</span>
                    </div>
                    <div class="stamp-area">
                        <div class="stamp">${settings.stampName || 'શ્રી હરિ ડ્રેસીસ & કટપીસ'}</div>
                        <span class="gujarati-text" style="font-weight: bold; font-size: 13px;">${settings.shopName || 'શ્રી હરિ ડ્રેસીસ & કટપીસ'}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
};

const buildBillHTML = (billOrBills, settings = {}) => {
    const isArray = Array.isArray(billOrBills);
    const bills = isArray ? billOrBills : [billOrBills];
    
    const billsHTML = bills.map(bill => buildSingleBillHTML(bill, settings)).join('');

    return `
<!DOCTYPE html>
<html lang="gu">
<head>
    <meta charset="UTF-8">
    <style>${getBillStyles()}</style>
</head>
<body>
    ${billsHTML}
</body>
</html>
    `;
};

const generateBillPdf = async (billOrBills, settings) => {
    const isArray = Array.isArray(billOrBills);
    const bills = isArray ? billOrBills : [billOrBills];
    
    let puppeteer;
    let chromium;
    const isWindows = process.platform === 'win32';

    // Try to load puppeteer (full) first on Windows, otherwise puppeteer-core
    try {
        if (isWindows) {
            puppeteer = require('puppeteer');
        } else {
            puppeteer = require('puppeteer-core');
            try {
                chromium = require('@sparticuz/chromium');
            } catch (e) {
                console.log('@sparticuz/chromium not found');
            }
        }
    } catch (e) {
        puppeteer = require('puppeteer-core');
    }

    const launchOptions = {
        args: chromium ? chromium.args : [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process',
            '--font-render-hinting=none' // Help with font rendering on Linux
        ],
        defaultViewport: chromium ? chromium.defaultViewport : null,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        headless: chromium ? chromium.headless : 'new'
    };

    console.log('--- PDF SYSTEM DIAGNOSTICS ---');
    console.log('Platform:', process.platform);
    
    // Auto-detect browser path if not provided
    if (!launchOptions.executablePath) {
        if (chromium) {
            try {
                launchOptions.executablePath = await chromium.executablePath();
            } catch (e) {
                console.log('Sparticuz failed to get path:', e.message);
            }
        }

        // If still no path, try local cache detection
        if (!launchOptions.executablePath) {
            const cacheDir = path.join(process.cwd(), '.cache', 'puppeteer');
            const findChrome = (dir) => {
                try {
                    if (!fs.existsSync(dir)) return null;
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
            launchOptions.executablePath = findChrome(cacheDir);
        }

        // Final fallbacks for Windows
        if (!launchOptions.executablePath && isWindows) {
            const commonPaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe')
            ];
            for (const p of commonPaths) {
                if (fs.existsSync(p)) {
                    launchOptions.executablePath = p;
                    break;
                }
            }
        }
    }

    console.log('Using Browser Path:', launchOptions.executablePath || 'BUNDLED');
    
    let browser;
    try {
        browser = await puppeteer.launch(launchOptions);
        console.log('Browser launched successfully');
    } catch (launchError) {
        console.error('BROWSER LAUNCH FAILURE:', launchError.message);
        throw new Error(`Failed to launch browser for PDF generation. ${isWindows ? 'Please ensure Chrome is installed.' : 'Check environment configuration.'}`);
    }

    try {
        console.log(`Generating PDF for ${bills.length} bills...`);
        const page = await browser.newPage();
        const html = buildBillHTML(bills, settings);
        
        // Set content and wait for fonts
        await page.setContent(html, { 
            waitUntil: 'load',
            timeout: 120000 
        });

        // CRITICAL: Wait for fonts to be ready in the browser
        await page.evaluateHandle('document.fonts.ready');
        
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });
        
        await page.close();
        return pdf;
    } catch (genError) {
        console.error('PDF GENERATION ERROR:', genError.message);
        throw genError;
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { generateBillPdf };

