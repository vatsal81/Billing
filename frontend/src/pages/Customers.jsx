import React, { useState, useEffect } from 'react';
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer, fetchLedgerEntries, createLedgerEntry, fetchBillById, transliterateText, getFrontendUrl } from '../utils/api';
import { User, Plus, Search, History, ArrowUpRight, ArrowDownLeft, X, Save, Wallet, Pencil, Trash2, AlertTriangle, Phone, MapPin, Eye, MessageCircle } from 'lucide-react';
import PrintableBill from '../components/PrintableBill';
import GujaratiInput from '../components/GujaratiInput';
import '../index.css';

const emptyCustomer = { name: '', nameGujarati: '', address: '', addressGujarati: '', phone: '' };

/* ── Animated Modal Overlay ── */
const ModalOverlay = ({ onClose, onSubmit, header, children, footer, maxWidth }) => (
    <div className="s-overlay" 
        style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
            padding: window.innerWidth < 768 ? '40px 16px' : '20px',
            overflowY: 'auto'
        }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <span className="s-float s-f1">₹</span>
        <span className="s-float s-f2">👤</span>
        <span className="s-float s-f3">💳</span>
        <span className="s-float s-f4">📄</span>
        <span className="s-float s-f5">💼</span>
        <span className="s-float s-f6">₹</span>

        <div className="s-modal" style={{ 
            ...(maxWidth ? { maxWidth } : {}),
            marginTop: window.innerWidth < 768 ? '0' : 'auto',
            marginBottom: window.innerWidth < 768 ? '40px' : 'auto',
            width: window.innerWidth < 768 ? '100%' : 'auto',
            padding: window.innerWidth < 768 ? '12px' : '20px'
        }}>
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
        <div className="s-section-label" style={{ marginBottom: '4px', fontSize: '0.65rem', marginTop: '4px' }}>Basic Info</div>
        <div className="s-form-grid" style={{ marginBottom: '8px', gap: '8px' }}>
            <div className="s-field">
                <label style={{ fontSize: '0.7rem', marginBottom: '2px', color: '#64748b' }}>Customer Name <span style={{color:'#ef4444'}}>*</span></label>
                <input type="text" required placeholder="e.g. Rahul Patel" style={{ height: '34px', fontSize: '0.85rem', padding: '0 10px' }}
                    value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} />
            </div>
            <div className="s-field">
                <label style={{ fontSize: '0.7rem', marginBottom: '2px', color: '#64748b' }}>Name (Gujarati)</label>
                <GujaratiInput placeholder="નામ..." className="input-field"
                    style={{ height: '34px', fontSize: '0.85rem' }}
                    value={data.nameGujarati} 
                    onChange={val => onChange({ ...data, nameGujarati: val })}
                    onOriginal={orig => {
                        if (!data.name) onChange({ ...data, name: orig });
                    }}
                />
            </div>
        </div>

        <div className="s-section-label" style={{ marginBottom: '4px', fontSize: '0.65rem', marginTop: '4px' }}>Contact Details</div>
        <div className="s-form-grid" style={{ marginBottom: '8px', gap: '8px' }}>
            <div className="s-field s-span2">
                <label style={{ fontSize: '0.7rem', marginBottom: '2px', color: '#64748b' }}>Phone / Mobile</label>
                <input type="text" placeholder="e.g. 9898088844" style={{ height: '34px', fontSize: '0.85rem', padding: '0 10px' }}
                    value={data.phone} onChange={e => onChange({ ...data, phone: e.target.value })} />
            </div>
            <div className="s-field s-span2">
                <label style={{ fontSize: '0.7rem', marginBottom: '2px', color: '#64748b' }}>Address</label>
                <textarea rows="1" placeholder="Full address..." style={{ padding: '6px 10px', fontSize: '0.85rem', minHeight: '34px' }}
                    value={data.address} onChange={e => onChange({ ...data, address: e.target.value })} />
            </div>
            <div className="s-field s-span2">
                <label style={{ fontSize: '0.7rem', marginBottom: '2px', color: '#64748b' }}>Address (Gujarati)</label>
                <GujaratiInput placeholder="સરનામું..." className="input-field"
                    style={{ height: '34px', fontSize: '0.85rem' }}
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

