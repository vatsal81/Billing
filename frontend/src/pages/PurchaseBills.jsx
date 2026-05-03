import React, { useState, useEffect } from 'react';
import { Plus, Download, FileText, ShoppingBag, Calendar, User, Hash, Trash2, Save, Search, Building, Truck, Briefcase, Eye } from 'lucide-react';
import { fetchPurchaseBills, createPurchaseBill, downloadPurchaseReport, fetchSuppliers, deletePurchaseBill, getBackendUrl } from '../utils/api';
import PurchaseBillView from './PurchaseBillView';
import '../index.css';

const PurchaseBills = () => {
    const [bills, setBills] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [viewingBill, setViewingBill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);

    const [newBill, setNewBill] = useState({
        billNumber: '',
        supplierId: null,
        supplierName: '',
        supplierGstin: '',
        supplierPan: '',
        supplierAddress: '',
        ewayBillNo: '',
        billDate: new Date().toISOString().split('T')[0],
        ewayBillDetails: {
            uniqueNo: '',
            enteredDate: '',
            enteredBy: '',
            supplierGstin: '',
            placeOfDispatch: '',
            recipientGstin: '',
            placeOfDelivery: '',
            documentNo: '',
            documentDate: '',
            transactionType: 'Regular',
            valueOfGoods: 0,
            hsnCode: '',
            reasonForTransportation: 'Outward - Supply',
            transporter: ''
        },
        transport: '',
        lrNo: '',
        broker: '',
        items: [{ name: '', nameEnglish: '', hsnCode: '', pcs: 0, meters: 0, rate: 0, amount: 0 }],
        subTotal: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        roundOff: 0,
        totalAmount: 0,
        remarks: '',
        billImage: '',
        ewayBillImage: '',
        gstRate: 5,
        isTaxLocked: false,
        showEwayBill: false,
        taxType: 'local' // 'local' (CGST+SGST) or 'interstate' (IGST)
    });

    useEffect(() => {
        loadBills();
        loadSuppliers();
    }, []);

    const loadBills = async () => {
        try {
            setLoading(true);
            const data = await fetchPurchaseBills();
            setBills(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching bills:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e, fieldName) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File is too large! Please upload a file smaller than 5MB.");
                return;
            }
            // Store the file object for FormData
            setNewBill(prev => ({ ...prev, [fieldName]: file }));
            
            // Also create a preview URL for the UI
            const previewUrl = URL.createObjectURL(file);
            if (fieldName === 'billImage') setBillPreview(previewUrl);
            else if (fieldName === 'ewayBillImage') setEwayPreview(previewUrl);
        }
    };

    const [billPreview, setBillPreview] = useState(null);
    const [ewayPreview, setEwayPreview] = useState(null);

    const loadSuppliers = async () => {
        try {
            const data = await fetchSuppliers();
            setSuppliers(data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const handleDeleteBill = async (id) => {
        if (!window.confirm('Are you sure you want to delete this bill? Stock will be reversed.')) return;
        try {
            await deletePurchaseBill(id);
            loadBills();
        } catch (error) {
            alert('Failed to delete bill: ' + error.message);
        }
    };

    const handleSupplierSelect = (name) => {
        const supplier = suppliers.find(s => s.name === name);
        if (supplier) {
            // Extract city from address for E-way bill
            const addressParts = (supplier.address || '').split(',');
            const city = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : (supplier.address || '');

            setNewBill({
                ...newBill,
                supplierId: supplier._id,
                supplierName: supplier.name,
                supplierGstin: supplier.gstin,
                supplierPan: supplier.pan || '',
                supplierAddress: supplier.address || '',
                ewayBillDetails: {
                    ...newBill.ewayBillDetails,
                    supplierGstin: supplier.gstin || '',
                    placeOfDispatch: city || ''
                }
            });
        } else {
            setNewBill({ ...newBill, supplierName: name, supplierId: null });
        }
    };

    const handleAddItem = () => {
        setNewBill({
            ...newBill,
            items: [...newBill.items, { name: '', hsnCode: '', pcs: 0, meters: 0, rate: 0, amount: 0 }]
        });
    };

    const handleRemoveItem = (index) => {
        const updatedItems = newBill.items.filter((_, i) => i !== index);
        calculateTotals(updatedItems, newBill.igst, newBill.cgst, newBill.sgst, newBill.roundOff);
    };

    const transliterateToGujarati = async (index, text) => {
        if (!text) return;
        try {
            const response = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=gu-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`);
            const data = await response.json();
            if (data && data[0] === 'SUCCESS' && data[1][0][1][0]) {
                const gujaratiText = data[1][0][1][0];
                
                setNewBill(prev => {
                    const updatedItems = [...prev.items];
                    updatedItems[index].name = gujaratiText;
                    return { ...prev, items: updatedItems };
                });
            }
        } catch (error) {
            console.error('Transliteration failed:', error);
        }
    };

    const handleItemChange = (index, field, value) => {
        setNewBill(prev => {
            const updatedItems = [...prev.items];
            updatedItems[index][field] = value;

            if (field === 'pcs' || field === 'meters' || field === 'rate') {
                const meters = parseFloat(updatedItems[index].meters) || 0;
                const pcs = parseFloat(updatedItems[index].pcs) || 0;
                const rate = parseFloat(updatedItems[index].rate) || 0;
                const qty = meters || pcs || 0;
                updatedItems[index].amount = qty * rate;
            }

            // Also update totals
            const subTotal = updatedItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
            
            let iVal = Number(prev.igst);
            let cVal = Number(prev.cgst);
            let sVal = Number(prev.sgst);

            if (!prev.isTaxLocked) {
                const totalTaxRate = (prev.gstRate || 5) / 100;
                if (prev.taxType === 'local') {
                    iVal = 0;
                    cVal = (subTotal * totalTaxRate) / 2;
                    sVal = (subTotal * totalTaxRate) / 2;
                } else {
                    iVal = subTotal * totalTaxRate;
                    cVal = 0;
                    sVal = 0;
                }
            }

            const totalAmount = subTotal + iVal + cVal + sVal + Number(prev.roundOff);
            const isMandatory = totalAmount > 49999;

            return { 
                ...prev, 
                items: updatedItems, 
                subTotal, 
                igst: iVal, 
                cgst: cVal, 
                sgst: sVal, 
                totalAmount,
                showEwayBill: isMandatory ? true : prev.showEwayBill
            };
        });

        // Trigger transliteration outside of the state update
        if (field === 'nameEnglish' && value.trim()) {
            transliterateToGujarati(index, value);
        }
    };

    const calculateTotals = (items, igst, cgst, sgst, roundOff) => {
        const subTotal = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

        let iVal = Number(igst);
        let cVal = Number(cgst);
        let sVal = Number(sgst);

        // If tax is not locked, auto-calculate based on GST Rate
        if (!newBill.isTaxLocked) {
            const totalTaxRate = (newBill.gstRate || 5) / 100;
            if (newBill.taxType === 'local') {
                iVal = 0;
                cVal = (subTotal * totalTaxRate) / 2;
                sVal = (subTotal * totalTaxRate) / 2;
            } else {
                iVal = subTotal * totalTaxRate;
                cVal = 0;
                sVal = 0;
            }
        }

        const rVal = Number(roundOff) || 0;
        const total = subTotal + iVal + cVal + sVal + rVal;

        // Auto-activate E-way bill if > 49999
        const isMandatory = total > 49999;

        setNewBill(prev => ({
            ...prev,
            items,
            subTotal,
            totalAmount: total,
            igst: iVal,
            cgst: cVal,
            sgst: sVal,
            roundOff: rVal,
            showEwayBill: isMandatory ? true : prev.showEwayBill,
            ewayBillDetails: {
                ...prev.ewayBillDetails,
                documentNo: prev.billNumber || prev.ewayBillDetails.documentNo,
                documentDate: prev.billDate || prev.ewayBillDetails.documentDate,
                valueOfGoods: total,
                supplierGstin: prev.supplierGstin || prev.ewayBillDetails.supplierGstin,
                recipientGstin: '24ABCPD1234F1Z1', // Hardcoded for Shree Hari
                placeOfDelivery: 'MAVDI ROAD,GUJARAT-360004' // Default
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            
            // Append simple fields
            Object.keys(newBill).forEach(key => {
                if (key !== 'items' && key !== 'ewayBillDetails' && key !== 'billImage' && key !== 'ewayBillImage') {
                    formData.append(key, newBill[key]);
                }
            });

            // Append complex fields as JSON strings
            formData.append('items', JSON.stringify(newBill.items));
            formData.append('ewayBillDetails', JSON.stringify(newBill.ewayBillDetails));

            // Append files
            if (newBill.billImage instanceof File) {
                formData.append('billImage', newBill.billImage);
            }
            if (newBill.ewayBillImage instanceof File) {
                formData.append('ewayBillImage', newBill.ewayBillImage);
            }

            await createPurchaseBill(formData);
            setIsAdding(false);
            loadBills();
            loadSuppliers();
            resetForm();
            setBillPreview(null);
            setEwayPreview(null);
        } catch (error) {
            console.error('Error adding purchase bill:', error);
            alert('Failed to save bill: ' + (error.response?.data?.message || error.message));
        }
    };

    const resetForm = () => {
        setNewBill({
            billNumber: '',
            supplierId: null,
            supplierName: '',
            supplierGstin: '',
            supplierPan: '',
            supplierAddress: '',
            irnNo: '',
            ackNo: '',
            ackDate: '',
            ewayBillNo: '',
            billDate: new Date().toISOString().split('T')[0],
            transport: '',
            lrNo: '',
            broker: '',
            items: [{ name: '', nameEnglish: '', hsnCode: '', pcs: 0, meters: 0, rate: 0, amount: 0 }],
            subTotal: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            roundOff: 0,
            remarks: '',
            billImage: '',
            ewayBillImage: '',
            showEwayBill: false,
            gstRate: 5,
            isTaxLocked: false,
            taxType: 'local',
            ewayBillDetails: {
                uniqueNo: '',
                enteredDate: '',
                enteredBy: '',
                supplierGstin: '',
                placeOfDispatch: '',
                recipientGstin: '',
                placeOfDelivery: '',
                documentNo: '',
                documentDate: '',
                transactionType: 'Regular',
                valueOfGoods: 0,
                hsnCode: '',
                reasonForTransportation: 'Outward - Supply',
                transporter: ''
            }
        });
    };

    const handleDownloadReport = async () => {
        const now = new Date();
        try {
            const blob = await downloadPurchaseReport(now.getMonth() + 1, now.getFullYear());
            const url = window.URL.createObjectURL(blob);
            const a = document.body.appendChild(document.createElement('a'));
            a.href = url;
            a.download = `Purchase_Report_${now.getMonth() + 1}_${now.getFullYear()}.pdf`;
            a.click();
            a.remove();
        } catch (error) {
            alert('No bills found for this month.');
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1 className="text-gradient">Purchase Entry</h1>
                    <p className="text-secondary">Manage supplier invoices and inventory stock</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={handleDownloadReport}>
                        <Download size={18} /> Monthly PDF
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
                        <Plus size={18} /> Add New Bill
                    </button>
                </div>
            </header>

            {isAdding && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '1100px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FileText className="text-primary" size={24} />
                                <h2>Professional Purchase Entry</h2>
                            </div>
                            <button className="close-btn" onClick={() => setIsAdding(false)}>×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="premium-form bill-layout" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <div className="modal-body" style={{ padding: '0 24px', paddingTop: '20px' }}>
                                {/* Top Info Bar */}                                <div className="bill-top-grid">
                                    <div className="bill-section logistics">
                                        <div className="section-title">LOGISTICS & BROKERAGE</div>
                                        <div className="input-group">
                                            <label className="input-label"><Truck size={14} /> TRANSPORT:</label>
                                            <input type="text" className="input-field" value={newBill.transport} onChange={(e) => setNewBill({ ...newBill, transport: e.target.value })} placeholder="e.g. H.H. ROADWAYS" />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">L R NO:</label>
                                            <input type="text" className="input-field" value={newBill.lrNo} onChange={(e) => setNewBill({ ...newBill, lrNo: e.target.value })} placeholder="LR Number" />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label"><Briefcase size={14} /> BROKER:</label>
                                            <input type="text" className="input-field" value={newBill.broker} onChange={(e) => setNewBill({ ...newBill, broker: e.target.value })} placeholder="Broker Name" />
                                        </div>
                                    </div>

                                    <div className="supplier-box">
                                        <div className="section-title">SUPPLIER (MERCHANT) DETAILS</div>
                                        <div className="input-group">
                                            <label className="input-label"><Building size={14} /> MERCHANT NAME</label>
                                            <div className="searchable-input">
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    list="suppliers-list"
                                                    required
                                                    value={newBill.supplierName}
                                                    onChange={(e) => handleSupplierSelect(e.target.value)}
                                                    placeholder="Select or enter merchant"
                                                />
                                                <datalist id="suppliers-list">
                                                    {suppliers.map(s => <option key={s._id} value={s.name} />)}
                                                </datalist>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <div className="input-group">
                                                <label className="input-label">GSTIN NO.</label>
                                                <input type="text" className="input-field" value={newBill.supplierGstin} onChange={(e) => setNewBill({ ...newBill, supplierGstin: e.target.value })} placeholder="GSTIN" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">PAN NO.</label>
                                                <input type="text" className="input-field" value={newBill.supplierPan} onChange={(e) => setNewBill({ ...newBill, supplierPan: e.target.value })} placeholder="PAN Number" />
                                            </div>
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">ADDRESS</label>
                                            <textarea rows="1" className="input-field" value={newBill.supplierAddress} onChange={(e) => setNewBill({ ...newBill, supplierAddress: e.target.value })} placeholder="Merchant Address"></textarea>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Bill Header */}
                                <div className="bill-header-grid" style={{ gridTemplateColumns: '1fr' }}>
                                    <div className="bill-info-box" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: 'rgba(30, 58, 138, 0.03)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <div className="input-group">
                                            <label className="input-label">INVOICE NO.</label>
                                            <input type="text" className="input-field" required value={newBill.billNumber} onChange={(e) => setNewBill({ ...newBill, billNumber: e.target.value })} placeholder="FS/2627/..." />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">INVOICE DATE</label>
                                            <input type="date" className="input-field" required value={newBill.billDate} onChange={(e) => setNewBill({ ...newBill, billDate: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table - Sagar Textiles Style */}
                                <div className="items-container">
                                    <div className="table-container">
                                        <table className="bill-table">
                                            <thead>                                                <tr>
                                                    <th style={{ width: '50px' }}>SR NO</th>
                                                    <th>ENGLISH NAME</th>
                                                    <th>GUJARATI NAME</th>
                                                    <th style={{ width: '120px' }}>HSN CODE</th>
                                                    <th style={{ width: '80px' }}>PCS</th>
                                                    <th style={{ width: '80px' }}>METERS</th>
                                                    <th style={{ width: '100px' }}>RATE</th>
                                                    <th style={{ width: '120px' }}>AMOUNT (₹)</th>
                                                    <th style={{ width: '40px' }} className="no-print"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {newBill.items.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="center">{index + 1}</td>
                                                        <td>
                                                            <input type="text" className="input-field" value={item.nameEnglish} onChange={(e) => handleItemChange(index, 'nameEnglish', e.target.value)} placeholder="English Name" />
                                                        </td>
                                                        <td>
                                                            <input type="text" className="input-field" required value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} placeholder="ગુજરાતી નામ" />
                                                        </td>
                                                        <td>
                                                            <input type="text" className="input-field" value={item.hsnCode} onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)} placeholder="HSN" />
                                                        </td>
                                                        <td>
                                                            <input type="number" className="input-field" step="any" value={item.pcs} onChange={(e) => handleItemChange(index, 'pcs', e.target.value)} />
                                                        </td>
                                                        <td>
                                                            <input type="number" className="input-field" step="any" value={item.meters} onChange={(e) => handleItemChange(index, 'meters', e.target.value)} />
                                                        </td>
                                                        <td>
                                                            <input type="number" className="input-field" step="any" required value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} />
                                                        </td>
                                                        <td className="right bold">
                                                            ₹{item.amount.toFixed(2)}
                                                        </td>
                                                        <td className="no-print">
                                                            <button type="button" className="btn-icon danger" onClick={() => handleRemoveItem(index)}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button type="button" className="btn btn-secondary" onClick={handleAddItem} style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                                        <Plus size={18} /> Add New Product Row
                                    </button>
                                </div>

                                {/* Bottom Summary */}
                                <div className="bill-footer-grid">
                                    <div className="remarks-box">
                                        <label>REMARKS / NOTES</label>
                                        <textarea rows="3" placeholder="Add any special instructions..." value={newBill.remarks} onChange={(e) => setNewBill({ ...newBill, remarks: e.target.value })}></textarea>

                                        <div style={{ marginTop: '20px' }}>
                                            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <ShoppingBag size={14} /> MERCHANT BILL IMAGE
                                            </label>
                                            <div style={{
                                                border: '2px dashed var(--border-color)',
                                                padding: '20px',
                                                borderRadius: '12px',
                                                textAlign: 'center',
                                                background: 'rgba(255,255,255,0.02)',
                                                cursor: 'pointer',
                                                transition: '0.3s'
                                            }} onClick={() => document.getElementById('bill-image-input').click()}
                                                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                                                {billPreview ? (
                                                    <div style={{ position: 'relative' }}>
                                                        <img src={billPreview} alt="Bill Preview" style={{ maxHeight: '150px', borderRadius: '8px' }} />
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '8px' }}>Image Selected ✓</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Click to upload Bill Photo</p>
                                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Supports JPG, PNG (Max 5MB)</p>
                                                    </>
                                                )}
                                            </div>
                                            <input type="file" id="bill-image-input" hidden accept="image/*" onChange={(e) => handleFileChange(e, 'billImage')} />
                                        </div>

                                        {/* Dynamic E-Way Bill System */}
                                        {(newBill.totalAmount > 49999 || newBill.showEwayBill) && (
                                            <div style={{ marginTop: '20px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', position: 'relative' }}>
                                                {newBill.totalAmount > 49999 && (
                                                    <div style={{ position: 'absolute', top: '-10px', right: '10px', background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                                        MANDATORY SYSTEM
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: '700' }}>
                                                        <Truck size={14} /> E-WAY BILL SYSTEM (Part - A Slip)
                                                    </label>
                                                    {newBill.totalAmount <= 49999 && (
                                                        <button type="button" className="btn btn-secondary s-sm" onClick={() => setNewBill(prev => ({ ...prev, showEwayBill: !prev.showEwayBill }))}>
                                                            {newBill.showEwayBill ? 'Deactivate System' : 'Activate System'}
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                {(newBill.showEwayBill || newBill.totalAmount > 49999) && (
                                                    <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                                        <div className="input-group">
                                                            <label className="input-label">Unique No:</label>
                                                            <input type="text" className="input-field" value={newBill.ewayBillDetails.uniqueNo} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, uniqueNo: e.target.value } })} placeholder="6020 9039 4913" required />
                                                        </div>
                                                        <div className="input-group">
                                                            <label className="input-label">Entered Date:</label>
                                                            <input type="text" className="input-field" value={newBill.ewayBillDetails.enteredDate} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, enteredDate: e.target.value } })} placeholder="06/04/2026 06:16 PM" />
                                                        </div>
                                                        <div className="input-group">
                                                            <label className="input-label">Entered By:</label>
                                                            <input type="text" className="input-field" value={newBill.ewayBillDetails.enteredBy} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, enteredBy: e.target.value } })} placeholder="24ASH PA101 5A1ZW - G 3 FASHION WORLD" />
                                                        </div>
                                                        <div className="input-group">
                                                            <label className="input-label">Transporter:</label>
                                                            <input type="text" className="input-field" value={newBill.ewayBillDetails.transporter} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, transporter: e.target.value } })} placeholder="24AABFH2311L1ZT & H H ROADWAYS" />
                                                        </div>

                                                        <div style={{ gridColumn: 'span 2', height: '1px', background: '#fecaca', margin: '5px 0' }}></div>
                                                        <div style={{ gridColumn: 'span 2', fontSize: '12px', fontWeight: 'bold', color: '#dc2626' }}>Part - A Details</div>

                                                        <div className="input-group">
                                                            <label className="input-label">GSTIN of Supplier:</label>
                                                            <input type="text" className="input-field" value={newBill.ewayBillDetails.supplierGstin} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, supplierGstin: e.target.value } })} />
                                                        </div>
                                                        <div className="input-group">
                                                            <label className="input-label">Place of Dispatch:</label>
                                                            <input type="text" className="input-field" value={newBill.ewayBillDetails.placeOfDispatch} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, placeOfDispatch: e.target.value } })} placeholder="Surat, GUJARAT-395010" />
                                                        </div>
                                                        <div className="input-group">
                                                            <label className="input-label">GSTIN of Recipient:</label>
                                                            <input type="text" className="input-field" value={newBill.ewayBillDetails.recipientGstin} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, recipientGstin: e.target.value } })} />
                                                        </div>
                                                        <div className="input-group">
                                                            <label className="input-label">Place of Delivery:</label>
                                                            <input type="text" className="input-field" value={newBill.ewayBillDetails.placeOfDelivery} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, placeOfDelivery: e.target.value } })} placeholder="MAVDI ROAD,GUJARAT-360004" />
                                                        </div>
                                                        <div className="input-group">
                                                            <label className="input-label">Document No:</label>
                                                            <input type="text" className="input-field" value={newBill.ewayBillDetails.documentNo} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, documentNo: e.target.value } })} />
                                                        </div>
                                                        <div className="input-group">
                                                            <label className="input-label">Document Date:</label>
                                                            <input type="text" className="input-field" value={newBill.ewayBillDetails.documentDate} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, documentDate: e.target.value } })} />
                                                        </div>
                                                        <div className="input-group">
                                                            <label className="input-label">HSN Code:</label>
                                                            <input type="text" className="input-field" value={newBill.ewayBillDetails.hsnCode} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, hsnCode: e.target.value } })} placeholder="620413" />
                                                        </div>
                                                        <div className="input-group">
                                                            <label className="input-label">Value of Goods:</label>
                                                            <input type="number" className="input-field" value={newBill.ewayBillDetails.valueOfGoods} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, valueOfGoods: e.target.value } })} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="totals-box">
                                        <div className="total-row">
                                            <span>TOTAL PCS/METERS:</span>
                                            <span className="bold">
                                                {newBill.items.reduce((acc, i) => acc + (Number(i.pcs) || 0), 0).toFixed(2)} / {newBill.items.reduce((acc, i) => acc + (Number(i.meters) || 0), 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="total-row" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '10px', paddingBottom: '10px' }}>
                                            <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'space-between' }}>
                                                <select className="input-field" style={{ width: '48%', fontSize: '12px' }} value={newBill.taxType}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setNewBill(prev => ({ ...prev, taxType: val }));
                                                        // Immediately re-calc with new type
                                                        calculateTotals(newBill.items, 0, 0, 0, newBill.roundOff);
                                                    }}>
                                                    <option value="local">Local (CGST+SGST)</option>
                                                    <option value="interstate">Interstate (IGST)</option>
                                                </select>
                                                <select className="input-field" style={{ width: '48%', fontSize: '12px' }} value={newBill.gstRate}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setNewBill(prev => ({ ...prev, gstRate: val }));
                                                        // Immediately re-calc with new rate
                                                        calculateTotals(newBill.items, 0, 0, 0, newBill.roundOff);
                                                    }}>
                                                    <option value="5">5% GST (Textile)</option>
                                                    <option value="12">12% GST</option>
                                                    <option value="18">18% GST</option>
                                                    <option value="0">0% (Nil)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right', marginBottom: '5px' }}>
                                            <button type="button" className="btn-text" style={{ fontSize: '11px', color: newBill.isTaxLocked ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                                                onClick={() => {
                                                    const newLock = !newBill.isTaxLocked;
                                                    setNewBill(prev => ({ ...prev, isTaxLocked: newLock }));
                                                    if (!newLock) {
                                                        // If unlocking, immediately re-calculate
                                                        calculateTotals(newBill.items, 0, 0, 0, newBill.roundOff);
                                                    }
                                                }}>
                                                {newBill.isTaxLocked ? '🔓 Unlock Auto-Tax' : '🔒 Lock Manual Tax'}
                                            </button>
                                        </div>

                                        <div className="totals-section" style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div className="total-row subtotal" style={{ marginBottom: '15px', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px' }}>
                                                <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>SUB TOTAL</span>
                                                <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>₹{newBill.subTotal.toFixed(2)}</span>
                                            </div>
                                            
                                            {/* Real-time Tax Breakdown */}
                                            <div style={{ padding: '10px 0', borderBottom: '1px dashed #cbd5e1', marginBottom: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#475569', fontWeight: '500' }}>
                                                    <span>CGST (2.5%)</span>
                                                    <span>₹{newBill.cgst.toFixed(2)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#475569', fontWeight: '500', marginTop: '8px' }}>
                                                    <span>SGST (2.5%)</span>
                                                    <span>₹{newBill.sgst.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div className="total-row">
                                                <span>ROUND OFF</span>
                                                <input 
                                                    type="number" 
                                                    step="any" 
                                                    style={{ width: '100px', textAlign: 'right', border: '1px solid #e2e8f0', background: 'white', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }} 
                                                    value={newBill.roundOff} 
                                                    onChange={(e) => {
                                                        const rVal = parseFloat(e.target.value) || 0;
                                                        setNewBill(prev => {
                                                            const totalAmount = prev.subTotal + prev.igst + prev.cgst + prev.sgst + rVal;
                                                            return { ...prev, roundOff: rVal, totalAmount };
                                                        });
                                                    }} 
                                                />
                                            </div>
                                            <div className="total-row final" style={{ marginTop: '10px', paddingTop: '15px', borderTop: '2px solid #1e3a8a' }}>
                                                <span style={{ fontSize: '1.2rem', color: '#1e3a8a' }}>TOTAL AMOUNT</span>
                                                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e3a8a' }}>₹{newBill.totalAmount.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div> {/* Close modal-body */}

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} /> Save & Record Bill
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {viewingBill && (
                <PurchaseBillView
                    bill={viewingBill}
                    onClose={() => setViewingBill(null)}
                />
            )}

            <div className="content-grid">
                {loading ? (
                    <div className="loader-container"><div className="loader"></div></div>
                ) : bills.length === 0 ? (
                    <div className="empty-state premium-card">
                        <ShoppingBag size={48} />
                        <h3>No Bills Found</h3>
                        <p>Upload your first merchant bill to start tracking stock.</p>
                        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>Add Bill</button>
                    </div>
                ) : (
                    <div className="bills-list-container">
                        <div className="premium-card">
                            <div className="card-header">
                                <h3 className="card-title">Recent Purchase Invoices</h3>
                                <div className="card-tools" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="Search by supplier or bill no..."
                                            style={{ paddingLeft: '32px', fontSize: '12px', height: '36px', width: '260px' }}
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <span className="badge info">{bills.filter(b => !searchQuery || b.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) || b.billNumber?.toLowerCase().includes(searchQuery.toLowerCase())).length} Records</span>
                                </div>
                            </div>
                            <div className="table-container">
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice details</th>
                                            <th>Merchant / Supplier</th>
                                            <th>Date</th>
                                            <th>Inventory</th>
                                            <th>Total Value</th>
                                            <th>Scan Copy</th>
                                            <th className="right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bills.filter(b => !searchQuery || b.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) || b.billNumber?.toLowerCase().includes(searchQuery.toLowerCase())).map((bill) => (
                                            <tr key={bill._id} className="hover-row">
                                                <td>
                                                    <div className="id-cell">
                                                        <FileText size={16} className="text-primary" />
                                                        <span className="font-bold">{bill.billNumber}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="merchant-cell">
                                                        <span className="font-medium">{bill.supplierName}</span>
                                                        <span className="text-xs text-secondary">{bill.supplierGstin || 'No GSTIN'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="date-cell">
                                                        <Calendar size={14} className="text-secondary" />
                                                        <span>{new Date(bill.billDate).toLocaleDateString('en-IN')}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge secondary">
                                                        {bill.items.length} Products
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="text-primary font-bold">
                                                        ₹{bill.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td>
                                                    {bill.billImage ? (
                                                        <button className="action-btn view" onClick={() => {
                                                            const isPath = bill.billImage.startsWith('uploads');
                                                            const imageUrl = isPath ? `${getBackendUrl()}/${bill.billImage}` : bill.billImage;
                                                            const win = window.open();
                                                            win.document.write(`<img src="${imageUrl}" style="max-width: 100%"/>`);
                                                        }} title="View Original Bill Image">
                                                            <ShoppingBag size={18} />
                                                        </button>
                                                    ) : <span className="text-secondary text-xs italic">N/A</span>}
                                                </td>

                                                <td>
                                                    <div className="action-group right">
                                                        <button className="action-btn view" onClick={() => setViewingBill(bill)} title="View Professional Bill">
                                                            <Eye size={18} />
                                                        </button>
                                                        <button className="action-btn delete" onClick={() => handleDeleteBill(bill._id)} title="Delete & Reverse Stock">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseBills;
