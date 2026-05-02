const puppeteer = require('puppeteer-core');
const QRCode = require('qrcode');
const { numberToWords } = require('./numberToWords');
const Settings = require('../models/Settings');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const formatDate = (date) => date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'N/A';

const buildBillHTML = async (bill, settings = {}) => {
    const totalPcs = bill.items.reduce((a, i) => a + (i.pcs || 0), 0);
    const totalMeters = bill.items.reduce((a, i) => a + (i.meters || 0), 0);
    const logoInitial = bill.supplierName ? bill.supplierName.charAt(0).toUpperCase() : 'S';

    const logoUrl = settings.logo ? (settings.logo.startsWith('uploads') ? `http://localhost:5000/${settings.logo}` : settings.logo) : null;

    const emptyRows = Math.max(0, 10 - bill.items.length);

    const itemRows = bill.items.map((item, idx) => `
        <tr>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 10px;text-align:center;color:#64748b;">${idx + 1}</td>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 10px;text-align:left;font-weight:600;color:#0f172a;">${item.name || ''}</td>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 10px;text-align:center;color:#64748b;">${item.hsnCode || ''}</td>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 10px;text-align:right;color:#0f172a;font-weight:500;">${(item.pcs || 0).toFixed(2)}</td>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 10px;text-align:right;color:#0f172a;font-weight:500;">${(item.meters || 0).toFixed(2)}</td>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 10px;text-align:right;color:#64748b;">${(item.rate || 0).toFixed(2)}</td>
            <td style="border-bottom:1px solid #e2e8f0;padding:8px 10px;text-align:right;font-weight:700;color:#1e3a8a;background:#f8fafc;">${(item.amount || 0).toFixed(2)}</td>
        </tr>`).join('');

    const emptyRowsHTML = Array.from({ length: emptyRows }).map(() => `
        <tr>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 10px;height:30px;"></td>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;"></td>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;"></td>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;"></td>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;"></td>
            <td style="border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;"></td>
            <td style="border-bottom:1px solid #e2e8f0;background:#f8fafc;"></td>
        </tr>`).join('');

    const taxBlock = (bill.cgst > 0 || bill.sgst > 0) ? `
        <div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#64748b;font-size:11px;">
            <span>CGST (2.50%)</span><span style="color:#1e293b;">₹${(bill.cgst || 0).toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#64748b;font-size:11px;">
            <span>SGST (2.50%)</span><span style="color:#1e293b;">₹${(bill.sgst || 0).toFixed(2)}</span>
        </div>` : `
        <div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#64748b;font-size:11px;">
            <span>IGST (5.00%)</span><span style="color:#1e293b;">₹${(bill.igst || 0).toFixed(2)}</span>
        </div>`;

    let ewaySection = '';
    if (bill.ewayBillDetails?.uniqueNo) {
        let qrDataUrl = '';
        try {
            const qrStr = `E-Way Bill: ${bill.ewayBillDetails.uniqueNo}\nInvoice: ${bill.billNumber}\nAmount: ${bill.totalAmount}`;
            qrDataUrl = await QRCode.toDataURL(qrStr);
        } catch (e) {}

        const d = bill.ewayBillDetails;
        const makeRow = ([l, v]) => `
            <div style="display:grid;grid-template-columns:220px 1fr;border-bottom:1px solid #f1f5f9;padding:9px 0;">
                <span style="color:#64748b;font-weight:600;font-size:10px;text-transform:uppercase;">${l}</span>
                <span style="font-weight:700;color:#0f172a;">${v || 'N/A'}</span>
            </div>`;

        ewaySection = `
        <div style="page-break-before:always; background: #fff; padding: 40px;">
            <div style="border:1px solid #e2e8f0; padding:32px; border-radius:16px; position:relative; background:#fafafa;">
                <div style="text-align:center; margin-bottom:32px; border-bottom:3px solid #1e3a8a; padding-bottom:16px;">
                    <h1 style="color:#1e3a8a; margin:0; font-size:24px; font-weight:800;">E-WAY BILL SYSTEM</h1>
                    <h2 style="color:#3b82f6; margin:8px 0; font-size:14px; font-weight:700; letter-spacing:4px;">PART - A SLIP</h2>
                </div>
                ${qrDataUrl ? `<img src="${qrDataUrl}" style="position:absolute; top:32px; right:32px; width:100px; height:100px; border:1px solid #e2e8f0; padding:4px; background:#fff; border-radius:8px;" />` : ''}
                ${[
                    ['Unique No.', d.uniqueNo],
                    ['Entered Date', d.enteredDate],
                    ['Entered By', d.enteredBy],
                    ['Valid From', 'Not Valid for Movement as Part B is not entered'],
                ].map(makeRow).join('')}
                <div style="margin-top:32px; background:#1e3a8a; color:white; padding:10px 16px; border-radius:8px; font-weight:800; font-size:12px; letter-spacing:1px;">PART - A DETAILS</div>
                ${[
                    ['GSTIN of Supplier', d.supplierGstin],
                    ['Place of Dispatch', d.placeOfDispatch],
                    ['GSTIN of Recipient', d.recipientGstin],
                    ['Place of Delivery', d.placeOfDelivery],
                    ['Document No.', d.documentNo],
                    ['Document Date', d.documentDate],
                    ['Transaction Type', d.transactionType || 'Regular'],
                    ['Value of Goods', `₹${d.valueOfGoods?.toLocaleString('en-IN')}`],
                    ['HSN Code', d.hsnCode],
                    ['Reason for Transportation', d.reasonForTransportation || 'Outward - Supply'],
                    ['Transporter', d.transporter],
                ].map(makeRow).join('')}
                <p style="margin-top:40px; font-size:10px; color:#64748b; text-align:center; border-top:1px dashed #cbd5e1; padding-top:16px;">
                    Note: Information generated from official e-way bill system records.
                </p>
            </div>
        </div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Outfit', sans-serif; font-size: 12px; color: #1e293b; background: white; line-height: 1.5; }
        .page { padding: 40px; position: relative; }
        table { border-collapse: collapse; width: 100%; }
        th { background: #f8fafc; border-bottom: 2px solid #1e3a8a; border-right: 1px solid #e2e8f0; padding: 12px 8px; font-weight: 800; color: #0f172a; font-size: 10px; text-transform: uppercase; text-align: center; }
        th:last-child { border-right: none; }
        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; font-weight: 900; color: rgba(30, 58, 138, 0.03); z-index: -1; white-space: nowrap; pointer-events: none; }
    </style>
</head>
<body>
    <div class="watermark">PURCHASE RECORD</div>
    <div class="page">
        <p style="font-size:8px; color:#94a3b8; margin-bottom:16px; font-weight:600; letter-spacing:1px;">OFFICIAL MERCHANT RECORD</p>

        <div style="display:grid; grid-template-columns:1.5fr 1fr; border-bottom:4px solid #1e3a8a; padding-bottom:24px; margin-bottom:24px; align-items:center;">
            <div style="display:flex; align-items:center; gap:20px;">
                ${logoUrl ? `<img src="${logoUrl}" style="height:60px; max-width:180px; object-fit:contain;" />` : 
                `<div style="width:60px; height:60px; background:#1e3a8a; border-radius:12px; display:flex; align-items:center; justify-content:center; color:white; font-size:32px; font-weight:900;">${logoInitial}</div>`}
                <div>
                    <h1 style="font-size:32px; font-weight:800; color:#1e3a8a; line-height:1; margin-bottom:4px;">${bill.supplierName || ''}</h1>
                    <div style="background:#3b82f6; color:white; padding:2px 10px; border-radius:4px; font-size:10px; font-weight:800; letter-spacing:3px; display:inline-block;">PURCHASE INVOICE</div>
                </div>
            </div>
            <div style="text-align:right;">
                <p style="font-weight:800; font-size:14px; color:#0f172a;">GSTIN: ${bill.supplierGstin || 'N/A'}</p>
                <p style="color:#64748b; font-size:11px; max-width:280px; margin-left:auto;">${bill.supplierAddress || ''}</p>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1.2fr 1fr; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom:24px;">
            <div style="border-right:1px solid #e2e8f0;">
                <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:12px 16px; display:flex; justify-content:space-between;">
                    <span style="font-size:10px; font-weight:700; color:#64748b;">INVOICE DETAILS</span>
                    <span style="font-weight:800; color:#1e3a8a;">#${bill.billNumber}</span>
                </div>
                <div style="padding:16px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div>
                        <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase;">Invoice Date</p>
                        <p style="font-weight:700; font-size:12px;">${formatDate(bill.billDate)}</p>
                    </div>
                    <div>
                        <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase;">Transport</p>
                        <p style="font-weight:700; font-size:12px;">${bill.transport || 'N/A'}</p>
                    </div>
                </div>
            </div>
            <div>
                <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:12px 16px;">
                    <span style="font-size:10px; font-weight:700; color:#64748b;">LOGISTICS & BROKERAGE</span>
                </div>
                <div style="padding:16px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div>
                        <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase;">L R No.</p>
                        <p style="font-weight:700; font-size:12px;">${bill.lrNo || 'N/A'}</p>
                    </div>
                    <div>
                        <p style="font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase;">Broker</p>
                        <p style="font-weight:700; font-size:12px;">${bill.broker || 'DIRECT'}</p>
                    </div>
                </div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#f8fafc;">
                <p style="font-size:10px; font-weight:800; color:#1e3a8a; border-bottom:2px solid #1e3a8a; display:inline-block; margin-bottom:12px; letter-spacing:1px;">BILLED TO (RECIPIENT)</p>
                <p style="font-weight:800; font-size:14px; color:#0f172a;">${settings.shopName || 'SHREE HARI DRESSES'}</p>
                <p style="color:#64748b; font-size:11px; margin-top:4px;">${settings.shopAddress || 'MAVDI, RAJKOT - 360 004'}</p>
                <div style="margin-top:12px; display:flex; justify-content:space-between; font-size:10px; font-weight:700;">
                    <span style="color:#94a3b8;">GSTIN: <span style="color:#0f172a;">${settings.gstin || 'N/A'}</span></span>
                </div>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#f8fafc;">
                <p style="font-size:10px; font-weight:800; color:#1e3a8a; border-bottom:2px solid #1e3a8a; display:inline-block; margin-bottom:12px; letter-spacing:1px;">SHIP TO (DELIVERY)</p>
                <p style="font-weight:800; font-size:14px; color:#0f172a;">${settings.shopName || 'SHREE HARI DRESSES'}</p>
                <p style="color:#64748b; font-size:11px; margin-top:4px;">${settings.shopAddress || 'MAVDI, RAJKOT - 360 004'}</p>
                <div style="margin-top:12px; font-size:10px; font-weight:700; color:#94a3b8;">
                    PLACE OF SUPPLY: <span style="color:#0f172a;">GUJARAT (24)</span>
                </div>
            </div>
        </div>

        <div style="border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom:24px;">
            <table>
                <thead>
                    <tr>
                        <th style="width:40px;">SR</th>
                        <th style="text-align:left;">PRODUCT DESCRIPTION</th>
                        <th style="width:100px;">HSN CODE</th>
                        <th style="width:80px;">PCS</th>
                        <th style="width:80px;">METERS</th>
                        <th style="width:100px;">RATE</th>
                        <th style="width:120px; text-align:right;">AMOUNT (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                    ${emptyRowsHTML}
                    <tr style="background:#f1f5f9; font-weight:800;">
                        <td colspan="3" style="padding:12px; text-align:right; color:#1e3a8a;">TOTALS</td>
                        <td style="padding:12px; text-align:right; color:#1e3a8a;">${totalPcs.toFixed(2)}</td>
                        <td style="padding:12px; text-align:right; color:#1e3a8a;">${totalMeters.toFixed(2)}</td>
                        <td style="padding:12px;"></td>
                        <td style="padding:12px; text-align:right; color:#1e3a8a; font-size:14px;">₹${bill.subTotal.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:32px;">
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
                <p style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:8px;">REMARKS & NOTES</p>
                <p style="color:#1e293b; font-size:12px;">${bill.remarks || 'No special instructions recorded.'}</p>
                
                <div style="margin-top:24px; padding-top:16px; border-top:1px dashed #e2e8f0;">
                    <p style="font-size:10px; font-weight:800; color:#1e3a8a; text-transform:uppercase; margin-bottom:4px;">Amount in Words</p>
                    <p style="font-weight:700; color:#0f172a; text-transform:uppercase; font-size:11px;">${numberToWords(bill.totalAmount || 0)} ONLY</p>
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${taxBlock}
                <div style="display:flex; justify-content:space-between; padding:8px 14px; color:#64748b; font-weight:600;">
                    <span>ROUND OFF</span><span>₹${(bill.roundOff || 0).toFixed(2)}</span>
                </div>
                <div style="background:#1e3a8a; color:white; border-radius:12px; padding:20px; display:flex; justify-content:space-between; align-items:center; margin-top:12px; box-shadow:0 10px 15px -3px rgba(30, 58, 138, 0.2);">
                    <div>
                        <p style="font-size:9px; text-transform:uppercase; opacity:0.8; letter-spacing:1px;">GRAND TOTAL</p>
                        <p style="font-size:13px; font-weight:800;">NET PAYABLE</p>
                    </div>
                    <span style="font-size:28px; font-weight:800;">₹${bill.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>

        <div style="margin-top:48px; display:flex; justify-content:space-between; align-items:flex-end;">
            <div style="font-size:10px; color:#94a3b8; max-width:300px;">
                <p style="font-weight:700; color:#64748b; margin-bottom:4px;">DECLARATION</p>
                <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
            </div>
            <div style="text-align:right;">
                <p style="font-size:11px; font-weight:800; color:#1e3a8a; margin-bottom:40px;">For ${bill.supplierName || ''}</p>
                <div style="border-top:1px solid #1e3a8a; width:180px; margin-left:auto; padding-top:8px;">
                    <p style="font-size:9px; font-weight:700; color:#1e3a8a;">Authorized Signatory</p>
                </div>
            </div>
        </div>
    </div>
    ${ewaySection}
</body>
</html>`;
};

const generatePurchaseReportPdf = async (bills, month, year) => {
    const settings = await Settings.findOne().lean() || {};

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'shell',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    try {
        const page = await browser.newPage();
        
        let combinedHTML = '';
        for (const bill of bills) {
            const html = await buildBillHTML(bill, settings);
            combinedHTML += `<div style="page-break-after: always;">${html}</div>`;
        }

        await page.setContent(combinedHTML, { waitUntil: 'networkidle0' });
        
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
