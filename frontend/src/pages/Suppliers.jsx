import React, { useState, useEffect } from 'react';
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier, fetchLedgerEntries, createLedgerEntry } from '../utils/api';
import { Building, Plus, Search, History, ArrowUpRight, ArrowDownLeft, X, Save, Wallet, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import '../index.css';

const emptySupplier = { name: '', gstin: '', pan: '', phone: '', email: '', address: '', city: '', state: 'Gujarat', bankName: '', branch: '', accountNo: '', ifsc: '' };

/* ── Animated Modal Overlay ── */
const ModalOverlay = ({ onClose, onSubmit, header, children, footer, maxWidth }) => (
    <div className="s-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
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
        {/* Section: Basic Info */}
        <div className="s-section-label">Basic Info</div>
        <div className="s-form-grid" style={{ marginBottom: '20px' }}>
            <div className="s-field s-span2">
                <label>Business Name <span style={{color:'#ef4444'}}>*</span></label>
                <input type="text" required placeholder="e.g. Sagar Textiles"
                    value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} />
            </div>
            <div className="s-field">
                <label>GSTIN Number</label>
                <input type="text" placeholder="24AAAAA0000A1Z5"
                    value={data.gstin} onChange={e => onChange({ ...data, gstin: e.target.value })} />
            </div>
            <div className="s-field">
                <label>PAN Number</label>
                <input type="text" placeholder="AAAAA0000A"
                    value={data.pan} onChange={e => onChange({ ...data, pan: e.target.value })} />
            </div>
        </div>

        {/* Section: Contact Details */}
        <div className="s-section-label">Contact Details</div>
        <div className="s-form-grid" style={{ marginBottom: '20px' }}>
            <div className="s-field">
                <label>Phone / Mobile</label>
                <input type="text" placeholder="e.g. 9898088844"
                    value={data.phone || ''} onChange={e => onChange({ ...data, phone: e.target.value })} />
            </div>
            <div className="s-field">
                <label>Email Address</label>
                <input type="email" placeholder="e.g. supplier@gmail.com"
                    value={data.email || ''} onChange={e => onChange({ ...data, email: e.target.value })} />
            </div>
            <div className="s-field s-span2">
                <label>Address</label>
                <textarea rows="2" placeholder="Shop / office address..."
                    value={data.address} onChange={e => onChange({ ...data, address: e.target.value })} />
            </div>
            <div className="s-field">
                <label>City</label>
                <input type="text" placeholder="e.g. Surat"
                    value={data.city} onChange={e => onChange({ ...data, city: e.target.value })} />
            </div>
            <div className="s-field">
                <label>State</label>
                <input type="text" placeholder="e.g. Gujarat"
                    value={data.state} onChange={e => onChange({ ...data, state: e.target.value })} />
            </div>
        </div>

        {/* Section: Banking */}
        <div className="s-section-label">Banking Details</div>
        <div className="s-form-grid">
            <div className="s-field">
                <label>Bank Name</label>
                <input type="text" placeholder="e.g. HDFC Bank"
                    value={data.bankName} onChange={e => onChange({ ...data, bankName: e.target.value })} />
            </div>
            <div className="s-field">
                <label>Branch Name</label>
                <input type="text" placeholder="e.g. Shahibaug"
                    value={data.branch || ''} onChange={e => onChange({ ...data, branch: e.target.value })} />
            </div>
            <div className="s-field">
                <label>Account Number</label>
                <input type="text" placeholder="0000000000"
                    value={data.accountNo} onChange={e => onChange({ ...data, accountNo: e.target.value })} />
            </div>
            <div className="s-field">
                <label>IFSC Code</label>
                <input type="text" placeholder="HDFC0001234"
                    value={data.ifsc} onChange={e => onChange({ ...data, ifsc: e.target.value })} />
            </div>
        </div>
    </>
);