const CustomerList = ({ searchTerm, setSearchTerm, loading, filtered, selectedCustomer, selectCustomer, setEditCustomer, setActiveModal, setSelected, expandedId, setExpandedId, ledger }) => (
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
                <div key={c._id}>
                    <div onClick={() => {
                        if (window.innerWidth < 768) {
                            setExpandedId(expandedId === c._id ? null : c._id);
                            if (selectedCustomer?._id !== c._id) selectCustomer(c);
                        } else {
                            selectCustomer(c);
                        }
                    }}
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
                            <div className="desktop-only" style={{ display: 'flex', gap: '4px' }}>
                                <button className="s-icon-btn s-edit" title="Edit" onClick={e => { e.stopPropagation(); setEditCustomer({ ...c }); setActiveModal('edit'); }}><Pencil size={14} /></button>
                                <button className="s-icon-btn s-del" title="Delete" onClick={e => { e.stopPropagation(); setSelected(c); setActiveModal('delete'); }}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    </div>
                    {/* Mobile Accordion Content */}
                    <div className="mobile-only" style={{ 
                        maxHeight: expandedId === c._id ? '1500px' : '0',
                        overflow: 'hidden',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: '#f8fafc',
                        borderBottom: expandedId === c._id ? '1px solid var(--border-color)' : 'none'
                    }}>
                        <div style={{ padding: '12px' }}>
                            {/* Contact Shortcuts */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ flex: 1, padding: '8px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={12}/></div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{c.phone || 'No Phone'}</div>
                                </div>
                                <button 
                                    onClick={() => {
                                        const balance = c.balance || 0;
                                        const paymentLink = `${getFrontendUrl()}/pay/${c._id}/${balance}`;

                                        if (balance <= 0) {
                                            window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hello *${c.name}*,\n\nGreetings from *Shree Hari Dresses & Cutpiece*! \u2728\n\nYour account is all clear. We look forward to seeing you again! \ud83d\ude0a`)}`, '_blank');
                                            return;
                                        }
                                        
                                        const message = `*PAYMENT REMINDER* \ud83d\udcc4\n━━━━━━━━━━━━━━━━━━━━━━━\n\nDear *${c.name}*,\n\nGreetings from *Shree Hari Dresses & Cutpiece*! \u2728\n\nThis is a friendly reminder regarding your outstanding balance.\n\n\ud83d\udcb0 *Pending Amount: \u20b9${balance.toLocaleString('en-IN')}*\n\n\ud83d\udcf1 *View & Pay Online:*\n${paymentLink}\n\nKindly clear your dues at your earliest convenience.\n\nThank you for your continued trust! \ud83d\ude4f\n\n━━━━━━━━━━━━━━━━━━━━━━━\n*SHREE HARI DRESSES & CUTPIECE*`;
                                        window.open(`https://wa.me/91${c.phone}?text=${encodeURIComponent(message)}`, '_blank');
                                    }}
                                    disabled={!c.phone}
                                    style={{ padding: '8px 12px', background: '#25D366', color: 'white', borderRadius: '10px', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, opacity: c.phone ? 1 : 0.5 }}
                                >
                                    <MessageCircle size={14} /> WhatsApp
                                </button>
                            </div>

                            {/* Detailed Balance Summary */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ padding: '8px 10px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginBottom: '2px', textTransform: 'uppercase' }}>Purchased</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>₹{ledger.filter(e => e.type === 'debit').reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ padding: '8px 10px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginBottom: '2px', textTransform: 'uppercase' }}>Received</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>₹{ledger.filter(e => e.type === 'credit').reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            {/* Mini History */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Activity</h4>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Last 3</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {ledger.slice(0, 3).length === 0 ? (
                                        <div style={{ padding: '12px', textAlign: 'center', background: 'white', borderRadius: '10px', border: '1px dashed #cbd5e1', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No entries</div>
                                    ) : ledger.slice(0, 3).map(entry => (
                                        <div key={entry._id} style={{ padding: '8px 10px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: entry.type === 'debit' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: entry.type === 'debit' ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {entry.type === 'debit' ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{entry.description}</div>
                                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{new Date(entry.date).toLocaleDateString('en-IN')}</div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: entry.type === 'debit' ? '#ef4444' : '#10b981' }}>
                                                ₹{entry.amount.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                <button className="btn btn-secondary" style={{ height: '36px', fontSize: '0.78rem', padding: '0' }} onClick={() => { setEditCustomer({ ...c }); setActiveModal('edit'); }}>
                                    <Pencil size={12} /> Edit Profile
                                </button>
                                <button className="btn s-danger-btn" style={{ height: '36px', fontSize: '0.78rem', padding: '0' }} onClick={() => { setSelected(c); setActiveModal('delete'); }}>
                                    <Trash2 size={12} /> Delete
                                </button>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', height: '40px', fontSize: '0.85rem' }} onClick={() => { selectCustomer(c); setActiveModal('payment'); }}>
                                <Wallet size={16} /> Receive New Payment
                            </button>
                        </div>
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
                    <div className="modal-header" style={{ position: 'relative', padding: '10px 40px 8px 16px', minHeight: 'auto' }}>
                        <div>
                            <h2 style={{ fontSize: '1rem', marginBottom: '0', whiteSpace: 'nowrap' }}>Add New Customer</h2>
                            <p className="desktop-only" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Register a new regular customer</p>
                        </div>
                        <button type="button" className="close-btn" style={{ position: 'absolute', right: '10px', top: '10px' }} onClick={() => setActiveModal(null)}><X size={14} /></button>
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
                    <div className="modal-header" style={{ position: 'relative', padding: '10px 40px 8px 16px', minHeight: 'auto' }}>
                        <div>
                            <h2 style={{ fontSize: '1rem', marginBottom: '0', whiteSpace: 'nowrap' }}>Edit Customer</h2>
                            <p className="desktop-only" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Updating {editCustomer.name}</p>
                        </div>
                        <button type="button" className="close-btn" style={{ position: 'absolute', right: '10px', top: '10px' }} onClick={() => setActiveModal(null)}><X size={14} /></button>
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
    const [expandedId, setExpandedId]         = useState(null);
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
            <style>{`
                @media (max-width: 768px) {
                    .desktop-only { display: none !important; }
                    .mobile-only { display: block !important; }
                }
                @media (min-width: 769px) {
                    .desktop-only { display: block !important; }
                    .mobile-only { display: none !important; }
                }
            `}</style>
            <header className="page-header">
                <div>
                    <h1 className="text-gradient">Customer Dues (Udhaar)</h1>
                    <p className="text-secondary">Track credit sales and payments from your regular customers</p>
                </div>
                <div className="header-actions" style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    width: window.innerWidth < 768 ? '100%' : 'auto',
                    marginTop: window.innerWidth < 768 ? '16px' : '0'
                }}>
                    <button className="btn btn-primary" onClick={() => setActiveModal('add')} style={{ 
                        height: 'auto', 
                        minHeight: window.innerWidth < 768 ? '70px' : 'auto', 
                        padding: window.innerWidth < 768 ? '10px' : '8px 16px', 
                        fontSize: window.innerWidth < 768 ? '0.85rem' : '1rem', 
                        display: 'flex', 
                        flexDirection: window.innerWidth < 768 ? 'column' : 'row', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px', 
                        flex: 1 
                    }}>
                        <Plus size={window.innerWidth < 768 ? 20 : 18} /> <span>Add New Customer</span>
                    </button>
                </div>
            </header>

            <div className="charts-grid" style={{ 
                gridTemplateColumns: selectedCustomer && window.innerWidth >= 768 ? '1fr 1.5fr' : '1fr', 
                transition: 'all 0.3s ease' 
            }}>
                <CustomerList 
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
                    loading={loading} filtered={filtered} 
                    selectedCustomer={selectedCustomer} selectCustomer={selectCustomer} 
                    setEditCustomer={setEditCustomer} setActiveModal={setActiveModal} setSelected={setSelected} 
                    expandedId={expandedId} setExpandedId={setExpandedId}
                    ledger={ledger}
                />

                {selectedCustomer && (
                    <div className="desktop-only">
                        <CustomerLedger
                            selectedCustomer={selectedCustomer}
                            ledger={ledger}
                            setEditCustomer={setEditCustomer}
                            setActiveModal={setActiveModal}
                            handleViewBill={handleViewBill}
                        />
                    </div>
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
