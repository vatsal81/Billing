import React, { useState, useEffect } from 'react';
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer, fetchLedgerEntries, createLedgerEntry, fetchBillById, transliterateText } from '../utils/api';
import { User, Plus, Search, History, ArrowUpRight, ArrowDownLeft, X, Save, Wallet, Pencil, Trash2, AlertTriangle, Phone, MapPin, Eye } from 'lucide-react';
import PrintableBill from '../components/PrintableBill';
import GujaratiInput from '../components/GujaratiInput';
import '../index.css';

const emptyCustomer = { name: '', nameGujarati: '', address: '', addressGujarati: '', phone: '' };

/* ── Animated Modal Overlay ── */
const ModalOverlay = ({ onClose, onSubmit, header, children, footer, maxWidth }) => (
    <div className="s-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <span className="s-float s-f1">₹</span>
        <span className="s-float s-f2">👤</span>
        <span className="s-float s-f3">💳</span>
        <span className="s-float s-f4">📄</span>
        <span className="s-float s-f5">💼</span>
        <span className="s-float s-f6">₹</span>

        <div className="s-modal" style={maxWidth ? { maxWidth } : {}}>
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

/* ── Customer Form Fields ── */
const CustomerFormFields = ({ data, onChange }) => (
    <>
        <div className="s-section-label">Basic Info</div>
        <div className="s-form-grid" style={{ marginBottom: '20px' }}>
            <div className="s-field">
                <label>Customer Name <span style={{color:'#ef4444'}}>*</span></label>
                <input type="text" required placeholder="e.g. Rahul Patel"
                    value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} />
            </div>
            <div className="s-field">
                <label>Customer Name (Gujarati)</label>
                <GujaratiInput placeholder="e.g. રાહુલ પટેલ" className="input-field"
                    value={data.nameGujarati} 
                    onChange={val => onChange({ ...data, nameGujarati: val })}
                    onOriginal={orig => {
                        if (!data.name) onChange({ ...data, name: orig });
                    }}
                />
            </div>
        </div>

        <div className="s-section-label">Contact Details</div>
        <div className="s-form-grid" style={{ marginBottom: '20px' }}>
            <div className="s-field s-span2">
                <label>Phone / Mobile</label>
                <input type="text" placeholder="e.g. 9898088844"
                    value={data.phone} onChange={e => onChange({ ...data, phone: e.target.value })} />
            </div>
            <div className="s-field s-span2">
                <label>Address</label>
                <textarea rows="2" placeholder="Full address..."
                    value={data.address} onChange={e => onChange({ ...data, address: e.target.value })} />
            </div>
            <div className="s-field s-span2">
                <label>Address (Gujarati)</label>
                <GujaratiInput placeholder="સરનામું..." className="input-field"
                    value={data.addressGujarati} 
                    onChange={val => onChange({ ...data, addressGujarati: val })}
                    onOriginal={orig => {
                        if (!data.address) onChange({ ...data, address: orig });
                    }}
                />
            </div>
        </div>
    </>
);

