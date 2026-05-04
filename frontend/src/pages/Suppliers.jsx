import React, { useState, useEffect } from 'react';
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier, fetchLedgerEntries, createLedgerEntry } from '../utils/api';
import { Building, Plus, Search, History, ArrowUpRight, ArrowDownLeft, X, Save, Wallet, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import '../index.css';

const emptySupplier = { name: '', gstin: '', pan: '', phone: '', email: '', address: '', city: '', state: 'Gujarat', bankName: '', branch: '', accountNo: '', ifsc: '' };

/* ── Animated Modal Overlay ── */
const ModalOverlay = ({ onClose, onSubmit, header, children, footer, maxWidth }) => (
    <div className="s-overlay" 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <span className="s-float s-f1">₹</span>
        <span className="s-float s-f2">📦</span>
        <span className="s-float s-f3">🏢</span>
        <span className="s-float s-f4">📄</span>
        <span className="s-float s-f5">💼</span>
        <span className="s-float s-f6">₹</span>

        <div className="s-modal" style={maxWidth ? { maxWidth } : {}}>
            {/* top accent line */}
            <div className="s-modal-accent" />
            {onSubmit ? (
                <form onSubmit={onSubmit} className="s-modal-inner">
                    {header}
                    <div className="modal-body">{children}</div>
                    <div className="modal-footer">{footer}</div>
                </form>
            ) : (
                <div className="s-modal-inner">
                    {header}
                    <div className="modal-body">{children}</div>
                    <div className="modal-footer">{footer}</div>
                </div>
            )}
        </div>
    </div>
);

/* ── Supplier Form Fields ── */
const SupplierFormFields = ({ data, onChange }) => (
    <>
        <div style={{ marginBottom: '6px', gap: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div className="s-field" style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.65rem', marginBottom: '1px', color: '#64748b', fontWeight: 700, display: 'block', textAlign: 'left', paddingLeft: '2px' }}>Business Name *</label>
                <input type="text" required placeholder="Name" style={{ height: '30px', fontSize: '0.8rem', padding: '0 10px', width: '100%' }}
                    value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} />
            </div>
            <div className="s-field">
                <label style={{ fontSize: '0.65rem', marginBottom: '1px', color: '#64748b', fontWeight: 700, display: 'block', textAlign: 'left', paddingLeft: '2px' }}>GSTIN</label>
                <input type="text" placeholder="24AA..." style={{ height: '30px', fontSize: '0.8rem', padding: '0 10px', width: '100%' }}
                    value={data.gstin} onChange={e => onChange({ ...data, gstin: e.target.value })} />
            </div>
            <div className="s-field">
                <label style={{ fontSize: '0.65rem', marginBottom: '1px', color: '#64748b', fontWeight: 700, display: 'block', textAlign: 'left', paddingLeft: '2px' }}>PAN</label>
                <input type="text" placeholder="AAAA..." style={{ height: '30px', fontSize: '0.8rem', padding: '0 10px', width: '100%' }}
                    value={data.pan} onChange={e => onChange({ ...data, pan: e.target.value })} />
            </div>
            <div className="s-field">
                <label style={{ fontSize: '0.65rem', marginBottom: '1px', color: '#64748b', fontWeight: 700, display: 'block', textAlign: 'left', paddingLeft: '2px' }}>Phone</label>
                <input type="text" placeholder="9898..." style={{ height: '30px', fontSize: '0.8rem', padding: '0 10px', width: '100%' }}
                    value={data.phone || ''} onChange={e => onChange({ ...data, phone: e.target.value })} />
            </div>
            <div className="s-field">
                <label style={{ fontSize: '0.65rem', marginBottom: '1px', color: '#64748b', fontWeight: 700, display: 'block', textAlign: 'left', paddingLeft: '2px' }}>Email</label>
                <input type="email" placeholder="Email" style={{ height: '30px', fontSize: '0.8rem', padding: '0 10px', width: '100%' }}
                    value={data.email || ''} onChange={e => onChange({ ...data, email: e.target.value })} />
            </div>
            <div className="s-field" style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.65rem', marginBottom: '1px', color: '#64748b', fontWeight: 700, display: 'block', textAlign: 'left', paddingLeft: '2px' }}>Address</label>
                <input type="text" placeholder="Address" style={{ height: '30px', fontSize: '0.8rem', padding: '0 10px', width: '100%' }}
                    value={data.address} onChange={e => onChange({ ...data, address: e.target.value })} />
            </div>
            <div className="s-field">
                <label style={{ fontSize: '0.65rem', marginBottom: '1px', color: '#64748b', fontWeight: 700, display: 'block', textAlign: 'left', paddingLeft: '2px' }}>City</label>
                <input type="text" placeholder="City" style={{ height: '30px', fontSize: '0.8rem', padding: '0 10px', width: '100%' }}
                    value={data.city} onChange={e => onChange({ ...data, city: e.target.value })} />
            </div>
            <div className="s-field">
                <label style={{ fontSize: '0.65rem', marginBottom: '1px', color: '#64748b', fontWeight: 700, display: 'block', textAlign: 'left', paddingLeft: '2px' }}>State</label>
                <input type="text" placeholder="State" style={{ height: '30px', fontSize: '0.8rem', padding: '0 10px', width: '100%' }}
                    value={data.state} onChange={e => onChange({ ...data, state: e.target.value })} />
            </div>
            <div className="s-field">
                <label style={{ fontSize: '0.65rem', marginBottom: '1px', color: '#64748b', fontWeight: 700, display: 'block', textAlign: 'left', paddingLeft: '2px' }}>Bank</label>
                <input type="text" placeholder="Bank" style={{ height: '30px', fontSize: '0.8rem', padding: '0 10px', width: '100%' }}
                    value={data.bankName} onChange={e => onChange({ ...data, bankName: e.target.value })} />
            </div>
            <div className="s-field">
                <label style={{ fontSize: '0.65rem', marginBottom: '1px', color: '#64748b', fontWeight: 700, display: 'block', textAlign: 'left', paddingLeft: '2px' }}>A/C No</label>
                <input type="text" placeholder="A/C No" style={{ height: '30px', fontSize: '0.8rem', padding: '0 10px', width: '100%' }}
                    value={data.accountNo} onChange={e => onChange({ ...data, accountNo: e.target.value })} />
            </div>
        </div>
    </>
);

const SupplierList = ({ searchTerm, setSearchTerm, loading, filtered, selectedSupplier, selectSupplier, setEditSupplier, setActiveModal, setSelected, ledger }) => {
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpand = (e, s) => {
        e.stopPropagation();
        if (expandedId === s._id) {
            setExpandedId(null);
        } else {
            setExpandedId(s._id);
            selectSupplier(s);
        }
    };

    return (
        <div className="premium-card" style={{ height: 'fit-content' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input type="text" className="input-field" placeholder="Search suppliers..."
                        style={{ paddingLeft: '38px' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>
            <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}><div className="loader" /></div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Building size={40} style={{ marginBottom: '8px', opacity: 0.4 }} /><p>No suppliers found.</p>
                    </div>
                ) : filtered.map(s => (
                    <div key={s._id} style={{ borderBottom: '1px solid var(--border-color)', background: selectedSupplier?._id === s._id ? 'rgba(3,105,161,0.03)' : 'transparent' }}>
                        <div onClick={() => {
                            const newSelected = selectedSupplier?._id === s._id ? null : s;
                            setSelected(newSelected);
                            if (newSelected && window.innerWidth < 1024) {
                                setTimeout(() => {
                                    document.getElementById('ledger-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 100);
                            }
                        }}
                            style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.gstin || 'No GSTIN'}</p>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Balance</p>
                                <p style={{ fontWeight: 800, fontSize: '0.9rem', color: s.balance > 0 ? '#ef4444' : '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    ₹{(s.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SupplierLedger = ({ selectedSupplier, ledger, setEditSupplier, setActiveModal }) => (
    <div className="premium-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
            padding: window.innerWidth < 768 ? '16px' : '20px 24px', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: window.innerWidth < 768 ? 'stretch' : 'flex-start',
            gap: '16px'
        }}>
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: window.innerWidth < 768 ? 'center' : 'flex-start',
                textAlign: window.innerWidth < 768 ? 'center' : 'left'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', justifyContent: window.innerWidth < 768 ? 'center' : 'flex-start' }}>
                    <div style={{ padding: '6px', background: 'rgba(3,105,161,0.1)', color: 'var(--accent-primary)', borderRadius: '6px' }}><Building size={16} /></div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedSupplier.name}</h2>
                </div>
                <div style={{ display: 'flex', gap: '15px', justifyContent: window.innerWidth < 768 ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14}/> {selectedSupplier.address} {selectedSupplier.city}</p>
                </div>
            </div>
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '10px', 
                width: window.innerWidth < 768 ? '100%' : 'auto',
                maxWidth: window.innerWidth < 768 ? '280px' : 'none',
                margin: window.innerWidth < 768 ? '0 auto' : '0',
                justifyContent: 'center'
            }}>
                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '10px', width: '100%' }} onClick={() => setActiveModal('payment')}><Wallet size={14} /> Payment</button>
                <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '10px', width: '100%' }} onClick={() => { setEditSupplier({ ...selectedSupplier }); setActiveModal('edit'); }}><Pencil size={14} /> Edit</button>
                <button className="btn s-danger-btn" style={{ fontSize: '0.8rem', padding: '10px', width: '100%' }} onClick={() => setActiveModal('delete')}><Trash2 size={14} /> Delete</button>
            </div>
        </div>

        <div className="stats-grid" style={{ 
            borderBottom: '1px solid var(--border-color)', 
            gap: 0,
            gridTemplateColumns: window.innerWidth < 768 ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))'
        }}>
            {[
                { label: 'Purchased', val: '₹' + ledger.filter(e => e.type === 'credit').reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN'), color: '#ef4444' },
                { label: 'Paid', val: '₹' + ledger.filter(e => e.type === 'debit').reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN'),  color: '#10b981' },
                { label: 'Balance',   val: '₹' + (selectedSupplier.balance?.toLocaleString('en-IN') || 0), color: selectedSupplier.balance > 0 ? '#ef4444' : '#10b981' },
            ].map(({ label, val, color }, idx) => (
                <div key={label} style={{ 
                    padding: window.innerWidth < 768 ? '10px 4px' : '16px', 
                    textAlign: 'center', 
                    borderRight: idx < 2 ? '1px solid var(--border-color)' : 'none' 
                }}>
                    <p style={{ fontSize: window.innerWidth < 768 ? '0.6rem' : '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px', textTransform: 'uppercase' }}>{label}</p>
                    <p style={{ fontSize: window.innerWidth < 768 ? '0.85rem' : '1.1rem', fontWeight: 800, color }}>{val}</p>
                </div>
            ))}
        </div>

        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '14px', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><History size={16} /> Transaction History</h3>
            <div className="table-container">
                <table className="premium-table">
                    <thead><tr><th>Date</th><th>Description</th><th className="right" style={{color: '#ef4444'}}>Udhaar (+)</th><th className="right" style={{color: '#10b981'}}>Jama (-)</th><th className="right">Balance</th></tr></thead>
                    <tbody>
                        {ledger.length === 0
                            ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No transactions yet.</td></tr>
                            : (() => {
                                let currentBal = selectedSupplier.balance || 0;
                                return ledger.map(entry => {
                                    const rowBalance = currentBal;
                                    if (entry.type === 'credit') {
                                        currentBal -= entry.amount;
                                    } else {
                                        currentBal += entry.amount;
                                    }
                                    return (
                                        <tr key={entry._id}>
                                            <td>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                                            <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {entry.type === 'credit' ? <ArrowUpRight size={13} style={{ color: '#ef4444' }} /> : <ArrowDownLeft size={13} style={{ color: '#10b981' }} />}
                                                {entry.description}
                                            </td>
                                            <td className="right" style={{ fontWeight: 700, color: '#ef4444' }}>
                                                {entry.type === 'credit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                            <td className="right" style={{ fontWeight: 700, color: '#10b981' }}>
                                                {entry.type === 'debit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                            <td className="right">₹{rowBalance.toLocaleString('en-IN')}</td>
                                        </tr>
                                    );
                                });
                            })()
                        }
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const SupplierModals = ({
    activeModal, setActiveModal,
    handleAdd, handleEdit, handleDelete, handlePayment,
    saving,
    newSupplier, setNewSupplier,
    editSupplier, setEditSupplier,
    selectedSupplier,
    payment, setPayment
}) => (
    <>
        {/* ── Add Modal ── */}
        {activeModal === 'add' && (
            <ModalOverlay onClose={() => setActiveModal(null)} onSubmit={handleAdd}
                header={
                    <div className="modal-header" style={{ position: 'relative', padding: '8px 40px 6px 12px', minHeight: 'auto' }}>
                        <div>
                            <h2 style={{ fontSize: '0.9rem', marginBottom: '0', whiteSpace: 'nowrap' }}>Add New Supplier</h2>
                        </div>
                        <button type="button" className="close-btn" style={{ position: 'absolute', right: '8px', top: '8px' }} onClick={() => setActiveModal(null)}><X size={13} /></button>
                    </div>
                }
                footer={<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '8px', fontSize: '0.85rem' }} onClick={() => setActiveModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px', fontSize: '0.85rem', whiteSpace: 'nowrap' }} disabled={saving}>
                        <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>}>
                <SupplierFormFields data={newSupplier} onChange={setNewSupplier} />
            </ModalOverlay>
        )}

        {/* ── Edit Modal ── */}
        {activeModal === 'edit' && (
            <ModalOverlay onClose={() => setActiveModal(null)} onSubmit={handleEdit}
                header={
                    <div className="modal-header" style={{ position: 'relative', padding: '8px 40px 6px 12px', minHeight: 'auto' }}>
                        <div>
                            <h2 style={{ fontSize: '0.9rem', marginBottom: '0', whiteSpace: 'nowrap' }}>Edit Supplier</h2>
                        </div>
                        <button type="button" className="close-btn" style={{ position: 'absolute', right: '8px', top: '8px' }} onClick={() => setActiveModal(null)}><X size={13} /></button>
                    </div>
                }
                footer={<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '8px', fontSize: '0.85rem' }} onClick={() => setActiveModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px', fontSize: '0.85rem', whiteSpace: 'nowrap' }} disabled={saving}>
                        <Save size={14} /> {saving ? 'Update' : 'Update'}
                    </button>
                </div>}>
                <SupplierFormFields data={editSupplier} onChange={setEditSupplier} />
            </ModalOverlay>
        )}

        {/* ── Delete Modal ── */}
        {activeModal === 'delete' && (
            <ModalOverlay onClose={() => setActiveModal(null)} maxWidth="400px"
                header={
                    <div className="modal-header" style={{ background: 'linear-gradient(135deg,#fff5f5,#fff)' }}>
                        <h2 style={{ color: '#dc2626' }}>Delete Supplier</h2>
                        <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><X size={15} /></button>
                    </div>
                }
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Keep Supplier</button>
                    <button className="btn s-danger-btn" onClick={handleDelete} disabled={saving}><Trash2 size={14} /> {saving ? 'Deleting…' : 'Yes, Delete'}</button>
                </>}>
                <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}><AlertTriangle size={26} /></div>
                    <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '8px' }}>Delete "{selectedSupplier?.name}"?</p>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6 }}>This action is permanent and cannot be undone.</p>
                </div>
            </ModalOverlay>
        )}

        {/* ── Payment Modal ── */}
        {activeModal === 'payment' && (
            <ModalOverlay onClose={() => setActiveModal(null)} onSubmit={handlePayment} maxWidth="440px"
                header={
                    <div className="modal-header">
                        <div><h2>Record Payment</h2><p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>To: <strong style={{ color: '#0f172a' }}>{selectedSupplier?.name}</strong></p></div>
                        <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><X size={15} /></button>
                    </div>
                }
                footer={<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '8px', fontSize: '0.85rem' }} onClick={() => setActiveModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px', fontSize: '0.85rem', whiteSpace: 'nowrap' }} disabled={saving}>
                        <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>}>
                <div className="s-field"><label>Payment Amount (₹)</label><input type="number" required placeholder="0.00" autoFocus value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} /></div>
                <div className="s-field"><label>Description / Note</label><input type="text" placeholder="e.g. Paid via GPay" value={payment.description} onChange={e => setPayment({ ...payment, description: e.target.value })} /></div>
                <div className="s-field"><label>Payment Date</label><input type="date" required value={payment.date} onChange={e => setPayment({ ...payment, date: e.target.value })} /></div>
            </ModalOverlay>
        )}
    </>
);

