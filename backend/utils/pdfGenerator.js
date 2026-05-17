const puppeteer = require('puppeteer-core');
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

const { numberToWords } = require('./numberToWords');

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
        -webkit-print-color-adjust: exact;
    }
    .bill-wrapper {
        width: 210mm;
        height: 297mm;
        padding: 5mm;
        background: #fff;
        page-break-after: always;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .bill-wrapper:last-child {
        page-break-after: auto;
    }
    .bill-container {
        width: 190mm;
        height: 282mm;
        background: #eedd82;
        color: black;
        padding: 10px;
        border: none;
        display: flex;
        flex-direction: column;
        page-break-inside: avoid;
    }
    .bill-inner-border {
        border: 2px solid #000;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        height: 100%;
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
    .footer-section { display: flex; border-top: 2px solid #000; margin-top: auto; min-height: 210px; }
    .footer-left { width: 68%; border-right: 2px solid #000; padding: 8px; position: relative; display: flex; flex-direction: column; justify-content: space-between; }
    .footer-right { width: 32%; }
    .total-row { display: flex; border-bottom: 1px solid #000; padding: 4px 8px; font-size: 13px; font-family: 'Gujarati', sans-serif; }
    .gpay-text { position: absolute; top: 10px; left: 20px; font-family: 'Kalam', cursive; font-size: 28px; color: #0f3c88; opacity: 0.8; transform: rotate(-15deg); }
    .stamp-area { border-top: 2px solid #000; padding: 8px; text-align: center; position: relative; min-height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
    .stamp { color: #0f3c88; border: 2px dotted #0f3c88; border-radius: 8px; padding: 5px 8px; transform: rotate(-5deg); opacity: 0.9; background: rgba(238, 221, 130, 0.5); font-weight: bold; font-size: 12px; font-family: 'Gujarati', sans-serif; margin-top: 5px; }
    .gujarati-text { font-family: 'Gujarati', sans-serif; }
    .kalam-text { font-family: 'Kalam', 'Gujarati', cursive; }
`;

const buildSingleBillHTML = (bill, settings = {}) => {
    const formatDate = (date) => 
        date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-') : 'N/A';

    const getInvoiceNumberValue = () => {
        const inv = bill.invoiceNumber;
        if (!inv) return bill.serialNumber || 1;
        const match = inv.match(/\d+$/);
        if (match) {
            const parsed = parseInt(match[0], 10);
            if (!isNaN(parsed)) return parsed;
        }
        const parsedAll = parseInt(inv.replace(/\D/g, ''), 10);
        if (!isNaN(parsedAll)) return parsedAll;
        return bill.serialNumber || 1;
    };

    const renderBookNo = () => {
        const val = getInvoiceNumberValue();
        const book = Math.floor((val - 1) / 100) + 1;
        return String(book).padStart(2, '0');
    };

    const renderBillNo = () => {
        const val = getInvoiceNumberValue();
        const num = ((val - 1) % 100) + 1;
        return String(num).padStart(3, '0');
    };

    const originalSubtotal = bill.items ? bill.items.reduce((sum, item) => sum + (item.price * item.quantity * (item.meter || 1)), 0) : 0;
    
    let discountValue = 0;
    if (bill.discountType === 'percentage') {
        discountValue = originalSubtotal * ((bill.discountAmount || 0) / 100);
    } else if (bill.discountType === 'flat') {
        discountValue = bill.discountAmount || 0;
    }
    
    const discountedSubtotal = originalSubtotal - discountValue;
    const gstAmount = (bill.cgst || 0) + (bill.sgst || 0);
    const totalWithGst = discountedSubtotal + gstAmount;

    const finalTotal = bill.actualTotal || bill.targetAmount || 0;

    const emptyRowsHTML = Array.from({length: Math.max(1, 8 - bill.items.length)}).map((_, i) => `
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
            <div class="bill-inner-border">
                <div class="header-section">
                <div class="header-left">
                    <div style="text-align: center; font-weight: bold; margin-bottom: 8px;">
                        ${bill.billType === 'return' ? 'CREDIT NOTE / RETURN' : 'TAX INVOICE'}<br/>
                        ${bill.paymentMode === 'online' ? 'ONLINE / GPAY' : (bill.paymentMode === 'credit' ? 'UDHAAR / CREDIT' : 'CASH')}
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span>Original</span>
                        <span>Duplicate</span>
                    </div>
                    <div style="font-weight: bold;">GSTIN - ${settings.gstin || '24BRNPM8073Q1ZU'}</div>
                    <div>${settings.stateInfo || 'State : Gujarat    Code : 24'}</div>
                </div>
                <div class="header-right">
                    <h1 style="font-size: 28px; margin: 0 0 4px 0; color: #002060; font-weight: bold;">${settings.shopName || 'SHREE HARI DRESSES & CUTPIS'}</h1>
                    <p style="font-size: 14px; margin: 0; font-weight: 600;">${settings.shopSubTitle || 'Wholesale & Retail'}</p>
                    <p style="font-size: 14px; margin: 0 0 4px 0; font-weight: 600; white-space: pre-wrap;">${settings.shopAddress || 'Madhav Park 1, Next to Shree Hari Complex,\nBehind Alap Royal Palm, Bapasitaram Chowk, Mavdi, Rajkot - 390 004.'}</p>
                </div>
            </div>

            <div class="customer-meta-section">
                <div class="customer-info">
                    <div class="info-row">
                        <div style="min-width: 40px; font-weight: bold;">To :</div>
                        <div class="dotted-line kalam-text">${bill.customerName || ''}</div>
                    </div>
                    <div class="info-row" style="margin-top: 4px;">
                        <div style="min-width: 60px; font-weight: bold;">Addr :</div>
                        <div class="dotted-line kalam-text">${bill.customerAddress || ''}</div>
                    </div>
                    <div style="display: flex; margin-top: 8px; border-top: 1px solid #000; padding-top: 4px;">
                        <div style="min-width: 60px; font-weight: bold;">GSTIN :</div>
                        <div style="flex: 1;"></div>
                        <div style="min-width: 60px; font-weight: bold;">State : Gujarat</div>
                        <div style="flex: 1;"></div>
                        <div style="min-width: 60px; font-weight: bold;">Code : 24</div>
                        <div style="flex: 2;"></div>
                    </div>
                </div>
                <div class="meta-info">
                    <div style="display: flex; padding: 6px 8px; border-bottom: 1px solid #000;">
                        <span style="width: 70px; font-weight: bold;">Book No :</span> <span style="color: #c00; font-weight: bold;">${renderBookNo()}</span>
                    </div>
                    <div style="display: flex; padding: 6px 8px; border-bottom: 1px solid #000;">
                        <span style="width: 70px; font-weight: bold;">Bill No :</span> <span style="color: #c00; font-weight: bold;">${renderBillNo()}</span>
                    </div>
                    <div style="display: flex; padding: 6px 8px;">
                        <span style="width: 70px; font-weight: bold;">Date :</span> <span class="kalam-text" style="color: #0f3c88; font-size: 15px; font-weight: bold;">${formatDate(bill.createdAt)}</span>
                    </div>
                </div>
            </div>

            <table class="items-table">
                <thead>
                    <tr style="display: flex; width: 100%;">
                        <th style="padding: 8px; border-right: 1px solid #000; width: 45%;">Item Description</th>
                        <th style="padding: 8px; border-right: 1px solid #000; width: 15%;">HSN Code</th>
                        <th style="padding: 8px; border-right: 1px solid #000; width: 10%;">Qty/Mtr</th>
                        <th style="padding: 8px; border-right: 2px solid #000; width: 12%;">Rate</th>
                        <th style="padding: 8px; width: 18%;">Amount Rs.</th>
                    </tr>
                </thead>
                <tbody>
                    ${bill.items.map((item, idx) => `
                        <tr style="display: flex; width: 100%; font-family: 'Kalam', 'Gujarati', cursive; color: #0f3c88; font-size: 18px;">
                            <td style="padding: 6px 8px; border-right: 1px solid #000; width: 45%; text-align: left;">${item.name}</td>
                            <td style="padding: 6px 8px; border-right: 1px solid #000; width: 15%; text-align: center;">${item.hsnCode || ''}</td>
                            <td style="padding: 6px 8px; border-right: 1px solid #000; width: 10%; text-align: center;">${item.quantity}</td>
                            <td style="padding: 6px 8px; border-right: 2px solid #000; width: 12%; text-align: right;">${item.price.toFixed(0)}</td>
                            <td style="padding: 6px 8px; width: 18%; text-align: right;">${(item.price * item.quantity).toFixed(0)}</td>
                        </tr>
                    `).join('')}
                    ${emptyRowsHTML}
                </tbody>
            </table>

            <div class="footer-section">
                <div class="footer-left" style="display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="position: relative; height: 100%; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 5px;">
                        ${bill.paymentMode === 'online' ? '<div class="gpay-text" style="position: absolute; top: 45px; left: 10px; font-size: 32px; opacity: 0.2; transform: rotate(-10deg);">GPay</div>' : ''}
                        
                        <div style="font-size: 10px; font-weight: bold; margin-bottom: 2px; position: relative; z-index: 1; color: #666;">Total Amount in Words:</div>
                        <div class="kalam-text" style="color: #0f3c88; font-size: 13px; border-bottom: 1px dotted rgba(0,0,0,0.1); padding-bottom: 4px; position: relative; z-index: 1; width: 95%;">
                            ${numberToWords(finalTotal)}
                        </div>

                        <div style="display: flex; align-items: center; margin-top: 55px; border-bottom: 1px solid #000; border-top: 1px solid #000; padding: 4px 0; width: 85%;">
                            <span class="kalam-text" style="color: #0f3c88; font-size: 20px; font-weight: bold;">${finalTotal}-only</span>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 10px 0;">
                        <div style="font-size: 11px; font-weight: bold; line-height: 1.6;">
                            Terms & Conditions:<br/>${settings.terms1 || '1. Subject to Rajkot Jurisdiction.'}<br/>${settings.terms2 || '2. E. & O.E.'}
                        </div>
                        <div class="kalam-text" style="font-size: 18px; color: #0f3c88; opacity: 0.8; padding-right: 40px;">
                            Thank You - Visit Again!
                        </div>
                    </div>
                </div>
                <div class="footer-right">
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">Sub Total</span>
                        <span class="kalam-text" style="width: 35%; text-align: right; color: #0f3c88; font-size: 15px; font-weight: bold;">${originalSubtotal.toFixed(2)}</span>
                    </div>
                    ${discountValue > 0 ? `
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">Discount (${bill.discountType === 'percentage' ? `${bill.discountAmount}%` : 'Flat'})</span>
                        <span class="kalam-text" style="width: 35%; text-align: right; color: #e11d48; font-size: 15px; font-weight: bold;">-${discountValue.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">CGST 2.5%</span>
                        <span class="kalam-text" style="width: 35%; text-align: right; color: #0f3c88; font-size: 15px; font-weight: bold;">${bill.cgst.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">SGST 2.5%</span>
                        <span class="kalam-text" style="width: 35%; text-align: right; color: #0f3c88; font-size: 15px; font-weight: bold;">${bill.sgst.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span style="width: 65%; font-weight: bold;">Total (with GST)</span>
                        <span class="kalam-text" style="width: 35%; text-align: right; color: #0f3c88; font-size: 15px; font-weight: bold;">${totalWithGst.toFixed(2)}</span>
                    </div>
                    <div class="total-row" style="border-bottom: 2px solid #000;">
                        <span style="width: 65%; font-weight: bold;">Round Off</span>
                        <span class="kalam-text" style="width: 35%; text-align: right; color: #0f3c88; font-size: 15px; font-weight: bold;">${bill.roundOff >= 0 ? '+' : ''}${(bill.roundOff || 0).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; padding: 8px;">
                        <span style="width: 50%; font-weight: bold; font-size: 16px;">Final Amount</span>
                        <span class="kalam-text" style="width: 50%; text-align: right; color: #0f3c88; font-size: 24px; font-weight: bold;">${finalTotal}/-</span>
                    </div>
                    <div class="stamp-area" style="min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative;">
                        <div class="stamp" style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-5deg); color: #0f3c88; border: 2px dotted #0f3c88; border-radius: 8px; padding: 4px 10px; opacity: 0.7; background: rgba(238, 221, 130, 0.4); font-weight: bold; font-size: 11px; white-space: nowrap;">${settings.stampName || 'SHREE HARI DRESSES & CUTPIS'}</div>
                        <div style="font-weight: bold; font-size: 12px; border-top: 1px solid rgba(0,0,0,0.3); width: 85%; padding-top: 4px;">Authorized Signatory</div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    </div>
    `;
};

// Auto-detect Chrome/Chromium path for both Local and Deployment (Render)
const getBrowserOptions = async () => {
    const isWindows = process.platform === 'win32';
    let chromium;

    if (!isWindows) {
        try {
            chromium = require('@sparticuz/chromium');
        } catch (e) {
            console.log('@sparticuz/chromium not found, falling back to puppeteer-core');
        }
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
        headless: chromium ? chromium.headless : 'shell',
    };

    if (!launchOptions.executablePath) {
        if (chromium) {
            launchOptions.executablePath = await chromium.executablePath();
        } else if (isWindows) {
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
        
        // If still not found, check local cache (installed by scripts/install-chrome.js)
        if (!launchOptions.executablePath) {
            const cacheDir = path.join(process.cwd(), '.cache', 'puppeteer');
            const findChrome = (dir) => {
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
                return null;
            };
            launchOptions.executablePath = findChrome(cacheDir);
        }
    }

    return launchOptions;
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
    
    const isWindows = process.platform === 'win32';
    const launchOptions = await getBrowserOptions();
    console.log('--- PDF SYSTEM DIAGNOSTICS ---');
    console.log('Platform:', process.platform);
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