const CustomerList = ({ searchTerm, setSearchTerm, loading, filtered, selectedCustomer, selectCustomer, setEditCustomer, setActiveModal, setSelected }) => (
    <div className="premium-card" style={{ height: 'fit-content' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="text" className="input-field" placeholder="Search customers by name or phone..."
                    style={{ paddingLeft: '38px' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>
        <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}><div className="loader" /></div>
            ) : filtered.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <User size={40} style={{ marginBottom: '8px', opacity: 0.4 }} /><p>No customers found.</p>
                </div>
            ) : filtered.map(c => (
                <div key={c._id} onClick={() => selectCustomer(c)}
                    style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', transition: 'background 0.15s', background: selectedCustomer?._id === c._id ? 'rgba(99, 102, 241, 0.06)' : 'transparent', borderLeft: selectedCustomer?._id === c._id ? '3px solid var(--accent-primary)' : '3px solid transparent' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.phone || 'No Phone'}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Outstanding</p>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: c.balance > 0 ? '#ef4444' : '#10b981' }}>₹{c.balance?.toLocaleString('en-IN') || 0}</p>
                        </div>
                        <button className="s-icon-btn s-edit" title="Edit" onClick={e => { e.stopPropagation(); setEditCustomer({ ...c }); setActiveModal('edit'); }}><Pencil size={14} /></button>
                        <button className="s-icon-btn s-del" title="Delete" onClick={e => { e.stopPropagation(); setSelected(c); setActiveModal('delete'); }}><Trash2 size={14} /></button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const CustomerLedger = ({ selectedCustomer, ledger, setEditCustomer, setActiveModal, handleViewBill }) => (
    <div className="premium-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ padding: '7px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', borderRadius: '8px' }}><User size={18} /></div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedCustomer.name}</h2>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    {selectedCustomer.phone && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={14}/> {selectedCustomer.phone}</p>}
                    {selectedCustomer.address && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14}/> {selectedCustomer.address}</p>}
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary s-sm" onClick={() => { setEditCustomer({ ...selectedCustomer }); setActiveModal('edit'); }}><Pencil size={14} /> Edit</button>
                <button className="btn s-sm s-danger-btn" onClick={() => setActiveModal('delete')}><Trash2 size={14} /> Delete</button>
                <button className="btn btn-primary" onClick={() => setActiveModal('payment')}><Wallet size={16} /> Receive Payment</button>
            </div>
        </div>

        <div className="stats-grid" style={{ borderBottom: '1px solid var(--border-color)', gap: 0 }}>
            {[
                { label: 'Total Udhaar (Bills)', val: '₹' + ledger.filter(e => e.type === 'debit').reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN'), color: '#ef4444' },
                { label: 'Total Jama (Received)', val: '₹' + ledger.filter(e => e.type === 'credit').reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN'),  color: '#10b981' },
                { label: 'Net Balance Due',       val: '₹' + (selectedCustomer.balance?.toLocaleString('en-IN') || 0), color: selectedCustomer.balance > 0 ? '#ef4444' : '#10b981' },
            ].map(({ label, val, color }, idx) => (
                <div key={label} style={{ padding: '16px', textAlign: 'center', borderRight: idx < 2 ? '1px solid var(--border-color)' : 'none' }}>
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
                                let currentBal = selectedCustomer.balance || 0;
                                return ledger.map(entry => {
                                    const rowBalance = currentBal;
                                    if (entry.type === 'debit') {
                                        currentBal -= entry.amount; // debit = udhaar = added to balance
                                    } else {
                                        currentBal += entry.amount; // credit = jama = subtracted from balance
                                    }
                                    return (
                                        <tr key={entry._id}>
                                            <td>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                                            <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {entry.type === 'debit' ? <ArrowUpRight size={13} style={{ color: '#ef4444' }} /> : <ArrowDownLeft size={13} style={{ color: '#10b981' }} />}
                                                {entry.description}
                                                {entry.referenceId && entry.type === 'debit' && (
                                                    <button onClick={() => handleViewBill(entry.referenceId)} style={{background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', marginLeft: '8px'}} title="View Bill">
                                                        <Eye size={12} /> View Bill
                                                    </button>
                                                )}
                                            </td>
                                            <td className="right" style={{ fontWeight: 700, color: '#ef4444' }}>
                                                {entry.type === 'debit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                            <td className="right" style={{ fontWeight: 700, color: '#10b981' }}>
                                                {entry.type === 'credit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
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

const CustomerModals = ({
    activeModal, setActiveModal,
    handleAdd, handleEdit, handleDelete, handlePayment,
    saving,
    newCustomer, setNewCustomer,
    editCustomer, setEditCustomer,
    selectedCustomer,
    payment, setPayment
}) => (
    <>
        {/* ── Add Modal ── */}
        {activeModal === 'add' && (
            <ModalOverlay onClose={() => setActiveModal(null)} onSubmit={handleAdd}
                header={
                    <div className="modal-header">
                        <div><h2>Add New Customer</h2><p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>Register a new regular customer</p></div>
                        <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><X size={15} /></button>
                    </div>
                }
                footer={<>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save Customer'}</button>
                </>}>
                <CustomerFormFields data={newCustomer} onChange={setNewCustomer} />
            </ModalOverlay>
        )}

        {/* ── Edit Modal ── */}
        {activeModal === 'edit' && (
            <ModalOverlay onClose={() => setActiveModal(null)} onSubmit={handleEdit}
                header={
                    <div className="modal-header">
                        <div><h2>Edit Customer</h2><p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>Updating <strong style={{ color: '#0f172a' }}>{editCustomer.name}</strong></p></div>
                        <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><X size={15} /></button>
                    </div>
                }
                footer={<>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Update Customer'}</button>
                </>}>
                <CustomerFormFields data={editCustomer} onChange={setEditCustomer} />
            </ModalOverlay>
        )}

        {/* ── Delete Modal ── */}
        {activeModal === 'delete' && (
            <ModalOverlay onClose={() => setActiveModal(null)} maxWidth="400px"
                header={
                    <div className="modal-header" style={{ background: 'linear-gradient(135deg,#fff5f5,#fff)' }}>
                        <h2 style={{ color: '#dc2626' }}>Delete Customer</h2>
                        <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><X size={15} /></button>
                    </div>
                }
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Keep Customer</button>
                    <button className="btn s-danger-btn" onClick={handleDelete} disabled={saving}><Trash2 size={14} /> {saving ? 'Deleting…' : 'Yes, Delete'}</button>
                </>}>
                <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}><AlertTriangle size={26} /></div>
                    <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '8px' }}>Delete "{selectedCustomer?.name}"?</p>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6 }}>This action is permanent and cannot be undone.</p>
                </div>
            </ModalOverlay>
        )}

        {/* ── Payment Modal ── */}
        {activeModal === 'payment' && (
            <ModalOverlay onClose={() => setActiveModal(null)} onSubmit={handlePayment} maxWidth="440px"
                header={
                    <div className="modal-header">
                        <div><h2>Receive Payment</h2><p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>From: <strong style={{ color: '#0f172a' }}>{selectedCustomer?.name}</strong></p></div>
                        <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><X size={15} /></button>
                    </div>
                }
                footer={<>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary"><Save size={15} /> Confirm Receipt</button>
                </>}>
                <div className="s-field"><label>Received Amount (₹)</label><input type="number" required placeholder="0.00" autoFocus value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} /></div>
                <div className="s-field"><label>Description / Note</label><input type="text" placeholder="e.g. Received via PhonePe" value={payment.description} onChange={e => setPayment({ ...payment, description: e.target.value })} /></div>
                <div className="s-field"><label>Payment Date</label><input type="date" required value={payment.date} onChange={e => setPayment({ ...payment, date: e.target.value })} /></div>
            </ModalOverlay>
        )}
    </>
);

const Customers = () => {
    const [customers, setCustomers]           = useState([]);
    const [loading, setLoading]               = useState(true);
    const [selectedCustomer, setSelected]     = useState(null);
    const [ledger, setLedger]                 = useState([]);
    const [activeModal, setActiveModal]       = useState(null);
    const [searchTerm, setSearchTerm]         = useState('');
    const [saving, setSaving]                 = useState(false);
    const [viewingBill, setViewingBill]       = useState(null);
    const [newCustomer, setNewCustomer]       = useState(emptyCustomer);
    const [editCustomer, setEditCustomer]     = useState(emptyCustomer);
    const [payment, setPayment]               = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });

    useEffect(() => { loadCustomers(); }, []);

    const loadCustomers = async () => {
        try { setLoading(true); setCustomers(await fetchCustomers()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadLedger = async id => {
        try { setLedger(await fetchLedgerEntries(id)); }
        catch (e) { console.error(e); }
    };

    const selectCustomer = c => { setSelected(c); loadLedger(c._id); };

    // Auto-transliterate English fields to Gujarati for Add/Edit
    useEffect(() => {
        if (activeModal !== 'add') return;
        const translateName = async () => {
            if (newCustomer.name) {
                const trans = await transliterateText(newCustomer.name);
                setNewCustomer(prev => ({ ...prev, nameGujarati: trans }));
            }
        };
        const timeout = setTimeout(translateName, 800);
        return () => clearTimeout(timeout);
    }, [newCustomer.name, activeModal]);

    useEffect(() => {
        if (activeModal !== 'add') return;
        const translateAddress = async () => {
            if (newCustomer.address) {
                const trans = await transliterateText(newCustomer.address);
                setNewCustomer(prev => ({ ...prev, addressGujarati: trans }));
            }
        };
        const timeout = setTimeout(translateAddress, 800);
        return () => clearTimeout(timeout);
    }, [newCustomer.address, activeModal]);

    useEffect(() => {
        if (activeModal !== 'edit') return;
        const translateName = async () => {
            if (editCustomer.name) {
                const trans = await transliterateText(editCustomer.name);
                setEditCustomer(prev => ({ ...prev, nameGujarati: trans }));
            }
        };
        const timeout = setTimeout(translateName, 800);
        return () => clearTimeout(timeout);
    }, [editCustomer.name, activeModal]);

    useEffect(() => {
        if (activeModal !== 'edit') return;
        const translateAddress = async () => {
            if (editCustomer.address) {
                const trans = await transliterateText(editCustomer.address);
                setEditCustomer(prev => ({ ...prev, addressGujarati: trans }));
            }
        };
        const timeout = setTimeout(translateAddress, 800);
        return () => clearTimeout(timeout);
    }, [editCustomer.address, activeModal]);

    const handleAdd = async e => {
        e.preventDefault(); setSaving(true);
        try { await createCustomer(newCustomer); setActiveModal(null); setNewCustomer(emptyCustomer); loadCustomers(); }
        catch { alert('Failed to save'); } finally { setSaving(false); }
    };

    const handleEdit = async e => {
        e.preventDefault(); setSaving(true);
        try {
            const updated = await updateCustomer(editCustomer._id, editCustomer);
            setActiveModal(null);
            if (selectedCustomer?._id === editCustomer._id) setSelected(updated);
            loadCustomers();
        } catch { alert('Failed to update'); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setSaving(true);
        try { await deleteCustomer(selectedCustomer._id); setActiveModal(null); setSelected(null); setLedger([]); loadCustomers(); }
        catch { alert('Failed to delete'); } finally { setSaving(false); }
    };

    const handlePayment = async e => {
        e.preventDefault();
        try {
            await createLedgerEntry({ partyType: 'customer', partyId: selectedCustomer._id, partyName: selectedCustomer.name, type: 'credit', amount: Number(payment.amount), description: payment.description || 'Payment received from customer' });
            setActiveModal(null); setPayment({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
            selectCustomer(selectedCustomer); loadCustomers();
        } catch { alert('Failed to record payment'); }
    };

    const handleViewBill = async (billId) => {
        try {
            const bill = await fetchBillById(billId);
            setViewingBill(bill);
        } catch (error) {
            alert('Failed to load bill data.');
        }
    };

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="text-gradient">Customer Dues (Udhaar)</h1>
                    <p className="text-secondary">Track credit sales and payments from your regular customers</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setActiveModal('add')}>
                        <Plus size={18} /> Add New Customer
                    </button>
                </div>
            </header>

            <div className="charts-grid" style={{ gridTemplateColumns: selectedCustomer ? '1fr 1.5fr' : '1fr', transition: 'all 0.3s ease' }}>
                <CustomerList 
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
                    loading={loading} filtered={filtered} 
                    selectedCustomer={selectedCustomer} selectCustomer={selectCustomer} 
                    setEditCustomer={setEditCustomer} setActiveModal={setActiveModal} setSelected={setSelected} 
                />

                {selectedCustomer && (
                    <CustomerLedger
                        selectedCustomer={selectedCustomer}
                        ledger={ledger}
                        setEditCustomer={setEditCustomer}
                        setActiveModal={setActiveModal}
                        handleViewBill={handleViewBill}
                    />
                )}
            </div>

            <CustomerModals
                activeModal={activeModal} setActiveModal={setActiveModal}
                handleAdd={handleAdd} handleEdit={handleEdit} handleDelete={handleDelete} handlePayment={handlePayment}
                saving={saving}
                newCustomer={newCustomer} setNewCustomer={setNewCustomer}
                editCustomer={editCustomer} setEditCustomer={setEditCustomer}
                selectedCustomer={selectedCustomer}
                payment={payment} setPayment={setPayment}
            />

            {/* Bill View Modal */}
            {viewingBill && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.85)', zIndex: 1000,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', overflowY: 'auto'
                }}>
                    <div className="no-print" style={{width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '20px'}}>
                        <button className="btn btn-primary" onClick={() => window.print()}>Print</button>
                        <button className="btn btn-secondary" onClick={() => setViewingBill(null)}><X size={18} /> Close</button>
                    </div>
                    <div style={{borderRadius: '8px', width: '100%', maxWidth: '800px'}}>
                        <PrintableBill bill={viewingBill} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