const Suppliers = () => {
    const [suppliers, setSuppliers]           = useState([]);
    const [loading, setLoading]               = useState(true);
    const [selectedSupplier, setSelected]     = useState(null);
    const [ledger, setLedger]                 = useState([]);
    const [activeModal, setActiveModal]       = useState(null); // 'add', 'edit', 'delete', 'payment', null
    const [searchTerm, setSearchTerm]         = useState('');
    const [saving, setSaving]                 = useState(false);
    const [newSupplier, setNewSupplier]       = useState(emptySupplier);
    const [editSupplier, setEditSupplier]     = useState(emptySupplier);
    const [payment, setPayment]               = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });

    useEffect(() => { loadSuppliers(); }, []);

    const loadSuppliers = async () => {
        try { setLoading(true); setSuppliers(await fetchSuppliers()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadLedger = async id => {
        try { setLedger(await fetchLedgerEntries(id)); }
        catch (e) { console.error(e); }
    };

    const selectSupplier = s => { 
        setSelected(s); 
        if (s) loadLedger(s._id); 
        else setLedger([]);
    };

    const handleAdd = async e => {
        e.preventDefault(); setSaving(true);
        try { await createSupplier(newSupplier); setActiveModal(null); setNewSupplier(emptySupplier); loadSuppliers(); }
        catch { alert('Failed to save'); } finally { setSaving(false); }
    };

    const handleEdit = async e => {
        e.preventDefault(); setSaving(true);
        try {
            const updated = await updateSupplier(editSupplier._id, editSupplier);
            setActiveModal(null);
            if (selectedSupplier?._id === editSupplier._id) setSelected(updated);
            loadSuppliers();
        } catch { alert('Failed to update'); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setSaving(true);
        try { await deleteSupplier(selectedSupplier._id); setActiveModal(null); setSelected(null); setLedger([]); loadSuppliers(); }
        catch { alert('Failed to delete'); } finally { setSaving(false); }
    };

    const handlePayment = async e => {
        e.preventDefault();
        try {
            await createLedgerEntry({ partyType: 'supplier', partyId: selectedSupplier._id, partyName: selectedSupplier.name, type: 'debit', amount: Number(payment.amount), description: payment.description || 'Payment to supplier' });
            setActiveModal(null); setPayment({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
            selectSupplier(selectedSupplier); loadSuppliers();
        } catch { alert('Failed to record payment'); }
    };

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="text-gradient">Supplier Management</h1>
                    <p className="text-secondary">Track purchase history, payments, and outstanding balances</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setActiveModal('add')}>
                        <Plus size={18} /> Add New Merchant
                    </button>
                </div>
            </header>

            <div className="charts-grid" style={{ 
                gridTemplateColumns: selectedSupplier && window.innerWidth >= 1024 ? '1fr 1.5fr' : '1fr', 
                transition: 'all 0.3s ease' 
            }}>
                {/* Supplier List - Always Visible */}
                <SupplierList 
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
                    loading={loading} filtered={filtered} 
                    selectedSupplier={selectedSupplier} selectSupplier={selectSupplier} 
                    setEditSupplier={setEditSupplier} setActiveModal={setActiveModal} setSelected={setSelected} 
                    ledger={ledger}
                />

                {/* Ledger Panel - Fully Responsive (Visible on Mobile when selected) */}
                {selectedSupplier && (
                    <div id="ledger-panel" className="animate-fade-in">
                        <SupplierLedger
                            selectedSupplier={selectedSupplier}
                            ledger={ledger}
                            setEditSupplier={setEditSupplier}
                            setActiveModal={setActiveModal}
                        />
                    </div>
                )}
            </div>

            <SupplierModals
                activeModal={activeModal} setActiveModal={setActiveModal}
                handleAdd={handleAdd} handleEdit={handleEdit} handleDelete={handleDelete} handlePayment={handlePayment}
                saving={saving}
                newSupplier={newSupplier} setNewSupplier={setNewSupplier}
                editSupplier={editSupplier} setEditSupplier={setEditSupplier}
                selectedSupplier={selectedSupplier}
                payment={payment} setPayment={setPayment}
            />
        </div>
    );
};

export default Suppliers;

