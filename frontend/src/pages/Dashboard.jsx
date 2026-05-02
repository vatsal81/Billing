import React, { useState, useEffect, useRef } from 'react';
import { generateBill, searchCustomers, createCustomer, transliterateText } from '../utils/api';
import { Zap, Printer, CheckCircle2, History, RefreshCw, User, MapPin, Phone, MessageCircle, X, Plus, Save } from 'lucide-react';

import { useLanguage } from '../utils/LanguageContext';
import PrintableBill from '../components/PrintableBill';
import GujaratiInput from '../components/GujaratiInput';
import { generatePDFBlob } from '../utils/pdfGenerator';


export default function Dashboard() {
  const { t } = useLanguage();
  const [targetAmount, setTargetAmount] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerNameGujarati, setCustomerNameGujarati] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerAddressGujarati, setCustomerAddressGujarati] = useState('');


  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', nameGujarati: '', address: '', addressGujarati: '', phone: '' });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bill, setBill] = useState(null);
  const handleWhatsApp = async () => {
    if (!customerPhone) {
      alert("Please enter a phone number first.");
      return;
    }
    
    setLoading(true);
    const backendBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 
      (window.location.hostname === 'localhost' ? 'http://localhost:5000' : `https://${window.location.hostname}`);
    const pdfLink = `${backendBaseUrl}/api/bills/${bill._id}/pdf`;
    
    const text = `નમસ્તે ${customerName || 'ગ્રાહક મિત્ર'},\n\nશ્રી હરિ ડ્રેસીસ & કટપીસમાં પધારવા બદલ આભાર! 🛍️\n\nબિલ વિગતો:\n📅 તારીખ: ${new Date(bill.createdAt).toLocaleDateString('en-IN')}\n🧾 બિલ નં: ${bill.serialNumber ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') : bill._id.substring(bill._id.length - 4).toUpperCase()}\n💰 કુલ રકમ: ₹${bill.actualTotal.toLocaleString('en-IN')}\n\nતમારું બિલ જોવા અથવા ડાઉનલોડ કરવા માટે નીચેની લિંક પર ક્લિક કરો:\n${pdfLink}\n\nફરી પધારજો! આપનો દિવસ શુભ રહે. 😊\n\n------------------\n\nHello ${customerName || 'Valued Customer'},\n\nThank you for shopping at Shree Hari! 🛍️\n\nYour PDF Bill: ${pdfLink}\n\nHave a great day!`;

    
    const waUrl = `https://wa.me/91${customerPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    setLoading(false);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!targetAmount || targetAmount <= 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Artificial delay to show the premium processing animation
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const generatedBill = await generateBill({
        targetAmount,
        customerId,
        customerName,
        customerNameGujarati,
        customerAddress,
        customerPhone,
        paymentMode
      });

      setBill(generatedBill);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setBill(null);
    setTargetAmount('');
    setCustomerId(null);
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPhone('');
    setPaymentMode('cash');
  };

  useEffect(() => {
    if (searchTerm.length > 1 && showSuggestions) {
      const fetchC = async () => {
         try {
           const data = await searchCustomers(searchTerm);
           setSuggestions(data);
         } catch(e){}
      };
      const timeout = setTimeout(fetchC, 300);
      return () => clearTimeout(timeout);
    } else {
      setSuggestions([]);
    }
  }, [searchTerm, showSuggestions]);

  const selectCustomer = (c) => {
    setCustomerId(c._id);
    setCustomerName(c.name);
    setCustomerNameGujarati(c.nameGujarati || '');
    setCustomerAddress(c.address || '');
    setCustomerAddressGujarati(c.addressGujarati || '');
    if (c.phone) setCustomerPhone(c.phone);

    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleNewCustomer = () => {
    setShowAddModal(true);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setSavingCustomer(true);
    try {
      const created = await createCustomer(newCustomer);
      selectCustomer(created);
      setShowAddModal(false);
      setNewCustomer({ name: '', nameGujarati: '', address: '', addressGujarati: '', phone: '' });
    } catch (err) {
      alert('Failed to save customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  // Auto-transliterate English fields to Gujarati fields
  useEffect(() => {
    if (!showAddModal) return;
    
    const translateName = async () => {
      if (newCustomer.name) {
        const trans = await transliterateText(newCustomer.name);
        setNewCustomer(prev => ({ ...prev, nameGujarati: trans }));
      }
    };
    
    const timeout = setTimeout(translateName, 800);
    return () => clearTimeout(timeout);
  }, [newCustomer.name, showAddModal]);

  useEffect(() => {
    if (!showAddModal) return;
    
    const translateAddress = async () => {
      if (newCustomer.address) {
        const trans = await transliterateText(newCustomer.address);
        setNewCustomer(prev => ({ ...prev, addressGujarati: trans }));
      }
    };
    
    const timeout = setTimeout(translateAddress, 800);
    return () => clearTimeout(timeout);
  }, [newCustomer.address, showAddModal]);





  return (
    <div className="animate-fade-in">
      <header className="no-print" style={{marginBottom: '30px'}}>
        <h2 className="text-gradient" style={{fontSize: '2rem'}}>{t('autoTitle')}</h2>
        <p style={{color: 'var(--text-secondary)'}}>
           {t('autoSubtitle')}
        </p>
      </header>

      {error && (
        <div className="no-print" style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px'}}>
          {error}
        </div>
      )}

      {/* Input Section - Hidden during print */}
      {!bill && (
        <div className="glass-panel no-print animate-fade-in" style={{padding: '30px', maxWidth: '600px', margin: '0 auto'}}>
          <h3 style={{marginBottom: '24px', textAlign: 'center'}}>{t('generateNewBill')}</h3>
          
          <form onSubmit={handleGenerate} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            
            <div className="pos-form-row">
              <div className="input-group" style={{flex: 1, marginBottom: 0, position: 'relative'}}>
                <label className="input-label"><User size={14} style={{display: 'inline', marginBottom: '-2px'}}/> {t('custNameAlt')}</label>
                
                {customerId ? (
                  <div style={{
                    padding: '12px 16px', 
                    background: 'rgba(99, 102, 241, 0.05)', 
                    border: '1px solid rgba(99, 102, 241, 0.2)', 
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)'}}>{customerNameGujarati || customerName} {customerNameGujarati && <span style={{fontSize:'0.85rem', color:'var(--text-secondary)'}}>({customerName})</span>}</div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '12px'}}>
                        {customerPhone && <span><Phone size={12}/> {customerPhone}</span>}
                        {(customerAddressGujarati || customerAddress) && <span><MapPin size={12}/> {customerAddressGujarati || customerAddress}</span>}
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setCustomerId(null);
                        setCustomerName('');
                        setCustomerNameGujarati('');
                        setCustomerAddress('');
                        setCustomerAddressGujarati('');
                        setCustomerPhone('');
                        setSearchTerm('');
                      }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)', 
                        color: 'var(--danger)', 
                        border: 'none', 
                        padding: '6px 12px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <X size={14}/> Change
                    </button>
                  </div>
                ) : (
                  <div style={{display: 'flex', gap: '12px'}}>
                    <div style={{position: 'relative', flex: 1}}>
                      <input 
                        type="text"
                        className="input-field" 
                        placeholder="Search customer by name or phone..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                      />
                      {suggestions.length > 0 && showSuggestions && searchTerm.length > 1 && (
                        <ul style={{
                          position: 'absolute', 
                          top: '100%', 
                          left: 0, 
                          right: 0, 
                          background: 'var(--bg-primary)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '8px', 
                          zIndex: 50, 
                          listStyle: 'none', 
                          margin: '5px 0 0 0', 
                          padding: '5px', 
                          maxHeight: '180px', 
                          overflowY: 'auto', 
                          boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                        }}>
                          {suggestions.map(c => (
                            <li key={c._id} 
                                onClick={() => selectCustomer(c)}
                                style={{padding: '12px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column'}}>
                              <span style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{c.nameGujarati || c.name} {c.nameGujarati && <span style={{fontSize:'0.8rem', opacity:0.7}}>({c.name})</span>}</span>
                              {(c.address || c.phone) && <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{c.phone} {c.addressGujarati || c.address}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button 
                      type="button"
                      className="btn btn-secondary" 
                      onClick={handleNewCustomer}
                      style={{whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px'}}
                    >
                      <Plus size={16}/> New Customer
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pos-form-row">
              <div className="input-group" style={{flex: 1, marginBottom: 0}}>
                <label className="input-label">Payment Mode</label>
                <select 
                  className="input-field" 
                  value={paymentMode} 
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online / UPI</option>
                  <option value="credit">Credit (Udhaar)</option>
                </select>
              </div>
            </div>

            <div>
              <input 
                type="number" 
                className="input-field" 
                style={{fontSize: '2rem', textAlign: 'center', padding: '20px', letterSpacing: '2px', width: '100%', borderColor: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.05)'}}
                placeholder={t('finalTotalInput')}
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
                min="1"
                step="0.01"
              />
              <p style={{color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.9rem', textAlign: 'center'}}>
                {t('finalTotalHint')}
              </p>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{padding: '16px', fontSize: '1.1rem', marginTop: '10px'}}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-pulse" size={20} /> {t('calculating')}
                </>
              ) : (
                <>
                  <Zap size={20} /> {t('generateSmartBillBtn')}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Premium Full-Screen Loading Overlay */}
      {loading && !bill && (
        <div className="premium-loader-overlay">
          <div className="receipt-scanner">
            <div className="receipt-lines">
              <div className="receipt-line" style={{ width: '60%' }}></div>
              <div className="receipt-line" style={{ width: '100%' }}></div>
              <div className="receipt-line" style={{ width: '80%' }}></div>
              <div className="receipt-line" style={{ width: '100%', marginTop: '8px' }}></div>
              <div className="receipt-line" style={{ width: '40%' }}></div>
            </div>
          </div>
          <h2 className="loader-title">Generating Smart Bill...</h2>
          <p className="loader-subtitle">
            Processing optimal product combinations and calculating taxes.<br/>Please wait a moment.
          </p>
        </div>
      )}
      
      {/* Bill Preview Section */}
      {bill && (
        <div className="animate-fade-in">
          
          <div className="no-print pos-form-row" style={{justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--success)'}}>
              <CheckCircle2 size={24} />
              <h3 style={{color: 'var(--text-primary)'}}>{t('billGenerated')}</h3>
            </div>
            <div className="pos-form-row" style={{gap: '12px', marginBottom: 0}}>
              <button className="btn btn-secondary" onClick={clearForm}>
                <History size={18} /> {t('newBillBtn')}
              </button>
              <button className="btn" style={{background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid #22c55e', display: 'flex', alignItems: 'center', gap: '8px'}} onClick={handleWhatsApp} disabled={loading}>
                <MessageCircle size={18} /> {loading ? 'Sharing...' : 'WhatsApp'}
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={18} /> {t('printBtn')}
              </button>
            </div>
          </div>

          <PrintableBill bill={bill} />

        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%', background: 'var(--bg-primary)', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Add New Customer</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Enter details to securely store customer</p>
              </div>
              <button type="button" className="close-btn" onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveCustomer}>
              <div className="modal-body" style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Customer Name (English) <span style={{color: 'var(--danger)'}}>*</span></label>
                    <input type="text" className="input-field" required placeholder="e.g. Rahul Patel" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Customer Name (Gujarati)</label>
                    <GujaratiInput className="input-field" placeholder="e.g. રાહુલ પટેલ" value={newCustomer.nameGujarati} onChange={val => setNewCustomer({ ...newCustomer, nameGujarati: val })} onOriginal={orig => { if (!newCustomer.name) setNewCustomer({ ...newCustomer, name: orig }); }} />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Phone Number</label>
                  <input type="text" className="input-field" placeholder="e.g. 9898088844" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Address (English)</label>
                    <textarea className="input-field" rows="2" placeholder="Full address..." value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}></textarea>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Address (Gujarati)</label>
                    <GujaratiInput className="input-field" placeholder="સરનામું..." value={newCustomer.addressGujarati} onChange={val => setNewCustomer({ ...newCustomer, addressGujarati: val })} onOriginal={orig => { if (!newCustomer.address) setNewCustomer({ ...newCustomer, address: orig }); }} />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingCustomer} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={16} /> {savingCustomer ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
