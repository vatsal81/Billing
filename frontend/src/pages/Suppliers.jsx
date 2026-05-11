import React, { useState, useEffect, useRef } from 'react';
import {
    fetchSuppliers, createSupplier, updateSupplier, deleteSupplier,
    fetchLedgerEntries, createLedgerEntry, downloadSinglePurchaseBillPdf,
    fetchPurchaseBill, getBackendUrl
} from '../utils/api';
import {
    Building, Plus, Search, History, ArrowUpRight, ArrowDownLeft,
    X, Save, Wallet, Pencil, Trash2, MapPin, Eye, FileText, Loader2, Image, AlertTriangle
} from 'lucide-react';
import PurchaseBillView from './PurchaseBillView';
import './Suppliers.css';
import '../index.css';

const emptySupplier = {
    name: '', gstin: '', pan: '', phone: '', email: '',
    address: '', city: '', state: 'Gujarat',
    bankName: '', branch: '', accountNo: '', ifsc: '', balance: 0
};

/* ── Reusable Modal Component ── */
const Modal = ({ title, onClose, children, footer, maxWidth = '500px' }) => (
    <div className="s-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="s-modal" style={{ maxWidth }}>
            <div className="s-modal-accent" />
            <div className="s-modal-inner">
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
                    <X size={20} onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
                </div>
                <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>{children}</div>
                {footer && <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>{footer}</div>}
            </div>
        </div>
    </div>
);

