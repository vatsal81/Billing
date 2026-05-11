import React from 'react';
import { X, Printer, Download, CheckCircle, ShieldCheck } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { numberToWords } from '../utils/numberToWords';
import { getBackendUrl, fetchPurchaseBill } from '../utils/api';
import './PurchaseBillView.css';

const PurchaseBillView = ({ billId, onClose, setFetchingBill }) => {
    const [bill, setBill] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [scale, setScale] = React.useState(1);

    React.useEffect(() => {
        if (billId) {
            const loadBill = async () => {
                try {
                    if (setFetchingBill) setFetchingBill(true);
                    setLoading(true);
                    const data = await fetchPurchaseBill(billId);
                    setBill(data);
                } catch (err) {
                    console.error('Error fetching bill:', err);
                    alert('Failed to load bill details');
                    onClose();
                } finally {
                    setLoading(false);
                    if (setFetchingBill) setFetchingBill(false);
                }
            };
            loadBill();
        }
    }, [billId]);

    React.useLayoutEffect(() => {
        const updateScale = () => {
            const padding = window.innerWidth < 768 ? 20 : 40;
            const availableWidth = window.innerWidth - padding;
            const targetWidth = 1000;
            if (availableWidth < targetWidth) {
                setScale(availableWidth / targetWidth);
            } else {
                setScale(1);
            }
        };

        window.addEventListener('resize', updateScale);
        updateScale();
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    if (loading || !bill) return null;

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const handlePrint = () => window.print();

    const handleDownloadPdf = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const response = await fetch(`${getBackendUrl()}/api/purchase/${bill._id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('PDF generation failed');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `PurchaseBill_${bill.billNumber}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to generate PDF: ' + err.message);
        }
    };

    const totalPcs = bill.items.reduce((acc, item) => acc + (item.pcs || 0), 0);
    const totalMeters = bill.items.reduce((acc, item) => acc + (item.meters || 0), 0);

    return (
        <div className="bill-view-overlay">
            <div className="bill-view-container">
                <div className="bill-view-header no-print" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    padding: '8px',
                    maxWidth: '600px',
                    width: '100%',
                    justifyContent: 'stretch'
                }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ padding: '8px 4px', fontSize: '0.8rem' }}><X size={14} /> <span>Close</span></button>
                    <button className="btn btn-secondary" onClick={handlePrint} style={{ padding: '8px 4px', fontSize: '0.8rem' }}><Printer size={14} /> <span>Print</span></button>
                    <button className="btn btn-primary" onClick={handleDownloadPdf} style={{ padding: '8px 4px', fontSize: '0.8rem' }}><Download size={14} /> <span>PDF</span></button>
                </div>

                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'visible' }}>
                    <div className="bill-scale-wrapper" style={{ 
                        width: '1000px',
                        // Primary scaling via zoom (adjusts layout height correctly)
                        zoom: scale,
                        WebkitZoom: scale,
                        // Fallback for browsers that don't support zoom (like Firefox)
                        transform: !('zoom' in document.body.style) ? `scale(${scale})` : 'none',
                        transformOrigin: 'top center',
                        transition: 'zoom 0.2s ease-out, transform 0.2s ease-out'
                    }}>
                        <div className="sagar-bill-paper" id="printable-bill">
                    {/* Document Type Header */}
                    <div className="document-type-header">
                        <span>ORIGINAL FOR RECIPIENT</span>
                    </div>

                    {/* Header Section */}
                    <div className="bill-top-header">
                        <div className="bill-logo-section">
                            <div className="sagar-logo">
                                <span className="logo-s">{bill.supplierName ? bill.supplierName.charAt(0) : 'S'}</span>
                                <div className="logo-text">
                                    <h1 className="company-name" style={{ fontSize: '32px' }}>{bill.supplierName}</h1>
                                    <p className="company-subtitle">TAX INVOICE</p>
                                </div>
                            </div>
                        </div>
                        <div className="bill-header-motto">
                            <span>Supplier Invoice Copy</span>
                        </div>
                        <div className="bill-header-contact">
                            <p className="gstin">GSTIN : {bill.supplierGstin || 'N/A'}</p>
                            <p className="address-line">{bill.supplierAddress}</p>
                            <p className="msme">Authorized Merchant Record</p>
                        </div>
                    </div>

                    {/* Meta Data Grid */}
                    <div className="bill-meta-grid">
                        <div className="meta-left">
                            <div className="meta-row-group">
                                <div className="meta-row half">
                                    <span className="label">INVOICE NO. :</span>
                                    <span className="value highlight">{bill.billNumber}</span>
                                </div>
                                <div className="meta-row half">
                                    <span className="label">INVOICE DATE :</span>
                                    <span className="value">{formatDate(bill.billDate)}</span>
                                </div>
                            </div>
                            <div className="meta-row">
                                <span className="label">TRANSPORT :</span>
                                <span className="value">{bill.transport || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="meta-right">
                            <div className="meta-row">
                                <span className="label">E-WAY BILL NO :</span>
                                <span className="value">{bill.ewayBillNo || (bill.ewayBillDetails?.uniqueNo) || 'N/A'}</span>
                            </div>
                            <div className="meta-row">
                                <span className="label">TRANSPORT :</span>
                                <span className="value">{bill.transport || 'N/A'}</span>
                            </div>
                            <div className="meta-row">
                                <span className="label">L R NO. :</span>
                                <span className="value">{bill.lrNo || 'N/A'}</span>
                            </div>
                            <div className="meta-row">
                                <span className="label">BROKER :</span>
                                <span className="value">{bill.broker || 'DIRECT'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Party Details */}
                    <div className="bill-party-grid">
                        <div className="party-box billed-to">
                            <div className="party-header">BILLED TO (BUYER)</div>
                            <div className="party-content">
                                <p className="party-name">SHREE HARI DRESSES</p>
                                <p className="party-add">SHOP NO. 4, VARDHAMAN MARKET, NEAR STATION ROAD,</p>
                                <div className="party-meta-row">
                                    <span>CITY / DISTRICT : SURAT</span>
                                    <span>STATE : GUJARAT (24)</span>
                                </div>
                                <div className="party-meta-row">
                                    <span>GSTIN : 24ABCPD1234F1Z1</span>
                                    <span>PAN : ABCPD1234F</span>
                                </div>
                            </div>
                        </div>
                        <div className="party-box shipped-to">
                            <div className="party-header">SHIPPED TO (CONSIGNEE)</div>
                            <div className="party-content">
                                <p className="party-name">SHREE HARI DRESSES</p>
                                <p className="party-add">SHOP NO. 4, VARDHAMAN MARKET, NEAR STATION ROAD,</p>
                                <div className="party-meta-row">
                                    <span>CITY / DISTRICT : SURAT</span>
                                    <span>STATE : GUJARAT (24)</span>
                                </div>
                                <div className="party-meta-row">
                                    <span>GSTIN : 24ABCPD1234F1Z1</span>
                                    <span>PAN : ABCPD1234F</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Outer wrapper — single shared border for table + subtotal row */}
                    <div style={{ border: '1px solid #1e293b', marginBottom: '15px', borderRadius: '4px', overflow: 'hidden' }}>
                        <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '12px' }}>
                            <colgroup>
                                <col style={{ width: '45px' }} />
                                <col style={{ width: '315px' }} />
                                <col style={{ width: '90px' }} />
                                <col style={{ width: '80px' }} />
                                <col style={{ width: '90px' }} />
                                <col style={{ width: '90px' }} />
                                <col />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style={{ background: '#f1f5f9', borderBottom: '2px solid #1e3a8a', borderRight: '1px solid #1e293b', padding: '12px 8px', fontWeight: '800', color: '#0f172a', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>SR</th>
                                    <th style={{ background: '#f1f5f9', borderBottom: '2px solid #1e3a8a', borderRight: '1px solid #1e293b', padding: '12px 8px', fontWeight: '800', color: '#0f172a', fontSize: '11px', textTransform: 'uppercase', textAlign: 'left' }}>PRODUCT DESCRIPTION</th>
                                    <th style={{ background: '#f1f5f9', borderBottom: '2px solid #1e3a8a', borderRight: '1px solid #1e293b', padding: '12px 8px', fontWeight: '800', color: '#0f172a', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>HSN CODE</th>
                                    <th style={{ background: '#f1f5f9', borderBottom: '2px solid #1e3a8a', borderRight: '1px solid #1e293b', padding: '12px 8px', fontWeight: '800', color: '#0f172a', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>PCS</th>
                                    <th style={{ background: '#f1f5f9', borderBottom: '2px solid #1e3a8a', borderRight: '1px solid #1e293b', padding: '12px 8px', fontWeight: '800', color: '#0f172a', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>METERS</th>
                                    <th style={{ background: '#f1f5f9', borderBottom: '2px solid #1e3a8a', borderRight: '1px solid #1e293b', padding: '12px 8px', fontWeight: '800', color: '#0f172a', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>RATE</th>
                                    <th style={{ background: '#f1f5f9', borderBottom: '2px solid #1e3a8a', padding: '12px 8px', fontWeight: '800', color: '#0f172a', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>AMOUNT (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bill.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#0f172a' }}>
                                            {item.nameEnglish && item.name && item.nameEnglish !== item.name 
                                                ? `${item.nameEnglish}( ${item.name} )` 
                                                : (item.name || item.nameEnglish || 'N/A')}
                                        </td>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{item.hsnCode}</td>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{item.pcs ? item.pcs.toFixed(2) : '0.00'}</td>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{item.meters ? item.meters.toFixed(2) : '0.00'}</td>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>{item.rate ? item.rate.toFixed(2) : '0.00'}</td>
                                        <td style={{ borderBottom: '1px solid #e2e8f0', padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: '#1e3a8a', background: '#f8fafc' }}>{item.amount ? item.amount.toFixed(2) : '0.00'}</td>
                                    </tr>
                                ))}
                                {[...Array(Math.max(0, 10 - bill.items.length))].map((_, i) => (
                                    <tr key={`empty-${i}`}>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px', height: '35px' }}>&nbsp;</td>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px' }}>&nbsp;</td>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px' }}>&nbsp;</td>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px' }}>&nbsp;</td>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px' }}>&nbsp;</td>
                                        <td style={{ borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 12px' }}>&nbsp;</td>
                                        <td style={{ borderBottom: '1px solid #e2e8f0', padding: '10px 12px', background: '#f8fafc' }}>&nbsp;</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <td colSpan="3" style={{ borderTop: '2px solid #1e3a8a', padding: '12px', textAlign: 'right', fontWeight: '800', color: '#1e3a8a', fontSize: '12px' }}>SUB TOTAL</td>
                                    <td style={{ borderTop: '2px solid #1e3a8a', borderLeft: '1px solid #e2e8f0', padding: '12px', textAlign: 'right', fontWeight: '800', color: '#1e3a8a', fontSize: '13px' }}>{totalPcs.toFixed(2)}</td>
                                    <td style={{ borderTop: '2px solid #1e3a8a', borderLeft: '1px solid #e2e8f0', padding: '12px', textAlign: 'right', fontWeight: '800', color: '#1e3a8a', fontSize: '13px' }}>{totalMeters.toFixed(2)}</td>
                                    <td style={{ borderTop: '2px solid #1e3a8a', borderLeft: '1px solid #e2e8f0', padding: '12px' }}></td>
                                    <td style={{ borderTop: '2px solid #1e3a8a', borderLeft: '1px solid #e2e8f0', padding: '12px', textAlign: 'right', fontWeight: '900', color: '#1e3a8a', fontSize: '15px' }}>₹{(bill.subTotal || 0).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>


                    {/* Footer Section */}
                    <div className="bill-bottom-grid">
                        <div className="bottom-left">
                            <div className="remarks-section">
                                <span className="label">REMARKS :</span>
                                <p className="value" style={{ margin: 0 }}>{bill.remarks || 'N/A'}</p>
                            </div>
                            <div className="watermark"></div>

                            <div className="bank-details-box">
                                <div className="bank-header">MERCHANT CONTACT INFO</div>
                                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                                    <div>
                                        <p style={{ color: '#1e3a8a' }}>{bill.supplierName}</p>
                                        <p>GSTIN: {bill.supplierGstin || 'N/A'}</p>
                                        {bill.supplierPan && <p>PAN: {bill.supplierPan}</p>}
                                        <p>ADDR: {bill.supplierAddress}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bottom-right">
                            <div className="qr-section">
                                <QRCodeCanvas 
                                    value={`Invoice: ${bill.billNumber}\nDate: ${formatDate(bill.billDate)}\nSupplier: ${bill.supplierName}\nAmount: ₹${bill.totalAmount}`}
                                    size={95}
                                    level="H"
                                />
                            </div>
                            <div className="tax-totals-box">
                                {(bill.cgst > 0 || bill.sgst > 0) ? (
                                    <>
                                        <div className="tax-row">
                                            <span>CGST (2.50%)</span>
                                            <span className="right">₹{(bill.cgst || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="tax-row">
                                            <span>SGST (2.50%)</span>
                                            <span className="right">₹{(bill.sgst || 0).toFixed(2)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="tax-row">
                                        <span>IGST (5.00%)</span>
                                        <span className="right">₹{(bill.igst || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="tax-row">
                                    <span>ROUND OFF</span>
                                    <span className="right">₹{(bill.roundOff || 0).toFixed(2)}</span>
                                </div>
                                <div className="grand-total-row">
                                    <div>
                                        <p style={{ fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Net Payable</p>
                                        <span style={{ fontSize: '11px' }}>TOTAL AMOUNT</span>
                                    </div>
                                    <span className="amount">₹{(bill.totalAmount || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="amount-words">
                        <span className="label">AMOUNT IN WORDS:</span>
                        <span className="words">{numberToWords(bill.totalAmount || 0)}</span>
                    </div>

                    <div className="tax-summary-table" style={{ marginTop: '20px' }}>
                        <table style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
                                    <th style={{ padding: '8px', fontSize: '10px' }}>TAXABLE VALUE</th>
                                    <th style={{ padding: '8px', fontSize: '10px' }}>CGST</th>
                                    <th style={{ padding: '8px', fontSize: '10px' }}>SGST</th>
                                    <th style={{ padding: '8px', fontSize: '10px' }}>IGST</th>
                                    <th style={{ padding: '8px', fontSize: '10px' }}>TCS</th>
                                    <th style={{ padding: '8px', fontSize: '10px', backgroundColor: '#0f172a' }}>GRAND TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <td style={{ padding: '10px', fontWeight: 'bold' }}>₹{(bill.subTotal || 0).toFixed(2)}</td>
                                    <td style={{ padding: '10px' }}>₹{(bill.cgst || 0).toFixed(2)}</td>
                                    <td style={{ padding: '10px' }}>₹{(bill.sgst || 0).toFixed(2)}</td>
                                    <td style={{ padding: '10px' }}>₹{(bill.igst || 0).toFixed(2)}</td>
                                    <td style={{ padding: '10px' }}>0.00</td>
                                    <td style={{ padding: '10px', fontWeight: '900', color: '#1e3a8a', fontSize: '14px', backgroundColor: '#f1f5f9' }}>₹{(bill.totalAmount || 0).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div className="terms-section">
                            <p className="terms-title">NOTES</p>
                            <ol>
                                <li>Certified that the particulars given above are true and correct.</li>
                                <li>Inventory stock has been updated in the system.</li>
                                <li>Purchase record for administrative purposes.</li>
                            </ol>
                        </div>
                        <div className="signature-section">
                            <div className="signature-box">
                                <div style={{ height: '40px' }}></div>
                                <p>For {bill.supplierName}</p>
                                <p style={{ fontSize: '8px', marginTop: '5px' }}>(Authorized Signatory)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Second Page: E-Way Bill Part-A Slip */}
                {bill.ewayBillDetails?.uniqueNo && (
                    <div className="sagar-bill-paper eway-second-page" style={{ pageBreakBefore: 'always', marginTop: '40px', minHeight: '1000px', background: '#fff1f2', padding: '40px' }}>
                        <div style={{ border: '2px solid #fecaca', padding: '30px', height: '100%', borderRadius: '15px', position: 'relative' }}>
                            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid #fecaca', paddingBottom: '20px' }}>
                                <h1 style={{ color: '#be185d', margin: 0, fontSize: '24px' }}>E-Way Bill System</h1>
                                <h2 style={{ color: '#be185d', margin: '10px 0', fontSize: '28px', fontWeight: 'bold' }}>Part - A Slip</h2>
                            </div>

                            <div style={{ position: 'absolute', top: '30px', right: '30px', width: '100px', height: '100px', background: '#fff', border: '1px solid #fecaca', padding: '5px' }}>
                                <QRCodeCanvas 
                                    value={`E-Way Bill: ${bill.ewayBillDetails.uniqueNo}`}
                                    size={90}
                                    level="H"
                                />
                            </div>

                            <div className="eway-details-grid" style={{ display: 'grid', gap: '15px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Unique No.</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{bill.ewayBillDetails.uniqueNo}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Entered Date</span>
                                    <span>{bill.ewayBillDetails.enteredDate}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Entered By</span>
                                    <span>{bill.ewayBillDetails.enteredBy}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Valid From</span>
                                    <span style={{ color: '#be185d', fontStyle: 'italic' }}>Not Valid for Movement as Part B is not entered</span>
                                </div>

                                <div style={{ marginTop: '30px', background: '#be185d', color: 'white', padding: '8px 15px', borderRadius: '4px', fontWeight: 'bold' }}>Part - A Details</div>

                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>GSTIN of Supplier</span>
                                    <span>{bill.ewayBillDetails.supplierGstin}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Place of Dispatch</span>
                                    <span>{bill.ewayBillDetails.placeOfDispatch}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>GSTIN of Recipient</span>
                                    <span>{bill.ewayBillDetails.recipientGstin}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Place of Delivery</span>
                                    <span>{bill.ewayBillDetails.placeOfDelivery}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Document No.</span>
                                    <span style={{ fontWeight: 'bold' }}>{bill.ewayBillDetails.documentNo}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Document Date</span>
                                    <span>{bill.ewayBillDetails.documentDate}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Transaction Type</span>
                                    <span>{bill.ewayBillDetails.transactionType || 'Regular'}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Value of Goods</span>
                                    <span style={{ fontWeight: 'bold' }}>₹{bill.ewayBillDetails.valueOfGoods}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>HSN Code</span>
                                    <span>{bill.ewayBillDetails.hsnCode}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Reason for Transportation</span>
                                    <span>{bill.ewayBillDetails.reasonForTransportation || 'Outward - Supply'}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid #fecaca', padding: '10px 0' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 'bold' }}>Transporter</span>
                                    <span>{bill.ewayBillDetails.transporter}</span>
                                </div>
                            </div>

                            <p style={{ marginTop: '40px', fontSize: '10px', color: '#9f1239', fontStyle: 'italic' }}>
                                Note: If any discrepancy in information please try after sometime.
                            </p>
                        </div>
                    </div>
                )}
                </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseBillView;
