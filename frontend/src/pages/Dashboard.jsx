import React, { useState, useEffect, useRef } from 'react';
import { generateBill, searchCustomers, createCustomer, getFrontendUrl } from '../utils/api';
import { Zap, Printer, CheckCircle2, History, RefreshCw, User, MapPin, Phone, MessageCircle, X, Plus, Save } from 'lucide-react';

import { useLanguage } from '../utils/LanguageContext';
import PrintableBill from '../components/PrintableBill';
import { generatePDFBlob } from '../utils/pdfGenerator';


export default function Dashboard() {
  const { t } = useLanguage();
  const [targetAmount, setTargetAmount] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');


  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', address: '', phone: '' });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bill, setBill] = useState(null);
  const handleWhatsApp = async () => {
    if (!customerPhone) {
      alert("Please enter a phone number first.");
      return;
    }
    
    setLoading(true);
    // Always use the Render URL for the PDF link to ensure it works on mobile/whatsapp
    const viewLink = `${getFrontendUrl()}/view-bill/${bill._id}`;
    
    const billNo = bill.serialNumber ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') : bill._id.substring(bill._id.length - 4).toUpperCase();
    
    // Determine Customer Type
    let type = 'FIRST_TIME';
    if (bill.actualTotal >= 18000) type = 'VIP';
    // Dashboard smart billing usually happens with known customers
    else type = 'REGULAR';

    let emotionalOpening = 'It Is A Pleasure To Welcome You To Our Brand Family. We Are Honored To Have Been Part Of Your First Experience With Us.';
    let quote = 'Elegance Is The Only Beauty That Never Fades.';
    let closing = 'We Look Forward To Curating Your Next Masterpiece.';

    if (type === 'VIP') {
      emotionalOpening = 'Your Exceptional Taste And Loyalty Place You Among Our Most Valued Guests. It Is A Privilege To Serve Someone With Your Discerning Style.';
      quote = 'Luxury Must Be Comfortable, Otherwise It Is Not Luxury.';
      closing = 'We Are Dedicated To Providing You With The Absolute Best In Quality And Service.';
    } else if (type === 'REGULAR') {
      emotionalOpening = 'It Is A Joy To See You Again. We Deeply Value Your Continued Trust And The Relationship We Have Built Together.';
      quote = 'Fashion Fades, Only Style Remains The Same.';
      closing = 'May Your New Attire Bring You Endless Confidence And Joy.';
    }

    const text = `*SHREE HARI DRESSES & CUTPIECE*\n-----------------------------------------------------------\n\nDear *${customerName}*,\n\n${emotionalOpening}\n\n*PURCHASE DETAILS*\n-----------------------------------------------------------\nDate : ${new Date(bill.createdAt).toLocaleDateString('en-IN')}\nBill No : ${billNo}\nAmount : Rs.${(bill.actualTotal || 0).toLocaleString('en-IN')}\n-----------------------------------------------------------\n\nView Your Invoice:\n${viewLink}\n\n"${quote}"\n\n${closing}\n\nShree Hari Dresses & Cutpiece\nVisit Us Again - Your Next Favorite Look Is Waiting\n-----------------------------------------------------------`;

    
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
    setCustomerAddress(c.address || '');
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
      setNewCustomer({ name: '', address: '', phone: '' });
    } catch (err) {
      alert('Failed to save customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  // Transliteration disabled as per English-only requirement





  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <header className="page-header no-print" style={{ marginBottom: '16px' }}>
        <div>
          <h2 className="text-gradient" style={{fontSize: 'min(7vw, 1.8rem)'}}>{t('autoTitle')}</h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>
             {t('autoSubtitle')}
          </p>
        </div>
      </header>

      {error && (
        <div className="no-print" style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px'}}>
          {error}
        </div>
      )}

      {/* Input Section - Hidden during print */}
      {!bill && (
        <div className="glass-panel no-print animate-fade-in" style={{padding: 'min(6vw, 30px)', maxWidth: '600px', margin: '0 auto'}}>
          <h3 style={{marginBottom: '24px', textAlign: 'center', fontSize: '1.4rem'}}>{t('generateNewBill')}</h3>
          
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
                      <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)'}}>{customerName}</div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '12px'}}>
                        {customerPhone && <span><Phone size={12}/> {customerPhone}</span>}
                        {customerAddress && <span><MapPin size={12}/> {customerAddress}</span>}
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setCustomerId(null);
                        setCustomerName('');
                        setCustomerAddress('');
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
                  <div className="form-grid" style={{gap: '12px', display: 'grid'}}>
                    <div style={{position: 'relative', width: '100%'}}>
                      <input 
                        type="text"
                        className="input-field" 
                        placeholder={t('searchCustPlaceholder') || "Search customer..."}
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                      />
                      {suggestions.length > 0 && showSuggestions && searchTerm.length > 1 && (
                        <ul className="glass-panel" style={{
                          position: 'absolute', 
                          top: '100%', 
                          left: 0, 
                          right: 0, 
                          zIndex: 50, 
                          listStyle: 'none', 
                          margin: '8px 0 0 0', 
                          padding: '8px', 
                          maxHeight: '220px', 
                          overflowY: 'auto', 
                          boxShadow: 'var(--glass-shadow)',
                          background: 'white'
                        }}>
                          {suggestions.map(c => (
                            <li key={c._id} 
                                onClick={() => selectCustomer(c)}
                                className="hover-row"
                                style={{padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', marginBottom: '4px'}}>
                              <span style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{c.name}</span>
                              {(c.address || c.phone) && <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{c.phone} {c.address}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button 
                      type="button"
                      className="btn btn-secondary" 
                      onClick={handleNewCustomer}
                      style={{width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'}}
                    >
                      <Plus size={18}/> New Customer
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
                style={{
                  fontSize: 'min(10vw, 2.2rem)', 
                  textAlign: 'center', 
                  padding: '24px 16px', 
                  letterSpacing: '1px', 
                  width: '100%', 
                  borderColor: 'var(--success)', 
                  backgroundColor: 'rgba(16, 185, 129, 0.03)',
                  height: 'auto'
                }}
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
          
          <div className="page-header no-print">
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--success)'}}>
              <CheckCircle2 size={24} />
              <h3 style={{color: 'var(--text-primary)'}}>{t('billGenerated')}</h3>
            </div>
            <div className="header-actions">
              <button className="btn btn-secondary" onClick={clearForm}>
                <Plus size={18} /> {t('newBillBtn')}
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
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.6)', 
          zIndex: 9000, 
          padding: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
          paddingTop: window.innerWidth < 768 ? '60px' : '20px',
          overflowY: 'auto'
        }} onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-content" style={{ 
            maxWidth: '360px', // Ultra-compact width
            width: '92%', 
            background: 'var(--bg-primary)', 
            borderRadius: '10px', 
            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.15)',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border-color)'
          }}>
            <div className="modal-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: '800' }}>Quick Add</h2>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Store new customer details</p>
              </div>
              <button type="button" className="close-btn" onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
            </div>
            
            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="modal-body" style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                <div className="form-grid" style={{ marginBottom: '12px', gridTemplateColumns: '1fr' }}>
                  <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label className="input-label" style={{ fontSize: '0.7rem' }}>Customer Name *</label>
                    <input type="text" className="input-field" style={{ padding: '8px', fontSize: '0.9rem' }} required placeholder="Rahul Patel" value={newCustomer.name ?? ''} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '12px' }}>
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>Phone Number</label>
                  <input type="text" className="input-field" style={{ padding: '8px', fontSize: '0.9rem' }} placeholder="9898088844" value={newCustomer.phone ?? ''} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label className="input-label" style={{ fontSize: '0.7rem' }}>Address</label>
                    <textarea className="input-field" rows="1" style={{ padding: '8px', fontSize: '0.9rem' }} placeholder="Full address..." value={newCustomer.address ?? ''} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}></textarea>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingCustomer} style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Save size={12} /> {savingCustomer ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
