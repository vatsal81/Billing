const puppeteer = require('puppeteer-core');
const QRCode = require('qrcode');
const { numberToWords } = require('./numberToWords');
const Settings = require('../models/Settings');
const path = require('path');

const fs = require('fs');

// Auto-detect Chrome/Chromium path for both Local and Deployment (Render)
const getBrowserOptions = async () => {
    const isWindows = process.platform === 'win32';
    let puppeteerModule = puppeteer;
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

const formatDate = (date) => date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'N/A';

// Load fonts as Base64 to ensure they are available in Puppeteer (especially on Render)
const loadFontAsBase64 = (fontName) => {
    try {
        const fontPath = path.join(__dirname, fontName);
        if (fs.existsSync(fontPath)) {
            const base64 = fs.readFileSync(fontPath).toString('base64');
            return base64;
        }
    } catch (e) {
        console.error(`Error loading font ${fontName}:`, e.message);
    }
    return '';
};

const gujaratiBase64 = loadFontAsBase64('NotoSansGujarati-Regular.ttf');

const buildBillHTML = async (bill, settings = {}) => {
    const totalPcs = bill.items.reduce((a, i) => a + (i.pcs || 0), 0);
    const totalMeters = bill.items.reduce((a, i) => a + (i.meters || 0), 0);
    const logoInitial = bill.supplierName ? bill.supplierName.charAt(0).toUpperCase() : 'S';

    const formatDateInternal = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Generate real QR Codes
    const invoiceQRContent = `Invoice: ${bill.billNumber}\nDate: ${formatDateInternal(bill.billDate)}\nSupplier: ${bill.supplierName}\nAmount: ₹${bill.totalAmount}`;
    const invoiceQR = await QRCode.toDataURL(invoiceQRContent);

    let ewayQR = '';
    if (bill.ewayBillDetails?.uniqueNo) {
        ewayQR = await QRCode.toDataURL(`E-Way Bill Unique No: ${bill.ewayBillDetails.uniqueNo}`);
    }

    // Reduced to 10 rows to ensure footer fits on the first page
    const emptyRows = Math.max(0, 13 - bill.items.length);
    const itemRows = bill.items.map((item, idx) => `
        <tr>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;padding:5px 10px;text-align:center;color:#64748b;">${idx + 1}</td>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;padding:5px 10px;text-align:left;font-weight:700;color:#0f172a;">${item.name || ''}</td>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;padding:5px 10px;text-align:center;color:#64748b;">${item.hsnCode || ''}</td>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;padding:5px 10px;text-align:right;color:#0f172a;font-weight:500;">${(item.pcs || 0).toFixed(2)}</td>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;padding:5px 10px;text-align:right;color:#0f172a;font-weight:500;">${(item.meters || 0).toFixed(2)}</td>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;padding:5px 10px;text-align:right;color:#64748b;">${(item.rate || 0).toFixed(2)}</td>
            <td style="border-bottom:1px solid #e2e8f0;padding:5px 10px;text-align:right;font-weight:800;color:#1e3a8a;background:#f8fafc;">${(item.amount || 0).toFixed(2)}</td>
        </tr>`).join('');

    const emptyRowsHTML = Array.from({ length: emptyRows }).map(() => `
        <tr>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;padding:5px 10px;height:28px;">&nbsp;</td>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;">&nbsp;</td>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;">&nbsp;</td>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;">&nbsp;</td>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;">&nbsp;</td>
            <td style="border-right:1px solid #1e293b;border-bottom:1px solid #e2e8f0;">&nbsp;</td>
            <td style="border-bottom:1px solid #e2e8f0;background:#f8fafc;">&nbsp;</td>
        </tr>`).join('');

    let ewayPage = '';
    if (bill.ewayBillDetails?.uniqueNo) {
        const d = bill.ewayBillDetails;
        ewayPage = `
        <div class="sagar-bill-paper eway-second-page" style="page-break-before:always; background: #fff1f2; padding: 25px; margin-top: 0; min-height: 1100px; width: 800px; margin-left: auto; margin-right: auto;">
            <div style="border: 2px solid #fecaca; padding: 20px; height: 100%; border-radius: 12px; position: relative;">
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #fecaca; padding-bottom: 12px;">
                    <h1 style="color: #be185d; margin: 0; font-size: 20px;">E-Way Bill System</h1>
                    <h2 style="color: #be185d; margin: 6px 0; font-size: 22px; font-weight: bold;">Part - A Slip</h2>
                </div>

                <div style="position: absolute; top: 20px; right: 20px; width: 75px; height: 75px; background: #fff; border: 1px solid #fecaca; padding: 5px;">
                    <img src="${ewayQR}" style="width: 100%; height: 100%;" />
                </div>

                <div class="eway-details-grid" style="display: grid; gap: 8px;">
                    ${[
                ['Unique No.', d.uniqueNo, true],
                ['Entered Date', d.enteredDate],
                ['Entered By', d.enteredBy],
                ['Valid From', 'Not Valid for Movement as Part B is not entered', false, true],
            ].map(([l, v, b, r]) => `
                        <div style="display: flex; border-bottom: 1px solid #fecaca; padding: 6px 0;">
                            <span style="color: #6b7280; font-weight: bold; width: 180px; font-size:10px;">${l}</span>
                            <span style="${b ? 'font-weight:bold; font-size:13px;' : 'font-size:11px;'} ${r ? 'color:#be185d; font-style:italic;' : ''}">${v || 'N/A'}</span>
                        </div>`).join('')}

                    <div style="margin-top: 15px; background: #be185d; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size:10px; letter-spacing:1px;">PART - A DETAILS</div>

                    ${[
                ['GSTIN of Supplier', d.supplierGstin],
                ['Place of Dispatch', d.placeOfDispatch],
                ['GSTIN of Recipient', d.recipientGstin],
                ['Place of Delivery', d.placeOfDelivery],
                ['Document No.', d.documentNo, true],
                ['Document Date', d.documentDate],
                ['Transaction Type', d.transactionType || 'Regular'],
                ['Value of Goods', `₹${(d.valueOfGoods || 0).toLocaleString('en-IN')}`, true],
                ['HSN Code', d.hsnCode],
                ['Reason for Transportation', d.reasonForTransportation || 'Outward - Supply'],
                ['Transporter', d.transporter],
            ].map(([l, v, b]) => `
                        <div style="display: flex; border-bottom: 1px solid #fecaca; padding: 6px 0;">
                            <span style="color: #6b7280; font-weight: bold; width: 180px; font-size:10px;">${l}</span>
                            <span style="${b ? 'font-weight:bold;' : 'font-size:11px;'}">${v || 'N/A'}</span>
                        </div>`).join('')}
                </div>
            </div>
        </div>`;
    }

    return `
    <div class="sagar-bill-paper">
        <div class="document-type-header">ORIGINAL FOR RECIPIENT</div>
        <div class="bill-top-header">
            <div class="sagar-logo">
                <span class="logo-s">${logoInitial}</span>
                <div class="logo-text">
                    <h1 class="company-name">${bill.supplierName}</h1>
                    <p class="company-subtitle">TAX INVOICE</p>
                </div>
            </div>
            <div class="bill-header-contact">
                <p class="gstin">GSTIN : ${bill.supplierGstin || 'N/A'}</p>
                <p class="address-line">${bill.supplierAddress || ''}</p>
            </div>
        </div>

        <div class="bill-meta-grid">
            <div class="meta-left">
                <div class="meta-row"><span class="label">INV NO. :</span><span class="value highlight">${bill.billNumber}</span></div>
                <div class="meta-row"><span class="label">DATE :</span><span class="value">${formatDateInternal(bill.billDate)}</span></div>
                <div class="meta-row"><span class="label">TRANSPORT :</span><span class="value">${bill.transport || 'N/A'}</span></div>
            </div>
            <div class="meta-right">
                <div class="meta-row"><span class="label">E-WAY NO :</span><span class="value">${bill.ewayBillNo || (bill.ewayBillDetails?.uniqueNo) || 'N/A'}</span></div>
                <div class="meta-row"><span class="label">L R NO. :</span><span class="value">${bill.lrNo || 'N/A'}</span></div>
                <div class="meta-row"><span class="label">BROKER :</span><span class="value">${bill.broker || 'DIRECT'}</span></div>
            </div>
        </div>

        <div class="bill-party-grid">
            <div class="party-box billed-to">
                <div class="party-header">BILLED TO (BUYER)</div>
                <div class="party-content gujarati-text">
                    <p class="party-name">${settings.shopName || 'SHREE HARI DRESSES'}</p>
                    <p class="party-add">${settings.shopAddress || 'SHOP NO. 4, VARDHAMAN MARKET, SURAT'}</p>
                    <div class="party-meta-row"><span>CITY / DISTRICT : SURAT</span><span>STATE : GUJARAT (24)</span></div>
                    <div class="party-meta-row"><span>GSTIN : ${settings.gstin || 'N/A'}</span><span>PAN : ${settings.pan || 'N/A'}</span></div>
                </div>
            </div>
            <div class="party-box shipped-to">
                <div class="party-header">SHIPPED TO (CONSIGNEE)</div>
                <div class="party-content gujarati-text">
                    <p class="party-name">${settings.shopName || 'SHREE HARI DRESSES'}</p>
                    <p class="party-add">${settings.shopAddress || 'SHOP NO. 4, VARDHAMAN MARKET, SURAT'}</p>
                    <div class="party-meta-row"><span>CITY / DISTRICT : SURAT</span><span>STATE : GUJARAT (24)</span></div>
                    <div class="party-meta-row"><span>GSTIN : ${settings.gstin || 'N/A'}</span><span>PAN : ${settings.pan || 'N/A'}</span></div>
                </div>
            </div>
        </div>

        <div style="border: 1px solid #1e293b; margin-bottom: 10px; border-radius: 4px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead>
                    <tr>
                        <th style="width: 35px;">SR</th>
                        <th style="text-align: left;">DESCRIPTION</th>
                        <th style="width: 70px;">HSN</th>
                        <th style="width: 50px;">PCS</th>
                        <th style="width: 60px;">METERS</th>
                        <th style="width: 70px;">RATE</th>
                        <th style="width: 90px; text-align: right;">AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                    ${emptyRowsHTML}
                </tbody>
                <tfoot>
                    <tr style="background: #f1f5f9; border-top: 2px solid #1e3a8a;">
                        <td colspan="3" style="padding: 8px; text-align: right; font-weight: 800; color: #1e3a8a;">SUB TOTAL</td>
                        <td style="padding: 8px; text-align: right; font-weight: 800; color: #1e3a8a;">${totalPcs.toFixed(2)}</td>
                        <td style="padding: 8px; text-align: right; font-weight: 800; color: #1e3a8a;">${totalMeters.toFixed(2)}</td>
                        <td></td>
                        <td style="padding: 8px; text-align: right; font-weight: 900; color: #1e3a8a; font-size: 13px;">₹${(bill.subTotal || 0).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div style="flex-grow: 1;"></div> <!-- This spacer pushes the footer to the bottom -->

        <div class="bill-bottom-grid">
            <div class="bottom-left">
                <div class="remarks-section"><span class="label">REMARKS :</span><p class="value" style="margin:0">${bill.remarks || 'N/A'}</p></div>
                <div class="bank-details-box">
                    <div class="bank-header">MERCHANT CONTACT INFO</div>
                    <div style="margin-top: 5px;">
                        <p style="color: #1e3a8a; font-weight:bold; margin:0; font-size: 11px;">${bill.supplierName}</p>
                        <p style="margin:0; font-size: 9px;">GSTIN: ${bill.supplierGstin || 'N/A'}</p>
                        ${bill.supplierPan ? `<p style="margin:0; font-size: 9px;">PAN: ${bill.supplierPan}</p>` : ''}
                        <p style="margin:0; font-size: 9px;">ADDR: ${bill.supplierAddress || 'N/A'}</p>
                    </div>
                </div>
            </div>
            <div class="bottom-right">
                <div class="qr-section">
                    <img src="${invoiceQR}" class="qr-image" />
                </div>
                <div class="tax-totals-box">
                    ${(bill.cgst > 0 || bill.sgst > 0) ? `
                        <div class="tax-row"><span>CGST (2.5%)</span><span>₹${(bill.cgst || 0).toFixed(2)}</span></div>
                        <div class="tax-row"><span>SGST (2.5%)</span><span>₹${(bill.sgst || 0).toFixed(2)}</span></div>
                    ` : `
                        <div class="tax-row"><span>IGST (5%)</span><span>₹${(bill.igst || 0).toFixed(2)}</span></div>
                    `}
                    <div class="tax-row"><span>ROUND OFF</span><span>₹${(bill.roundOff || 0).toFixed(2)}</span></div>
                    <div class="grand-total-row">
                        <span style="font-size:9px;">TOTAL</span><span class="amount">₹${(bill.totalAmount || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="amount-words">
            <span class="label">WORDS:</span>
            <span class="words">${numberToWords(bill.totalAmount || 0)} ONLY</span>
        </div>

        <div class="tax-summary-table">
            <table>
                <thead>
                    <tr style="background: #1e3a8a; color: white;">
                        <th>TAXABLE</th><th>CGST</th><th>SGST</th><th>IGST</th><th style="background:#0f172a">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background: #f8fafc;">
                        <td style="font-weight:bold">₹${(bill.subTotal || 0).toFixed(2)}</td>
                        <td>₹${(bill.cgst || 0).toFixed(2)}</td>
                        <td>₹${(bill.sgst || 0).toFixed(2)}</td>
                        <td>₹${(bill.igst || 0).toFixed(2)}</td>
                        <td style="font-weight:900; color:#1e3a8a; font-size:13px; background:#f1f5f9">₹${(bill.totalAmount || 0).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px;">
            <div class="terms-section"><p class="terms-title">NOTES</p><li>Certified correct.</li></div>
            <div class="signature-box"><div style="height: 30px;"></div><p>For ${bill.supplierName}</p></div>
        </div>
    </div>
    ${ewayPage}
`;
};

const generatePurchaseReportPdf = async (bills, month, year) => {
    const settings = await Settings.findOne().lean() || {};

    const launchOptions = await getBrowserOptions();
    console.log('Launching browser with path:', launchOptions.executablePath);
    const browser = await puppeteer.launch(launchOptions);
    try {
        const page = await browser.newPage();

        const styles = `
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        @font-face {
            font-family: 'Gujarati';
            src: url(data:font/ttf;charset=utf-8;base64,${gujaratiBase64}) format('truetype');
            font-weight: normal;
            font-style: normal;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        body { font-family: 'Inter', sans-serif; font-size: 10px; color: #1e293b; background: white; margin: 0; padding: 0; }
        .gujarati-text { font-family: 'Gujarati', sans-serif; }
        .sagar-bill-paper {
            background: white;
            padding: 20px 30px;
            width: 800px;
            min-height: 1100px;
            margin: 0 auto;
            position: relative;
            display: flex;
            flex-direction: column;
        }
        .document-type-header { text-align: center; border: 1px solid #1e293b; border-bottom: none; padding: 4px; font-weight: 800; font-size: 8px; letter-spacing: 2px; background: #f8fafc; }
        .bill-top-header { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #1e293b; border-bottom: 3px solid #1e3a8a; padding: 10px 15px; align-items: center; }
        .sagar-logo { display: flex; align-items: center; gap: 10px; }
        .logo-s { font-size: 50px; font-weight: 900; color: #1e3a8a; line-height: 1; }
        .company-name { font-size: 24px; font-weight: 900; color: #1e3a8a; line-height: 1; margin: 0; }
        .company-subtitle { font-size: 12px; font-weight: 700; color: #3b82f6; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
        .bill-header-contact { text-align: right; }
        .gstin { font-weight: 800; font-size: 12px; color: #0f172a; margin-bottom: 2px !important; }
        .address-line { color: #475569; font-size: 9px; margin: 0; }
        .bill-meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #1e293b; border-top: none; }
        .meta-left { border-right: 1px solid #1e293b; }
        .meta-row { padding: 5px 10px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; }
        .meta-row:last-child { border-bottom: none; }
        .label { font-weight: 700; width: 100px; color: #64748b; font-size: 8px; text-transform: uppercase; }
        .value { font-weight: 600; color: #0f172a; font-size: 10px; }
        .value.highlight { font-weight: 800; color: #1e3a8a; font-size: 11px; }
        .bill-party-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #1e293b; border-top: none; margin-bottom: 10px; }
        .billed-to { border-right: 1px solid #1e293b; }
        .party-header { background: #1e3a8a; color: white; text-align: center; padding: 4px; font-weight: 800; letter-spacing: 2px; font-size: 9px; }
        .party-content { padding: 8px 12px; background: #f8fafc; min-height: 90px; }
        .party-name { font-weight: 800; font-size: 12px; margin-bottom: 4px; color: #1e3a8a; text-transform: uppercase; margin: 0; }
        .party-add { margin-bottom: 6px; line-height: 1.4; color: #475569; font-weight: 500; margin: 0; font-size: 9px; }
        .party-meta-row { display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px solid #e2e8f0; padding-top: 2px; font-size: 9px; color: #64748b; }
        .bill-bottom-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; border: 1px solid #1e293b; margin-bottom: 10px; }
        .bottom-left { border-right: 1px solid #1e293b; }
        .remarks-section { padding: 8px; border-bottom: 1px solid #e2e8f0; min-height: 45px; }
        .bank-details-box { padding: 8px; background: #f8fafc; }
        .bank-header { color: #1e3a8a; font-weight: 800; margin-bottom: 4px; font-size: 10px; border-bottom: 2px solid #1e3a8a; display: inline-block; }
        .bottom-right { display: grid; grid-template-columns: 100px 1fr; }
        .qr-section { border-right: 1px solid #e2e8f0; padding: 8px; display: flex; align-items: center; justify-content: center; }
        .qr-image { width: 90px; height: 90px; }
        .tax-row { display: flex; justify-content: space-between; padding: 5px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #64748b; }
        .grand-total-row { background: #1e3a8a; padding: 12px 12px; display: flex; justify-content: space-between; align-items: center; color: white; }
        .grand-total-row .amount { font-size: 20px; font-weight: 900; }
        .amount-words { padding: 8px 15px; border: 1px solid #1e293b; margin-bottom: 10px; display: flex; gap: 12px; background: #f8fafc; font-size: 11px; }
        .amount-words .words { font-weight: 800; color: #1e3a8a; text-transform: uppercase; }
        .tax-summary-table table { width: 100%; border-collapse: collapse; border: 1px solid #1e293b; margin-bottom: 10px; text-align: center; }
        .tax-summary-table th { background: #f1f5f9; color: #1e3a8a; font-weight: 800; padding: 6px; }
        .tax-summary-table td { padding: 6px; border: 1px solid #e2e8f0; font-weight: 600; }
        .terms-section { font-size: 9px; color: #64748b; line-height: 1.5; }
        .terms-title { font-weight: 800; color: #1e3a8a; margin-bottom: 4px; font-size: 10px; }
        .signature-box { text-align: center; width: 180px; border-top: 2px solid #1e3a8a; padding-top: 8px; margin-left: auto; }
        .signature-box p { font-weight: 800; color: #1e3a8a; text-transform: uppercase; font-size: 10px; margin: 0; }
        th { background: #f1f5f9; border-bottom: 2px solid #1e3a8a; border-right: 1px solid #1e293b; padding: 8px 8px; font-weight: 800; color: #0f172a; font-size: 10px; text-transform: uppercase; text-align: center; }
        .eway-second-page {
            page-break-before: always;
            background: #fff1f2;
            padding: 25px;
            margin-top: 0;
            min-height: 1100px;
            width: 800px;
            margin-left: auto;
            margin-right: auto;
        }
    </style>`;

        let combinedHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8">${styles}</head><body>`;
        for (const bill of bills) {
            const html = await buildBillHTML(bill, settings);
            combinedHTML += `<div style="page-break-after: always;">${html}</div>`;
        }
        combinedHTML += '</body></html>';

        await page.setContent(combinedHTML, { waitUntil: 'networkidle0' });
        
        // Wait for fonts to be ready
        await page.evaluateHandle('document.fonts.ready');

        const finalPdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();
        return finalPdf;

    } catch (err) {
        if (browser) await browser.close();
        throw err;
    }
};

const generateSingleBillPdf = (bill) => generatePurchaseReportPdf([bill], null, null);

module.exports = { generatePurchaseReportPdf, generateSingleBillPdf };
