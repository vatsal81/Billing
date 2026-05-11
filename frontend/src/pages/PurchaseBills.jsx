import React, { useState, useEffect } from 'react';
import { Plus, Download, FileText, ShoppingBag, Calendar, User, Hash, Trash2, Save, Search, Building, Truck, Briefcase, Eye, Edit2, AlertCircle } from 'lucide-react';
import { fetchPurchaseBills, createPurchaseBill, updatePurchaseBill, downloadPurchaseReport, fetchSuppliers, deletePurchaseBill, getBackendUrl } from '../utils/api';
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
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeletingProcess, setIsDeletingProcess] = useState(false);
    const [billToDelete, setBillToDelete] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

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
        items: [{ name: '', nameEnglish: '', hsnCode: '', pcs: '', meters: '', rate: '', amount: 0 }],
        subTotal: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        roundOff: '',
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
            
            // Artificial delay for 'premium professional loader' experience
            await new Promise(resolve => setTimeout(resolve, 2500));
            
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
                setErrorMessage("File is too large! Please upload a file smaller than 5MB.");
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

    const handleDeleteClick = (bill) => {
        setBillToDelete(bill);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!billToDelete) return;
        
        setShowDeleteConfirm(false);
        setIsDeletingProcess(true);
        
        try {
            // Artificial delay for 'premium professional loader' experience
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            await deletePurchaseBill(billToDelete._id);
            setBills(bills.filter(b => b._id !== billToDelete._id));
            setBillToDelete(null);
        } catch (error) {
            console.error('Error deleting bill:', error);
            setErrorMessage('Failed to delete bill: ' + error.message);
        } finally {
            setIsDeletingProcess(false);
        }
    };

    const handleSupplierSelect = (name) => {
        const supplier = suppliers.find(s => s.name === name);
        if (supplier) {
            // Extract city from address for E-way bill
            const addressParts = (supplier.address || '').split(',');
            const city = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : (supplier.address || '');

            setNewBill(prev => ({
                ...prev,
                supplierId: supplier._id,
                supplierName: supplier.name,
                supplierGstin: supplier.gstin,
                supplierPan: supplier.pan || '',
                supplierAddress: supplier.address || '',
                ewayBillDetails: {
                    ...prev.ewayBillDetails,
                    supplierGstin: supplier.gstin || '',
                    placeOfDispatch: city || '',
                    documentNo: prev.billNumber,
                    documentDate: prev.billDate,
                    valueOfGoods: prev.totalAmount.toFixed(0)
                }
            }));
        } else {
            setNewBill(prev => ({ ...prev, supplierName: name, supplierId: null }));
        }
    };

    const handleEdit = (bill) => {
        const items = bill.items || [];
        const subTotal = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
        
        let iVal = 0, cVal = 0, sVal = 0;
        const totalTaxRate = (bill.gstRate || 5) / 100;

        if (bill.taxType === 'local') {
            cVal = (subTotal * totalTaxRate) / 2;
            sVal = (subTotal * totalTaxRate) / 2;
        } else {
            iVal = subTotal * totalTaxRate;
        }

        const rawTotal = Number(subTotal) + Number(iVal) + Number(cVal) + Number(sVal);
        const finalTotal = Math.ceil(rawTotal);
        const autoRoundOff = Number((finalTotal - rawTotal).toFixed(2));

        setEditingId(bill._id);
        setIsEditing(true);

        // Explicit mapping to ensure perfect fetch and avoid null warnings
        setNewBill({
            billNumber: bill.billNumber || '',
            supplierId: bill.supplier || '',
            supplierName: bill.supplierName || '',
            supplierGstin: bill.supplierGstin || '',
            supplierPan: bill.supplierPan || '',
            supplierAddress: bill.supplierAddress || '',
            irnNo: bill.irnNo || '',
            ackNo: bill.ackNo || '',
            ackDate: bill.ackDate || '',
            ewayBillNo: bill.ewayBillNo || '',
            billDate: bill.billDate ? bill.billDate.split('T')[0] : new Date().toISOString().split('T')[0],
            transport: bill.transport || '',
            lrNo: bill.lrNo || '',
            broker: bill.broker || '',
            items: items,
            subTotal: Number(bill.subTotal) || Number(subTotal.toFixed(2)),
            igst: Number(bill.igst) || Number(iVal.toFixed(2)),
            cgst: Number(bill.cgst) || Number(cVal.toFixed(2)),
            sgst: Number(bill.sgst) || Number(sVal.toFixed(2)),
            roundOff: Number(bill.roundOff) !== undefined ? bill.roundOff : autoRoundOff,
            totalAmount: Number(bill.totalAmount) || finalTotal,
            remarks: bill.remarks || '',
            billImage: bill.billImage || '',
            ewayBillImage: bill.ewayBillImage || '',
            showEwayBill: bill.showEwayBill || finalTotal > 49999,
            gstRate: bill.gstRate || 5,
            isTaxLocked: bill.isTaxLocked || false,
            taxType: bill.taxType || 'local',
            ewayBillDetails: {
                uniqueNo: bill.ewayBillDetails?.uniqueNo || '',
                enteredDate: bill.ewayBillDetails?.enteredDate || '',
                enteredBy: bill.ewayBillDetails?.enteredBy || '',
                supplierGstin: bill.ewayBillDetails?.supplierGstin || bill.supplierGstin || '',
                placeOfDispatch: bill.ewayBillDetails?.placeOfDispatch || '',
                recipientGstin: bill.ewayBillDetails?.recipientGstin || '24SHREEHARI123',
                placeOfDelivery: bill.ewayBillDetails?.placeOfDelivery || 'RAJKOT, GUJARAT',
                documentNo: bill.ewayBillDetails?.documentNo || bill.billNumber || '',
                documentDate: bill.ewayBillDetails?.documentDate || (bill.billDate ? bill.billDate.split('T')[0] : ''),
                transactionType: bill.ewayBillDetails?.transactionType || 'Regular',
                valueOfGoods: finalTotal,
                hsnCode: bill.ewayBillDetails?.hsnCode || (items[0]?.hsnCode || ''),
                reasonForTransportation: bill.ewayBillDetails?.reasonForTransportation || 'Outward - Supply',
                transporter: bill.ewayBillDetails?.transporter || bill.transport || ''
            }
        });
        
        // Handle image previews 'properly'
        if (bill.billImage) {
            const isPath = bill.billImage.startsWith('uploads');
            setBillPreview(isPath ? `${getBackendUrl()}/${bill.billImage}` : bill.billImage);
        } else {
            setBillPreview(null);
        }
        
        if (bill.ewayBillImage) {
            const isPath = bill.ewayBillImage.startsWith('uploads');
            setEwayPreview(isPath ? `${getBackendUrl()}/${bill.ewayBillImage}` : bill.ewayBillImage);
        } else {
            setEwayPreview(null);
        }
        
        setIsAdding(true);
    };

    const handleAddItem = () => {
        setNewBill({
            ...newBill,
            items: [...newBill.items, { name: '', nameEnglish: '', hsnCode: '', pcs: '', meters: '', rate: '', amount: 0 }]
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

            const rawTotal = Number(subTotal) + Number(iVal) + Number(cVal) + Number(sVal);
            const finalTotal = Math.round(rawTotal);
            const autoRoundOff = Number((finalTotal - rawTotal).toFixed(2));
            const isMandatory = finalTotal > 49999;

            // Sync HSN Code from first item if available
            const mainHsn = updatedItems[0]?.hsnCode || prev.ewayBillDetails.hsnCode;

            return { 
                ...prev, 
                items: updatedItems, 
                subTotal: Number(subTotal.toFixed(2)), 
                igst: Number(iVal.toFixed(2)), 
                cgst: Number(cVal.toFixed(2)), 
                sgst: Number(sVal.toFixed(2)), 
                roundOff: autoRoundOff,
                totalAmount: finalTotal,
                showEwayBill: isMandatory ? true : prev.showEwayBill,
                ewayBillDetails: {
                    ...prev.ewayBillDetails,
                    hsnCode: mainHsn,
                    documentNo: prev.billNumber,
                    documentDate: prev.billDate,
                    valueOfGoods: finalTotal
                }
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

        const rawTotal = Number(subTotal) + Number(iVal) + Number(cVal) + Number(sVal);
        const finalTotal = Math.ceil(rawTotal);
        const autoRoundOff = Number((finalTotal - rawTotal).toFixed(2));
        
        // Auto-activate E-way bill if > 49999
        const isMandatory = finalTotal > 49999;

        const mainHsn = items[0]?.hsnCode || '';

        setNewBill(prev => ({
            ...prev,
            items,
            subTotal: Number(subTotal.toFixed(2)),
            totalAmount: finalTotal,
            igst: Number(iVal.toFixed(2)),
            cgst: Number(cVal.toFixed(2)),
            sgst: Number(sVal.toFixed(2)),
            roundOff: autoRoundOff,
            showEwayBill: isMandatory ? true : prev.showEwayBill,
            ewayBillDetails: {
                ...prev.ewayBillDetails,
                documentNo: prev.billNumber || prev.ewayBillDetails.documentNo,
                documentDate: prev.billDate || prev.ewayBillDetails.documentDate,
                valueOfGoods: finalTotal,
                hsnCode: mainHsn || prev.ewayBillDetails.hsnCode,
                supplierGstin: prev.supplierGstin || prev.ewayBillDetails.supplierGstin,
                recipientGstin: '24SHREEHARI123', 
                placeOfDelivery: 'RAJKOT, GUJARAT' 
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
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

            if (isEditing) {
                await updatePurchaseBill(editingId, formData);
            } else {
                await createPurchaseBill(formData);
            }
            
            // Artificially wait to show the beautiful loader
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            setSaving(false);
            setShowSuccess(true);
            
            // Show success for 2 seconds then reset
            setTimeout(() => {
                setShowSuccess(false);
                setIsAdding(false);
                setIsEditing(false);
                setEditingId(null);
                loadBills();
                loadSuppliers();
                resetForm();
                setBillPreview(null);
                setEwayPreview(null);
            }, 2000);
        } catch (error) {
            setSaving(false);
            console.error('Error saving purchase bill:', error);
            setErrorMessage('Failed to save bill: ' + (error.response?.data?.message || error.message));
        }
    };

    const resetForm = () => {
        setNewBill({
            billNumber: '',
            supplierId: '',
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
            items: [{ name: '', nameEnglish: '', hsnCode: '', pcs: '', meters: '', rate: '', amount: 0 }],
            subTotal: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            roundOff: 0,
            totalAmount: 0,
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
            setLoading(true);
            // Connect with the premium bill finding animation
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            const blob = await downloadPurchaseReport(now.getMonth() + 1, now.getFullYear());
            const url = window.URL.createObjectURL(blob);
            const a = document.body.appendChild(document.createElement('a'));
            a.href = url;
            a.download = `Purchase_Report_${now.getMonth() + 1}_${now.getFullYear()}.pdf`;
            a.click();
            a.remove();
        } catch (error) {
            setErrorMessage('No bills found for this month.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <style>{`
                @media (max-width: 768px) {
                    .desktop-only { display: none !important; }
                    .mobile-only { display: block !important; }
                    .bill-top-grid, .bill-header-grid, .bill-footer-grid, .eway-grid, .attachments-grid { 
                        grid-template-columns: 1fr !important; 
                        gap: 16px !important; 
                    }
                }
                @media (min-width: 769px) {
                    .desktop-only { display: block !important; }
                    .mobile-only { display: none !important; }
                }
                
                @keyframes pulse-ring {
                    0% { transform: scale(.33); }
                    80%, 100% { opacity: 0; }
                }
                @keyframes pulse-dot {
                    0% { transform: scale(.8); }
                    50% { transform: scale(1); }
                    100% { transform: scale(.8); }
                }
                @keyframes scale-up {
                    0% { transform: scale(0.5); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes checkmark {
                    0% { stroke-dashoffset: 50; }
                    100% { stroke-dashoffset: 0; }
                }
            `}</style>
            <header className="page-header" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className="text-gradient">Purchase Entry</h1>
                    <p className="text-secondary">Manage supplier invoices and inventory stock</p>
                </div>
                <div className="header-actions" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: window.innerWidth < 768 ? '1fr 1fr' : 'auto auto', 
                    gap: '12px',
                    width: window.innerWidth < 768 ? '100%' : 'auto',
                    marginTop: window.innerWidth < 768 ? '16px' : '0'
                }}>
                    <button className="btn btn-secondary" onClick={handleDownloadReport} style={{ height: 'auto', minHeight: '70px', padding: '10px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1 }}>
                        <Download size={20} /> <span>Monthly PDF</span>
                    </button>
                    <button className="btn btn-primary" onClick={() => { setIsEditing(false); setEditingId(null); resetForm(); setBillPreview(null); setEwayPreview(null); setIsAdding(true); }} style={{ height: 'auto', minHeight: '70px', padding: '10px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1 }}>
                        <Plus size={20} /> <span>Add New Bill</span>
                    </button>
                </div>
            </header>

            {(isAdding || isEditing) && (
                <div style={{
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    background: 'rgba(0,0,0,0.8)', 
                    zIndex: 9000, 
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
                    paddingTop: window.innerWidth < 768 ? '40px' : '20px',
                    overflowY: 'auto'
                }}>
                    <div className="modal-content" style={{ maxWidth: '1200px', width: '95%', position: 'relative' }}>

                        {(saving || showSuccess) && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(255,255,255,0.95)',
                                zIndex: 1000,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '32px',
                                backdropFilter: 'blur(10px)',
                                animation: 'scale-up 0.3s ease-out'
                            }}>
                                {saving ? (
                                    <>
                                        <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '24px' }}>
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                border: '4px solid var(--accent-primary)',
                                                borderRadius: '50%',
                                                animation: 'pulse-ring 1.25s cubic-bezier(0.215, 0.61, 0.355, 1) infinite'
                                            }}></div>
                                            <div style={{
                                                position: 'absolute',
                                                inset: '10px',
                                                background: 'var(--accent-primary)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                animation: 'pulse-dot 1.25s cubic-bezier(0.455, 0.03, 0.515, 0.955) -.4s infinite'
                                            }}>
                                                <ShoppingBag size={40} color="white" />
                                            </div>
                                        </div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '8px' }}>RECORDING BILL...</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Syncing stock and updating inventory</p>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ width: '120px', height: '120px', background: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 10px 25px rgba(34, 197, 94, 0.3)' }}>
                                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 6L9 17L4 12" style={{ strokeDasharray: 50, strokeDashoffset: 50, animation: 'checkmark 0.5s ease-in-out forwards 0.2s' }} />
                                            </svg>
                                        </div>
                                        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d', marginBottom: '8px' }}>{isEditing ? 'BILL UPDATED!' : 'BILL RECORDED!'}</h3>
                                        <p style={{ color: '#166534', fontWeight: 600 }}>{isEditing ? 'Changes saved successfully' : 'Stock added to inventory successfully'}</p>
                                    </>
                                )}
                            </div>
                        )}
                        <div className="modal-header" style={{ padding: '20px 24px', background: 'var(--accent-gradient)', color: 'white', borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, color: 'white' }}>{isEditing ? 'Edit Purchase Bill' : 'Purchase Entry'}</h2>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.8, margin: 0 }}>{isEditing ? `Modifying Invoice: ${newBill.billNumber}` : 'Record stock & tax invoices'}</p>
                                </div>
                            </div>
                            <button className="close-btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => { setIsAdding(false); setIsEditing(false); setEditingId(null); }}>×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="premium-form bill-layout" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: 0 }}>
                            <div className="modal-body" style={{ padding: '20px', overflowY: 'auto' }}>
                                <div className="bill-top-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                                    <div className="bill-section logistics" style={{ background: '#f8fafc', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                        <div className="section-title" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <Truck size={18} /> TRANSPORT & LOGISTICS
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                <label className="input-label" style={{ fontWeight: 600 }}>TRANSPORT NAME</label>
                                                <input type="text" className="input-field" value={newBill.transport} onChange={(e) => setNewBill(prev => ({ ...prev, transport: e.target.value, ewayBillDetails: { ...prev.ewayBillDetails, transporter: e.target.value } }))} placeholder="e.g. H.H. ROADWAYS" style={{ background: 'white' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 400 ? '1fr 1fr' : '1fr', gap: '16px' }}>
                                                <div className="input-group" style={{ marginBottom: 0 }}>
                                                    <label className="input-label" style={{ fontWeight: 600 }}>L R NO</label>
                                                    <input type="text" className="input-field" value={newBill.lrNo} onChange={(e) => setNewBill({ ...newBill, lrNo: e.target.value })} placeholder="LR Number" style={{ background: 'white' }} />
                                                </div>
                                                <div className="input-group" style={{ marginBottom: 0 }}>
                                                    <label className="input-label" style={{ fontWeight: 600 }}>BROKER</label>
                                                    <input type="text" className="input-field" value={newBill.broker} onChange={(e) => setNewBill({ ...newBill, broker: e.target.value })} placeholder="Broker Name" style={{ background: 'white' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="supplier-box" style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
                                        <div className="section-title" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <Building size={18} /> MERCHANT (SUPPLIER)
                                        </div>
                                        <div className="input-group" style={{ marginBottom: '16px' }}>
                                            <label className="input-label" style={{ fontWeight: 600 }}>SELECT MERCHANT</label>
                                            <input type="text" className="input-field" list="suppliers-list" required value={newBill.supplierName} onChange={(e) => handleSupplierSelect(e.target.value)} placeholder="Type merchant name..." style={{ background: '#fcfdfe' }} />
                                            <datalist id="suppliers-list">
                                                {suppliers.map(s => <option key={s._id} value={s.name} />)}
                                            </datalist>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                <label className="input-label" style={{ fontWeight: 600 }}>GSTIN</label>
                                                <input type="text" className="input-field" value={newBill.supplierGstin} onChange={(e) => setNewBill(prev => ({ ...prev, supplierGstin: e.target.value, ewayBillDetails: { ...prev.ewayBillDetails, supplierGstin: e.target.value } }))} placeholder="GSTIN Number" style={{ background: '#fcfdfe' }} />
                                            </div>
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                <label className="input-label" style={{ fontWeight: 600 }}>PAN NO.</label>
                                                <input type="text" className="input-field" value={newBill.supplierPan} onChange={(e) => setNewBill({ ...newBill, supplierPan: e.target.value })} placeholder="PAN Number" style={{ background: '#fcfdfe' }} />
                                            </div>
                                        </div>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label className="input-label" style={{ fontWeight: 600 }}>OFFICE ADDRESS</label>
                                            <input type="text" className="input-field" value={newBill.supplierAddress} onChange={(e) => setNewBill({ ...newBill, supplierAddress: e.target.value })} placeholder="Full merchant address..." style={{ background: '#fcfdfe' }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="bill-header-grid" style={{ marginBottom: '20px' }}>
                                    <div className="bill-info-box" style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                                        gap: '20px', 
                                        background: 'rgba(30, 58, 138, 0.04)', 
                                        padding: '24px', 
                                        borderRadius: '24px', 
                                        border: '1px solid rgba(30, 58, 138, 0.1)' 
                                    }}>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label className="input-label" style={{ color: '#1e3a8a', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em' }}>INVOICE NO.</label>
                                            <input type="text" className="input-field" required value={newBill.billNumber} onChange={(e) => setNewBill(prev => ({ ...prev, billNumber: e.target.value, ewayBillDetails: { ...prev.ewayBillDetails, documentNo: e.target.value } }))} placeholder="Enter Bill No." style={{ background: 'white' }} />
                                        </div>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label className="input-label" style={{ color: '#1e3a8a', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em' }}>INVOICE DATE</label>
                                            <input type="date" className="input-field" required value={newBill.billDate} onChange={(e) => setNewBill(prev => ({ ...prev, billDate: e.target.value, ewayBillDetails: { ...prev.ewayBillDetails, documentDate: e.target.value } }))} style={{ background: 'white' }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="items-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', marginTop: '20px' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-primary)', fontWeight: 800 }}>BILL PRODUCT ITEMS</h3>
                                    <button type="button" className="btn btn-secondary" onClick={handleAddItem} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                        <Plus size={16} /> Add Row
                                    </button>
                                </div>

                                {/* Desktop Table View */}
                                <div className="desktop-only">
                                    <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <table className="bill-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ background: 'var(--bg-secondary)' }}>
                                                <tr>
                                                    <th style={{ padding: '12px', textAlign: 'center', width: '50px' }}>#</th>
                                                    <th style={{ padding: '12px', textAlign: 'left' }}>PRODUCT NAME (ENG / GUJ)</th>
                                                    <th style={{ padding: '12px', width: '100px' }}>HSN</th>
                                                    <th style={{ padding: '12px', width: '80px' }}>PCS</th>
                                                    <th style={{ padding: '12px', width: '80px' }}>METERS</th>
                                                    <th style={{ padding: '12px', width: '100px' }}>RATE</th>
                                                    <th style={{ padding: '12px', textAlign: 'right', width: '120px' }}>AMOUNT</th>
                                                    <th style={{ padding: '12px', width: '40px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {newBill.items.map((item, index) => (
                                                    <tr key={index} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{index + 1}</td>
                                                        <td style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px' }}>
                                                            <input type="text" className="input-field" style={{ padding: '6px 10px', fontSize: '0.85rem' }} value={item.nameEnglish || ''} onChange={(e) => handleItemChange(index, 'nameEnglish', e.target.value)} placeholder="English Name" />
                                                            <input type="text" className="input-field" style={{ padding: '6px 10px', fontSize: '0.85rem' }} required value={item.name || ''} onChange={(e) => handleItemChange(index, 'name', e.target.value)} placeholder="ગુજરાતી નામ" />
                                                        </td>
                                                        <td><input type="text" className="input-field" style={{ padding: '6px 10px' }} value={item.hsnCode || ''} onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)} placeholder="HSN" /></td>
                                                        <td><input type="number" className="input-field" style={{ padding: '6px 10px' }} step="any" value={item.pcs || ''} onChange={(e) => handleItemChange(index, 'pcs', e.target.value)} /></td>
                                                        <td><input type="number" className="input-field" style={{ padding: '6px 10px' }} step="any" value={item.meters || ''} onChange={(e) => handleItemChange(index, 'meters', e.target.value)} /></td>
                                                        <td><input type="number" className="input-field" style={{ padding: '6px 10px' }} step="any" required value={item.rate || ''} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} /></td>
                                                        <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--accent-primary)' }}>₹{item.amount.toFixed(2)}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button type="button" style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleRemoveItem(index)}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Mobile Card View */}
                                <div className="mobile-only">
                                    {newBill.items.map((item, index) => (
                                        <div key={index} style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px', marginBottom: '15px', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                                                <span style={{ background: 'var(--accent-primary)', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800' }}>ITEM #{index + 1}</span>
                                                <button type="button" style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.1)', border: 'none', padding: '6px', borderRadius: '8px' }} onClick={() => handleRemoveItem(index)}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div className="input-group" style={{ marginBottom: 0 }}>
                                                    <label className="input-label" style={{ fontSize: '0.75rem' }}>PRODUCT NAME (ENG / GUJ)</label>
                                                    <input type="text" className="input-field" value={item.nameEnglish || ''} onChange={(e) => handleItemChange(index, 'nameEnglish', e.target.value)} placeholder="English Name" style={{ marginBottom: '8px' }} />
                                                    <input type="text" className="input-field" required value={item.name || ''} onChange={(e) => handleItemChange(index, 'name', e.target.value)} placeholder="ગુજરાતી નામ" />
                                                </div>
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.75rem' }}>HSN CODE</label>
                                                        <input type="text" className="input-field" value={item.hsnCode || ''} onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)} placeholder="HSN" />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.75rem' }}>PCS</label>
                                                        <input type="number" className="input-field" step="any" value={item.pcs || ''} onChange={(e) => handleItemChange(index, 'pcs', e.target.value)} />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.75rem' }}>METERS</label>
                                                        <input type="number" className="input-field" step="any" value={item.meters || ''} onChange={(e) => handleItemChange(index, 'meters', e.target.value)} />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.75rem' }}>RATE (₹)</label>
                                                        <input type="number" className="input-field" step="any" required value={item.rate || ''} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} />
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Subtotal:</span>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--accent-primary)' }}>₹{item.amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Bottom Summary & Totals */}
                                <div className="bill-footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginTop: '32px' }}>
                                    <div className="left-summary-col">
                                        <div className="remarks-box" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                                            <label className="input-label" style={{ marginBottom: '12px', display: 'block' }}>REMARKS / NOTES</label>
                                            <textarea className="input-field" rows="3" placeholder="Add any special instructions..." value={newBill.remarks} onChange={(e) => setNewBill({ ...newBill, remarks: e.target.value })} style={{ background: 'white' }}></textarea>
                                        </div>

                                        <div className="attachments-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                            <div className="upload-section">
                                                <label className="input-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <ShoppingBag size={14} /> SCAN COPY
                                                </label>
                                                <div 
                                                    onClick={() => document.getElementById('bill-image-input').click()}
                                                    style={{
                                                        height: '100px',
                                                        background: billPreview ? 'white' : '#0369a1',
                                                        border: billPreview ? '2px solid #0369a1' : 'none',
                                                        borderRadius: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        transition: '0.3s',
                                                        boxShadow: billPreview ? 'none' : '0 4px 12px rgba(3, 105, 161, 0.2)',
                                                        overflow: 'hidden'
                                                    }}>
                                                    {billPreview ? (
                                                        <img src={billPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <ShoppingBag size={32} color="white" />
                                                    )}
                                                </div>
                                                <input type="file" id="bill-image-input" hidden accept="image/*" onChange={(e) => handleFileChange(e, 'billImage')} />
                                                <p style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{billPreview ? 'PHOTO ATTACHED ✓' : 'TAP TO SCAN / UPLOAD'}</p>
                                            </div>

                                            <div className="upload-section">
                                                <label className="input-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FileText size={14} /> SCAN E-WAY SLIP
                                                </label>
                                                <div 
                                                    onClick={() => document.getElementById('eway-image-input').click()}
                                                    style={{
                                                        height: '100px',
                                                        background: ewayPreview ? 'white' : '#f8fafc',
                                                        border: '2px solid #e2e8f0',
                                                        borderRadius: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        transition: '0.3s',
                                                        overflow: 'hidden'
                                                    }}>
                                                    {ewayPreview ? (
                                                        <img src={ewayPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <FileText size={32} color="#0369a1" style={{ opacity: 0.5 }} />
                                                    )}
                                                </div>
                                                <input type="file" id="eway-image-input" hidden accept="image/*" onChange={(e) => handleFileChange(e, 'ewayBillImage')} />
                                                <p style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{ewayPreview ? 'SLIP ATTACHED ✓' : 'TAP TO ATTACH'}</p>
                                            </div>
                                        </div>

                                        {/* E-Way Bill Section (Simplified) */}
                                        {(newBill.totalAmount > 49999 || newBill.showEwayBill) && (
                                            <div className="eway-bill-box" style={{ background: '#fff1f2', padding: '20px', borderRadius: '16px', border: '1px solid #fecaca', marginBottom: '24px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <Truck size={18} color="#dc2626" />
                                                        <span style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.9rem' }}>E-WAY BILL Part-A Slip</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            type="button" 
                                                            style={{ 
                                                                border: '1px solid #dc2626', 
                                                                background: 'white', 
                                                                color: '#dc2626', 
                                                                fontSize: '0.7rem', 
                                                                padding: '4px 10px', 
                                                                borderRadius: '8px', 
                                                                fontWeight: 700, 
                                                                cursor: 'pointer' 
                                                            }} 
                                                            onClick={() => {
                                                                setNewBill(prev => ({
                                                                    ...prev,
                                                                    ewayBillDetails: {
                                                                        ...prev.ewayBillDetails,
                                                                        supplierGstin: prev.supplierGstin,
                                                                        documentNo: prev.billNumber,
                                                                        documentDate: prev.billDate,
                                                                        hsnCode: prev.items[0]?.hsnCode || '',
                                                                        valueOfGoods: prev.totalAmount.toFixed(0),
                                                                        transporter: prev.transport,
                                                                        recipientGstin: '24SHREEHARI123'
                                                                    }
                                                                }));
                                                            }}>
                                                            Auto-fill from Bill
                                                        </button>
                                                        {newBill.totalAmount <= 49999 && (
                                                            <button type="button" style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => setNewBill(prev => ({ ...prev, showEwayBill: false }))}>Remove</button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem', fontWeight: 700 }}>UNIQUE NO.</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.uniqueNo} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, uniqueNo: e.target.value } })} placeholder="e.g. 5896 8745 6985" />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem', fontWeight: 700 }}>ENTERED DATE</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.enteredDate} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, enteredDate: e.target.value } })} placeholder="DD/MM/YYYY HH:MM" />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem', fontWeight: 700 }}>ENTERED BY</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.enteredBy} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, enteredBy: e.target.value } })} placeholder="e.g. KHGI6S9..." />
                                                    </div>
                                                </div>

                                                <div style={{ height: '1px', background: '#fecaca', margin: '16px 0' }}></div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', marginBottom: '12px', textTransform: 'uppercase' }}>Part - A Details</div>

                                                <div className="eway-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem' }}>GSTIN OF SUPPLIER</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.supplierGstin} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, supplierGstin: e.target.value } })} />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem' }}>PLACE OF DISPATCH</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.placeOfDispatch} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, placeOfDispatch: e.target.value } })} />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem' }}>GSTIN OF RECIPIENT</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.recipientGstin} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, recipientGstin: e.target.value } })} />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem' }}>PLACE OF DELIVERY</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.placeOfDelivery} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, placeOfDelivery: e.target.value } })} />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem' }}>DOCUMENT NO.</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.documentNo} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, documentNo: e.target.value } })} />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem' }}>DOCUMENT DATE</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.documentDate} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, documentDate: e.target.value } })} />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem' }}>TRANSACTION TYPE</label>
                                                        <select className="input-field" value={newBill.ewayBillDetails.transactionType} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, transactionType: e.target.value } })}>
                                                            <option value="Regular">Regular</option>
                                                            <option value="Bill To - Ship To">Bill To - Ship To</option>
                                                            <option value="Bill From - Dispatch From">Bill From - Dispatch From</option>
                                                        </select>
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem' }}>VALUE OF GOODS</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.valueOfGoods} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, valueOfGoods: e.target.value } })} />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem' }}>HSN CODE</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.hsnCode} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, hsnCode: e.target.value } })} />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem' }}>REASON</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.reasonForTransportation} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, reasonForTransportation: e.target.value } })} />
                                                    </div>
                                                    <div className="input-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                                                        <label className="input-label" style={{ fontSize: '0.7rem' }}>TRANSPORTER</label>
                                                        <input type="text" className="input-field" value={newBill.ewayBillDetails.transporter} onChange={(e) => setNewBill({ ...newBill, ewayBillDetails: { ...newBill.ewayBillDetails, transporter: e.target.value } })} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="right-totals-col">
                                        <div className="totals-card" style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', position: 'sticky', top: '0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>BILL SUMMARY</h4>
                                                <button type="button" 
                                                    style={{ 
                                                        background: newBill.isTaxLocked ? 'rgba(3, 105, 161, 0.1)' : 'transparent', 
                                                        color: newBill.isTaxLocked ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                        border: `1px solid ${newBill.isTaxLocked ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                                        padding: '4px 10px',
                                                        borderRadius: '8px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => {
                                                        const newLock = !newBill.isTaxLocked;
                                                        setNewBill(prev => ({ ...prev, isTaxLocked: newLock }));
                                                        if (!newLock) calculateTotals(newBill.items, 0, 0, 0, newBill.roundOff);
                                                    }}>
                                                    {newBill.isTaxLocked ? '🔓 Auto' : '🔒 Manual'}
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Pcs / Meters</span>
                                                    <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                                                        {newBill.items.reduce((acc, i) => acc + (Number(i.pcs) || 0), 0)} / {newBill.items.reduce((acc, i) => acc + (Number(i.meters) || 0), 0).toFixed(2)}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    <select className="input-field" style={{ fontSize: '0.8rem', padding: '8px' }} value={newBill.taxType} onChange={(e) => { setNewBill(prev => ({ ...prev, taxType: e.target.value })); calculateTotals(newBill.items, 0, 0, 0, newBill.roundOff); }}>
                                                        <option value="local">Local (CGST+SGST)</option>
                                                        <option value="interstate">Interstate (IGST)</option>
                                                    </select>
                                                    <select className="input-field" style={{ fontSize: '0.8rem', padding: '8px' }} value={newBill.gstRate} onChange={(e) => { setNewBill(prev => ({ ...prev, gstRate: Number(e.target.value) })); calculateTotals(newBill.items, 0, 0, 0, newBill.roundOff); }}>
                                                        <option value="5">5% GST</option>
                                                        <option value="12">12% GST</option>
                                                        <option value="18">18% GST</option>
                                                        <option value="0">0% Nil</option>
                                                    </select>
                                                </div>

                                                <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SUB TOTAL</span>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>₹{newBill.subTotal.toFixed(2)}</span>
                                                </div>

                                                <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {newBill.taxType === 'local' ? (
                                                        <>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>CGST ({newBill.gstRate / 2}%)</span>
                                                                <span style={{ fontWeight: 600 }}>₹{newBill.cgst.toFixed(2)}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>SGST ({newBill.gstRate / 2}%)</span>
                                                                <span style={{ fontWeight: 600 }}>₹{newBill.sgst.toFixed(2)}</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                            <span style={{ color: 'var(--text-secondary)' }}>IGST ({newBill.gstRate}%)</span>
                                                            <span style={{ fontWeight: 600 }}>₹{newBill.igst.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ROUND OFF</span>
                                                        <input type="number" step="any" className="input-field" style={{ width: '80px', padding: '4px 8px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700 }} value={newBill.roundOff} onChange={(e) => {
                                                            const rawValue = e.target.value;
                                                            const rVal = parseFloat(rawValue) || 0;
                                                            const newTotal = Number((newBill.subTotal + newBill.igst + newBill.cgst + newBill.sgst + rVal).toFixed(2));
                                                            setNewBill(prev => ({ 
                                                                ...prev, 
                                                                roundOff: rawValue, 
                                                                totalAmount: newTotal,
                                                                ewayBillDetails: { ...prev.ewayBillDetails, valueOfGoods: Math.round(newTotal) }
                                                            }));
                                                        }} />
                                                    </div>
                                                </div>

                                                <div style={{ background: 'var(--accent-gradient)', padding: '20px', borderRadius: '16px', color: 'white', marginTop: '8px', boxShadow: '0 10px 20px -5px rgba(3, 105, 161, 0.4)' }}>
                                                    <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600, marginBottom: '4px' }}>FINAL TOTAL AMOUNT</div>
                                                    <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>₹{newBill.totalAmount.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ padding: '20px', background: '#f8fafc', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1, height: '48px', fontWeight: 700 }} onClick={() => { setIsAdding(false); setIsEditing(false); }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1.5, height: '48px', fontWeight: 800, gap: '10px' }}>
                                    <Save size={18} /> {isEditing ? 'Update Bill' : 'Record Bill'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {viewingBill && (
                <PurchaseBillView
                    billId={viewingBill._id}
                    onClose={() => setViewingBill(null)}
                />
            )}

            <div className="content-grid">
                {loading ? (
                    <div className="premium-search-loader" style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        minHeight: '400px',
                        gap: '24px'
                    }}>
                        <div className="magnifier-animation-wrapper">
                            <div className="scan-line"></div>
                            <FileText size={60} className="base-bill-icon" />
                            <div className="magnifier-lens">
                                <Search size={32} color="white" />
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ 
                                margin: 0, 
                                fontSize: '1.2rem', 
                                fontWeight: 800, 
                                color: 'var(--text-primary)',
                                letterSpacing: '0.05em'
                            }}>FETCHING INVOICES</h3>
                            <p style={{ 
                                margin: '8px 0 0', 
                                fontSize: '0.85rem', 
                                color: 'var(--text-secondary)',
                                opacity: 0.8
                            }}>Scanning your purchase history...</p>
                        </div>
                    </div>
                ) : bills.length === 0 ? (
                    <div className="empty-state premium-card" style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: '80px 24px', 
                        textAlign: 'center',
                        gap: '16px'
                    }}>
                        <div style={{ 
                            background: 'rgba(3, 105, 161, 0.05)', 
                            padding: '24px', 
                            borderRadius: '30px', 
                            color: 'var(--accent-primary)',
                            marginBottom: '8px'
                        }}>
                            <ShoppingBag size={48} />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>No Invoices Yet</h3>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto 12px', lineHeight: 1.6 }}>
                            Upload your first merchant bill to start tracking stock and financial records.
                        </p>
                        <button className="btn btn-primary" onClick={() => setIsAdding(true)} style={{ width: 'auto', padding: '12px 32px' }}>
                            <Plus size={18} /> Add Your First Bill
                        </button>
                    </div>
                ) : (
                    <div className="bills-list-container">
                        <div className="premium-card">
                            <div className="card-header" style={{ 
                                    flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                                    alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
                                    gap: '16px'
                                }}>
                                    <h3 className="card-title">Recent Purchase Invoices</h3>
                                    <div className="card-tools" style={{ 
                                        display: 'flex', 
                                        gap: '12px', 
                                        alignItems: 'center',
                                        width: window.innerWidth < 768 ? '100%' : 'auto'
                                    }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="Search by supplier or bill no..."
                                                style={{ paddingLeft: '32px', fontSize: '12px', height: '36px', width: '100%' }}
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <span className="badge info" style={{ whiteSpace: 'nowrap' }}>{bills.filter(b => !searchQuery || b.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) || b.billNumber?.toLowerCase().includes(searchQuery.toLowerCase())).length} Records</span>
                                    </div>
                                </div>
                            {/* Desktop Table View */}
                            <div className="table-container desktop-only">
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
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {bill.billImage ? (
                                                            <button className="action-btn view" onClick={() => {
                                                                const isPath = bill.billImage.startsWith('uploads');
                                                                const imageUrl = isPath ? `${getBackendUrl()}/${bill.billImage}` : bill.billImage;
                                                                window.open(imageUrl, '_blank');
                                                            }} title="View Merchant Invoice Copy">
                                                                <ShoppingBag size={18} />
                                                            </button>
                                                        ) : null}
                                                        {bill.ewayBillImage ? (
                                                            <button className="action-btn secondary" style={{ background: 'rgba(3, 105, 161, 0.1)', color: 'var(--accent-primary)' }} onClick={() => {
                                                                const isPath = bill.ewayBillImage.startsWith('uploads');
                                                                const imageUrl = isPath ? `${getBackendUrl()}/${bill.ewayBillImage}` : bill.ewayBillImage;
                                                                window.open(imageUrl, '_blank');
                                                            }} title="View E-Way Bill Scan Copy">
                                                                <Truck size={18} />
                                                            </button>
                                                        ) : null}
                                                        {!bill.billImage && !bill.ewayBillImage && (
                                                            <span className="text-secondary text-xs italic">N/A</span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="action-group right">
                                                        <button className="action-btn edit" onClick={() => handleEdit(bill)} title="Edit Bill Data">
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button className="action-btn view" onClick={() => setViewingBill(bill)} title="View Professional Bill">
                                                            <Eye size={18} />
                                                        </button>
                                                        <button className="action-btn delete" onClick={() => handleDeleteClick(bill)} title="Delete & Reverse Stock">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="mobile-only" style={{ padding: '0 4px' }}>
                                {bills.filter(b => !searchQuery || b.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) || b.billNumber?.toLowerCase().includes(searchQuery.toLowerCase())).map((bill) => (
                                    <div key={bill._id} className="mobile-purchase-card" style={{ 
                                        background: 'white', 
                                        borderRadius: '20px', 
                                        padding: '16px', 
                                        marginBottom: '16px', 
                                        border: '1px solid #f1f5f9',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>{bill.supplierName}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                    <FileText size={12} /> {bill.billNumber}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ color: 'var(--accent-primary)', fontWeight: 800, fontSize: '1.1rem' }}>₹{bill.totalAmount.toLocaleString('en-IN')}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(bill.billDate).toLocaleDateString('en-IN')}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                            <span className="badge secondary" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>{bill.items.length} Products</span>
                                            {bill.billImage && <span className="badge info" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>Invoice Attached</span>}
                                        </div>

                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            paddingTop: '12px', 
                                            borderTop: '1px solid #f1f5f9' 
                                        }}>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {bill.billImage && (
                                                    <button onClick={() => window.open(bill.billImage.startsWith('uploads') ? `${getBackendUrl()}/${bill.billImage}` : bill.billImage, '_blank')} style={{ border: 'none', background: 'rgba(3, 105, 161, 0.1)', color: 'var(--accent-primary)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <ShoppingBag size={18} />
                                                    </button>
                                                )}
                                                {bill.ewayBillImage && (
                                                    <button onClick={() => window.open(bill.ewayBillImage.startsWith('uploads') ? `${getBackendUrl()}/${bill.ewayBillImage}` : bill.ewayBillImage, '_blank')} style={{ border: 'none', background: 'rgba(5, 150, 105, 0.1)', color: 'var(--success)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Truck size={18} />
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className="action-btn edit" onClick={() => handleEdit(bill)} style={{ width: '36px', height: '36px' }}><Edit2 size={18} /></button>
                                                <button className="action-btn view" onClick={() => setViewingBill(bill)} style={{ width: '36px', height: '36px' }}><Eye size={18} /></button>
                                                <button className="action-btn delete" onClick={() => handleDeleteClick(bill)} style={{ width: '36px', height: '36px' }}><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {showDeleteConfirm && (
                <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }}>
                    <div className="delete-modal-content" style={{ 
                        background: 'white', 
                        padding: '40px', 
                        borderRadius: '32px', 
                        maxWidth: '400px', 
                        width: '90%', 
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        animation: 'modalSlideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                        <div style={{ 
                            width: '80px', 
                            height: '80px', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: '0 auto 24px',
                            color: '#ef4444'
                        }}>
                            <Trash2 size={40} className="shake-animation" />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px' }}>Delete Invoice?</h3>
                        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
                            Are you sure you want to delete <strong style={{ color: '#1e293b' }}>{billToDelete?.billNumber}</strong>? This action is permanent and cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowDeleteConfirm(false)} style={{ 
                                flex: 1, 
                                padding: '14px', 
                                borderRadius: '16px', 
                                border: '1px solid #e2e8f0', 
                                background: 'white', 
                                color: '#64748b', 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}>Cancel</button>
                            <button onClick={confirmDelete} style={{ 
                                flex: 1, 
                                padding: '14px', 
                                borderRadius: '16px', 
                                border: 'none', 
                                background: '#ef4444', 
                                color: 'white', 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                                transition: 'all 0.2s'
                            }}>Delete Now</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Optimum Professional Deletion Loader */}
            {isDeletingProcess && (
                <div className="modal-overlay" style={{ zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
                    <div style={{ textAlign: 'center', position: 'relative' }}>
                        <div className="shredder-container">
                            <div className="paper-particles">
                                <span></span><span></span><span></span><span></span><span></span>
                            </div>
                            <FileText size={64} className="shredding-bill-pro" />
                            <div className="shredder-mouth">
                                <div className="shredder-glow"></div>
                            </div>
                        </div>
                        
                        <h3 className="purging-text">PURGING RECORD...</h3>
                        
                        <div className="optimum-progress">
                            <div className="optimum-bar">
                                <div className="bar-shine"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Animated Error Notification */}
            {errorMessage && (
                <div className="modal-overlay" style={{ zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ 
                        background: 'white', 
                        padding: '32px', 
                        borderRadius: '28px', 
                        maxWidth: '380px', 
                        width: '90%', 
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        animation: 'modalSlideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                        <div style={{ 
                            width: '64px', 
                            height: '64px', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            borderRadius: '20px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: '0 auto 20px',
                            color: '#ef4444'
                        }}>
                            <div className="shake-animation">
                                <AlertCircle size={32} />
                            </div>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Action Required</h3>
                        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '24px', fontSize: '0.95rem' }}>{errorMessage}</p>
                        <button onClick={() => setErrorMessage(null)} style={{ 
                            width: '100%', 
                            padding: '14px', 
                            borderRadius: '16px', 
                            border: 'none', 
                            background: '#1e293b', 
                            color: 'white', 
                            fontWeight: 700, 
                            cursor: 'pointer',
                            boxShadow: '0 10px 15px -3px rgba(30, 41, 59, 0.3)',
                            transition: 'all 0.2s'
                        }}>Got it, thanks</button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(40px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                
                /* Optimum Shredder Animation */
                .shredder-container {
                    position: relative;
                    width: 120px;
                    height: 140px;
                    margin: 0 auto;
                }
                .shredding-bill-pro {
                    color: rgba(255,255,255,0.7);
                    animation: proShred 2.5s infinite cubic-bezier(0.45, 0, 0.55, 1);
                    position: relative;
                    z-index: 1;
                }
                @keyframes proShred {
                    0% { transform: translateY(-20px); opacity: 0; }
                    20% { transform: translateY(0); opacity: 1; }
                    80% { transform: translateY(30px); opacity: 0.5; clip-path: inset(0 0 40% 0); }
                    100% { transform: translateY(45px); opacity: 0; clip-path: inset(0 0 100% 0); }
                }
                .shredder-mouth {
                    width: 80px;
                    height: 10px;
                    background: #1e293b;
                    border: 2px solid #ef4444;
                    margin: -10px auto 0;
                    border-radius: 4px;
                    position: relative;
                    z-index: 2;
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
                    animation: vibrate 0.1s infinite;
                }
                @keyframes vibrate {
                    0% { transform: translateX(0); }
                    25% { transform: translateX(1px); }
                    75% { transform: translateX(-1px); }
                    100% { transform: translateX(0); }
                }
                .shredder-glow {
                    position: absolute;
                    inset: -5px;
                    background: #ef4444;
                    filter: blur(10px);
                    opacity: 0.4;
                    border-radius: 4px;
                    animation: glowPulse 1.5s infinite ease-in-out;
                }
                @keyframes glowPulse {
                    0%, 100% { opacity: 0.2; transform: scaleX(1); }
                    50% { opacity: 0.6; transform: scaleX(1.1); }
                }
                
                /* Falling Particles */
                .paper-particles {
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 60px;
                    height: 40px;
                }
                .paper-particles span {
                    position: absolute;
                    width: 4px;
                    height: 8px;
                    background: rgba(255,255,255,0.4);
                    top: 10px;
                    animation: fall 1s infinite linear;
                }
                .paper-particles span:nth-child(1) { left: 10%; animation-delay: 0.2s; }
                .paper-particles span:nth-child(2) { left: 30%; animation-delay: 0.5s; }
                .paper-particles span:nth-child(3) { left: 50%; animation-delay: 0.1s; }
                .paper-particles span:nth-child(4) { left: 70%; animation-delay: 0.7s; }
                .paper-particles span:nth-child(5) { left: 90%; animation-delay: 0.4s; }
                
                @keyframes fall {
                    to { transform: translateY(40px) rotate(360deg); opacity: 0; }
                }
                
                .purging-text {
                    color: white;
                    margin-top: 40px;
                    font-weight: 900;
                    letter-spacing: 0.3em;
                    font-size: 1rem;
                    text-transform: uppercase;
                    background: linear-gradient(90deg, #fff, #ef4444, #fff);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: textShine 3s linear infinite;
                }
                @keyframes textShine {
                    to { background-position: 200% center; }
                }
                
                .optimum-progress {
                    width: 240px;
                    height: 6px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                    margin: 25px auto 0;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .optimum-bar {
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #b91c1c, #ef4444);
                    position: relative;
                    animation: optimumFill 2.5s forwards cubic-bezier(0.65, 0, 0.35, 1);
                }
                @keyframes optimumFill {
                    to { width: 100%; }
                }
                .bar-shine {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 50px;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                    animation: shineMove 1.5s infinite;
                }
                @keyframes shineMove {
                    0% { left: -50px; }
                    100% { left: 100%; }
                }
                
                .shake-animation {
                    animation: shake 0.5s infinite ease-in-out;
                }
                @keyframes shake {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-10deg); }
                    75% { transform: rotate(10deg); }
                }

                /* Premium Magnifier Search Loader */
                .premium-search-loader {
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 32px;
                    border: 1px solid var(--border-color);
                    margin: 20px 0;
                }
                .magnifier-animation-wrapper {
                    position: relative;
                    width: 120px;
                    height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .base-bill-icon {
                    color: #cbd5e1;
                    animation: billPulse 2s infinite ease-in-out;
                }
                @keyframes billPulse {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.1); opacity: 0.7; }
                }
                .magnifier-lens {
                    position: absolute;
                    width: 64px;
                    height: 64px;
                    background: var(--accent-gradient);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 15px 35px rgba(3, 105, 161, 0.4);
                    border: 3px solid white;
                    animation: lensMove 4s infinite ease-in-out;
                    z-index: 2;
                }
                @keyframes lensMove {
                    0% { transform: translate(-35px, -35px); }
                    25% { transform: translate(35px, -25px); }
                    50% { transform: translate(30px, 35px); }
                    75% { transform: translate(-40px, 30px); }
                    100% { transform: translate(-35px, -35px); }
                }
                .scan-line {
                    position: absolute;
                    width: 100px;
                    height: 3px;
                    background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
                    z-index: 1;
                    animation: scanVertical 2.5s infinite ease-in-out;
                    box-shadow: 0 0 15px var(--accent-primary);
                }
                @keyframes scanVertical {
                    0% { transform: translateY(-45px); opacity: 0; }
                    20% { opacity: 0.8; }
                    80% { opacity: 0.8; }
                    100% { transform: translateY(45px); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default PurchaseBills;