const SupplierList = ({ searchTerm, setSearchTerm, loading, filtered, selectedSupplier, selectSupplier, setEditSupplier, setActiveModal, setSelected }) => (
    <div className="premium-card" style={{ height: 'fit-content' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="text" className="input-field" placeholder="Search suppliers by name or GSTIN..."
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
                <div key={s._id} onClick={() => selectSupplier(s)}
                    style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', transition: 'background 0.15s', background: selectedSupplier?._id === s._id ? 'rgba(3,105,161,0.06)' : 'transparent', borderLeft: selectedSupplier?._id === s._id ? '3px solid var(--accent-primary)' : '3px solid transparent' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{s.gstin || 'No GSTIN'}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Outstanding</p>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: s.balance > 0 ? '#ef4444' : '#10b981' }}>₹{s.balance?.toLocaleString('en-IN') || 0}</p>
                        </div>
                        <button className="s-icon-btn s-edit" title="Edit" onClick={e => { e.stopPropagation(); setEditSupplier({ ...s }); setActiveModal('edit'); }}><Pencil size={14} /></button>
                        <button className="s-icon-btn s-del" title="Delete" onClick={e => { e.stopPropagation(); setSelected(s); setActiveModal('delete'); }}><Trash2 size={14} /></button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SupplierLedger = ({ selectedSupplier, ledger, setEditSupplier, setActiveModal }) => (
    <div className="premium-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <div style={{ padding: '7px', background: 'rgba(3,105,161,0.1)', color: 'var(--accent-primary)', borderRadius: '8px' }}><Building size={18} /></div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedSupplier.name}</h2>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '2px' }}>{selectedSupplier.address} {selectedSupplier.city}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary s-sm" onClick={() => { setEditSupplier({ ...selectedSupplier }); setActiveModal('edit'); }}><Pencil size={14} /> Edit</button>
                <button className="btn s-sm s-danger-btn" onClick={() => setActiveModal('delete')}><Trash2 size={14} /> Delete</button>
                <button className="btn btn-primary" onClick={() => setActiveModal('payment')}><Wallet size={16} /> Record Payment</button>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--border-color)' }}>
            {[
                { label: 'Total Udhaar (Purchased)', val: '₹' + ledger.filter(e => e.type === 'credit').reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN'), color: '#ef4444' },
                { label: 'Total Jama (Paid)',      val: '₹' + ledger.filter(e => e.type === 'debit').reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN'),  color: '#10b981' },
                { label: 'Net Balance Due',     val: '₹' + (selectedSupplier.balance?.toLocaleString('en-IN') || 0), color: selectedSupplier.balance > 0 ? '#ef4444' : '#10b981' },
            ].map(({ label, val, color }) => (
                <div key={label} style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{val}</p>
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
                    <div className="modal-header">
                        <div><h2>Add New Supplier</h2><p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>Register a new merchant / vendor</p></div>
                        <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><X size={15} /></button>
                    </div>
                }
                footer={<>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save Supplier'}</button>
                </>}>
                <SupplierFormFields data={newSupplier} onChange={setNewSupplier} />
            </ModalOverlay>
        )}

        {/* ── Edit Modal ── */}
        {activeModal === 'edit' && (
            <ModalOverlay onClose={() => setActiveModal(null)} onSubmit={handleEdit}
                header={
                    <div className="modal-header">
                        <div><h2>Edit Supplier</h2><p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>Updating <strong style={{ color: '#0f172a' }}>{editSupplier.name}</strong></p></div>
                        <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><X size={15} /></button>
                    </div>
                }
                footer={<>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Update Supplier'}</button>
                </>}>
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
                footer={<>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary"><Save size={15} /> Confirm Payment</button>
                </>}>
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

    const selectSupplier = s => { setSelected(s); loadLedger(s._id); };

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

            <div style={{ display: 'grid', gridTemplateColumns: selectedSupplier ? '1fr 1.5fr' : '1fr', gap: '24px', transition: 'all 0.3s ease' }}>

                {/* Supplier List */}
                <SupplierList 
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
                    loading={loading} filtered={filtered} 
                    selectedSupplier={selectedSupplier} selectSupplier={selectSupplier} 
                    setEditSupplier={setEditSupplier} setActiveModal={setActiveModal} setSelected={setSelected} 
                />

                {/* Ledger Panel */}
                {selectedSupplier && (
                    <SupplierLedger
                        selectedSupplier={selectedSupplier}
                        ledger={ledger}
                        setEditSupplier={setEditSupplier}
                        setActiveModal={setActiveModal}
                    />
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