const Suppliers = () => {
    // ── State Management ──
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelected] = useState(null);
    const [ledger, setLedger] = useState([]);

    const [loading, setLoading] = useState(true);
    const [fetchingLedger, setFetchingLedger] = useState(false);
    const [saving, setSaving] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeModal, setActiveModal] = useState(null); // 'add', 'edit', 'delete', 'payment'

    const [formData, setFormData] = useState(emptySupplier);
    const [paymentData, setPaymentData] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });

    const [viewingBillId, setViewingBillId] = useState(null);
    const [fetchingBill, setFetchingBill] = useState(false);

    const activeReqId = useRef(null);

    // ── Data Fetching ──
    const loadSuppliers = async () => {
        try {
            setLoading(true);
            const data = await fetchSuppliers();
            setSuppliers(data);

            // Re-sync selected supplier if already selected
            if (selectedSupplier) {
                const updated = data.find(s => s._id === selectedSupplier._id);
                if (updated) setSelected(updated);
            }
        } catch (err) {
            console.error('Failed to load suppliers:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadLedger = async (supplierId) => {
        if (!supplierId) {
            setLedger([]);
            return;
        }

        try {
            setFetchingLedger(true);
            activeReqId.current = supplierId;
            const response = await fetchLedgerEntries(supplierId);

            // Important: Handle both array and object responses from my diagnostic phase
            const entries = Array.isArray(response) ? response : (response.entries || []);

            if (activeReqId.current === supplierId) {
                setLedger(entries);
            }
        } catch (err) {
            console.error('Failed to load ledger:', err);
            if (activeReqId.current === supplierId) setLedger([]);
        } finally {
            if (activeReqId.current === supplierId) setFetchingLedger(false);
        }
    };

    useEffect(() => {
        loadSuppliers();
    }, []);

    useEffect(() => {
        if (selectedSupplier) {
            loadLedger(selectedSupplier._id);
        } else {
            setLedger([]);
        }
    }, [selectedSupplier?._id]);

    // ── Handlers ──
    const handleAddEdit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (activeModal === 'add') {
                await createSupplier(formData);
            } else {
                await updateSupplier(formData._id, formData);
            }
            setActiveModal(null);
            loadSuppliers();
        } catch (err) {
            alert('Failed to save supplier details');
        } finally {
            setSaving(true);
        }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            await deleteSupplier(selectedSupplier._id);
            setSelected(null);
            setActiveModal(null);
            loadSuppliers();
        } catch (err) {
            alert('Failed to delete supplier');
        } finally {
            setSaving(false);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await createLedgerEntry({
                partyType: 'supplier',
                partyId: selectedSupplier._id,
                partyName: selectedSupplier.name,
                type: 'debit',
                amount: Number(paymentData.amount),
                description: paymentData.description || 'Payment made to supplier',
                date: paymentData.date
            });
            setPaymentData({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
            setActiveModal(null);
            loadSuppliers();
            loadLedger(selectedSupplier._id);
        } catch (err) {
            alert('Failed to record payment');
        } finally {
            setSaving(false);
        }
    };

    // ── Filtered List ──
    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ── Render Helpers ──
    const purchasedTotal = ledger.filter(e => e.type === 'credit').reduce((a, b) => a + b.amount, 0);
    const paidTotal = ledger.filter(e => e.type === 'debit').reduce((a, b) => a + b.amount, 0);

    return (
        <div className="page-container suppliers-page-wrapper">
            {/* Header section remains fixed */}
            <header className="page-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '4px' }}>Supplier Management</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Track purchase history, payments, and outstanding balances</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setFormData(emptySupplier); setActiveModal('add'); }}>
                    <Plus size={18} /> Add New Merchant
                </button>
            </header>

            <div className="suppliers-grid-layout">
                {/* ── Left Sidebar: List ── */}
                <div className="premium-card sidebar-container" style={{ padding: 0, position: 'sticky', top: '20px' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'var(--bg-secondary)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.2s'
                        }} className="search-container-hover">
                            <Search size={16} style={{ color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder="Search merchants..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    width: '100%',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-primary)'
                                }}
                            />
                        </div>
                    </div>
                    <div className="merchant-list-container custom-scrollbar" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
                        ) : filteredSuppliers.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No merchants found.</div>
                        ) : filteredSuppliers.map(s => (
                            <div
                                key={s._id}
                                className={`s-card supplier-sidebar-card ${selectedSupplier?._id === s._id ? 'selected' : ''}`}
                                onClick={() => setSelected(s)}
                                style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{s.name}</h4>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: s.balance > 0 ? '#ef4444' : '#10b981' }}>
                                        ₹{s.balance.toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.gstin || 'No GST'}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Right Content: Detail & Ledger ── */}
                {!selectedSupplier ? (
                        <div className="premium-card" style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <Building size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                            <h3>Select a supplier to view history</h3>
                            <p>Detailed transaction history and payment options will appear here.</p>
                        </div>
                    ) : (
                        <div key={selectedSupplier._id} className="suppliers-container premium-card merged-detail-card" style={{ padding: '24px' }}>
                            {/* Merchant Header & Stats */}
                            <div className="merchant-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <div style={{ padding: '8px', background: 'rgba(3,105,161,0.1)', color: 'var(--accent-primary)', borderRadius: '8px' }}><Building size={20} /></div>
                                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{selectedSupplier.name}</h2>
                                    </div>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        <MapPin size={14} /> {selectedSupplier.address}, {selectedSupplier.city}
                                    </p>
                                </div>
                                <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
                                    <button className="btn btn-primary" onClick={() => setActiveModal('payment')}><Wallet size={16} /> Payment</button>
                                    <button className="btn btn-secondary" onClick={() => { setFormData(selectedSupplier); setActiveModal('edit'); }}><Pencil size={16} /> Edit</button>
                                    <button className="btn btn-danger" style={{ padding: '10px' }} onClick={() => setActiveModal('delete')}><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="stats-grid merchant-stats-grid" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                <div className="premium-stat-card">
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Purchased</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>₹{purchasedTotal.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="premium-stat-card" style={{ borderTopColor: '#10b981' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Paid</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>₹{paidTotal.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="premium-stat-card" style={{ borderTopColor: selectedSupplier.balance > 0 ? '#ef4444' : '#10b981' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Outstanding Balance</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: selectedSupplier.balance > 0 ? '#ef4444' : '#10b981' }}>₹{selectedSupplier.balance.toLocaleString('en-IN')}</p>
                                </div>
                            </div>

                            {/* Transaction History Unified Box */}
                            <div className="table-container" style={{ marginTop: '32px' }}>
                                <div className="history-header" style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.02)' }}>
                                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <History size={16} /> Transaction History
                                    </h3>
                                    {fetchingLedger && <Loader2 className="animate-spin" size={14} />}
                                </div>
                                <table className="premium-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Description</th>
                                                <th style={{ color: '#ef4444' }}>Udhaar (+)</th>
                                                <th style={{ color: '#10b981' }}>Jama (-)</th>
                                                <th>Balance</th>
                                                <th className="center" style={{ width: '220px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ledger.length === 0 ? (
                                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>No transactions found for this supplier.</td></tr>
                                            ) : (() => {
                                                let runningBal = selectedSupplier.balance;
                                                return [...ledger].map((entry, idx) => {
                                                    const rowBal = runningBal;
                                                    if (entry.type === 'credit') runningBal -= entry.amount;
                                                    else runningBal += entry.amount;

                                                    return (
                                                        <tr key={entry._id || idx} className="ledger-row" style={{ animationDelay: `${idx * 0.05}s` }}>
                                                            <td data-label="Date" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                                                <div className="td-content">
                                                                    <span className="mobile-label">Date</span>
                                                                    <span className="ledger-value">{new Date(entry.date).toLocaleDateString('en-IN')}</span>
                                                                </div>
                                                            </td>
                                                            <td data-label="Description" style={{ fontSize: '0.85rem' }}>
                                                                <div className="td-content description-cell">
                                                                    <span className="mobile-label">Desc</span>
                                                                    <div className="ledger-description" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                                                        <div className="desc-main" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>
                                                                            {entry.type === 'credit' ? <ArrowUpRight size={12} color="#ef4444" /> : <ArrowDownLeft size={12} color="#10b981" />}
                                                                            <span>Pur. Bill No.</span>
                                                                        </div>
                                                                        <div className="desc-no" style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                                                                            {entry.description.includes('No:') ? entry.description.split('No:')[1].trim() : entry.description}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td data-label="Udhaar (+)" style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.85rem' }}>
                                                                <div className="td-content">
                                                                    <span className="mobile-label">Udhaar (+)</span>
                                                                    <span className="ledger-value">{entry.type === 'credit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}</span>
                                                                </div>
                                                            </td>
                                                            <td data-label="Jama (-)" style={{ fontWeight: 700, color: '#10b981', fontSize: '0.85rem' }}>
                                                                <div className="td-content">
                                                                    <span className="mobile-label">Jama (-)</span>
                                                                    <span className="ledger-value">{entry.type === 'debit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}</span>
                                                                </div>
                                                            </td>
                                                            <td data-label="Balance" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                                <div className="td-content">
                                                                    <span className="mobile-label">Balance</span>
                                                                    <span className="ledger-value">₹{rowBal.toLocaleString('en-IN')}</span>
                                                                </div>
                                                            </td>
                                                            <td data-label="Action" className="center">
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                    {entry.referenceId && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    const bill = await fetchPurchaseBill(entry.referenceId);
                                                                                    if (bill?.billImage) {
                                                                                        window.open(`${getBackendUrl()}/${bill.billImage}`, '_blank');
                                                                                    } else {
                                                                                        alert('No original scan was uploaded for this bill.');
                                                                                    }
                                                                                } catch (e) {
                                                                                    alert('Error opening original scan: ' + e.message);
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                padding: '6px 12px',
                                                                                fontSize: '0.75rem',
                                                                                background: 'rgba(244, 63, 94, 0.08)',
                                                                                color: '#f43f5e',
                                                                                border: '1px solid rgba(244, 63, 94, 0.2)',
                                                                                borderRadius: '6px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '6px',
                                                                                cursor: 'pointer',
                                                                                fontWeight: 600,
                                                                                transition: 'all 0.2s'
                                                                            }}
                                                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)'}
                                                                            onMouseOut={e => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)'}
                                                                        >
                                                                            <Image size={13} /> Original
                                                                        </button>
                                                                    )}
                                                                    {entry.referenceId && (
                                                                        <button
                                                                            onClick={() => setViewingBillId(entry.referenceId)}
                                                                            style={{
                                                                                padding: '6px 12px',
                                                                                fontSize: '0.75rem',
                                                                                background: 'rgba(3,105,161,0.08)',
                                                                                color: 'var(--accent-primary)',
                                                                                border: '1px solid rgba(3,105,161,0.2)',
                                                                                borderRadius: '6px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '6px',
                                                                                cursor: 'pointer',
                                                                                fontWeight: 600,
                                                                                transition: 'all 0.2s'
                                                                            }}
                                                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(3,105,161,0.15)'}
                                                                            onMouseOut={e => e.currentTarget.style.background = 'rgba(3,105,161,0.08)'}
                                                                        >
                                                                            <Eye size={13} /> View
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                        </div>
                )}
            </div>

            {/* ── Modals ── */}
            {activeModal === 'delete' && (
                <Modal title="Delete Merchant" onClose={() => setActiveModal(null)} footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                        <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Delete Forever</button>
                    </>
                }>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', width: 'fit-content', margin: '0 auto 16px' }}>
                            <AlertTriangle size={32} />
                        </div>
                        <h3>Are you absolutely sure?</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>This will delete <b>{selectedSupplier?.name}</b> and all associated history. This action cannot be undone.</p>
                    </div>
                </Modal>
            )}

            {(activeModal === 'add' || activeModal === 'edit') && (
                <Modal title={activeModal === 'add' ? 'Add New Supplier' : 'Edit Supplier Details'} onClose={() => setActiveModal(null)} footer={
                    <button className="btn btn-primary" onClick={handleAddEdit} disabled={saving}><Save size={16} /> Save Changes</button>
                }>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="s-field" style={{ gridColumn: 'span 2' }}>
                            <label>Business Name *</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="s-field"><label>GSTIN</label><input type="text" value={formData.gstin} onChange={e => setFormData({ ...formData, gstin: e.target.value })} /></div>
                        <div className="s-field"><label>Phone</label><input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                        <div className="s-field" style={{ gridColumn: 'span 2' }}><label>Address</label><input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
                        <div className="s-field"><label>City</label><input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} /></div>
                        <div className="s-field"><label>Opening Balance</label><input type="number" value={formData.balance} onChange={e => setFormData({ ...formData, balance: e.target.value })} /></div>
                    </div>
                </Modal>
            )}

            {activeModal === 'payment' && (
                <Modal title={`Record Payment to ${selectedSupplier?.name}`} onClose={() => setActiveModal(null)} footer={
                    <button className="btn btn-primary" onClick={handlePayment} disabled={saving}><Wallet size={16} /> Confirm Payment</button>
                }>
                    <div className="s-field" style={{ marginBottom: '16px' }}>
                        <label>Amount (₹) *</label>
                        <input type="number" value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })} required autoFocus />
                    </div>
                    <div className="s-field" style={{ marginBottom: '16px' }}>
                        <label>Description / Note</label>
                        <input type="text" value={paymentData.description} onChange={e => setPaymentData({ ...paymentData, description: e.target.value })} placeholder="e.g. Paid via GPay" />
                    </div>
                    <div className="s-field">
                        <label>Date</label>
                        <input type="date" value={paymentData.date} onChange={e => setPaymentData({ ...paymentData, date: e.target.value })} required />
                    </div>
                </Modal>
            )}

            {/* Bill Viewer Modal */}
            {viewingBillId && (
                <PurchaseBillView
                    billId={viewingBillId}
                    onClose={() => setViewingBillId(null)}
                    setFetchingBill={setFetchingBill}
                />
            )}
        </div>
    );
};

export default Suppliers;
