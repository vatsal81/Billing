import React, { useState, useEffect, useRef } from 'react';
import { generateBill, searchCustomers } from '../utils/api';
import { Zap, Printer, CheckCircle2, History, RefreshCw, User, MapPin, Phone, MessageCircle, X } from 'lucide-react';

import { useLanguage } from '../utils/LanguageContext';
import PrintableBill from '../components/PrintableBill';
import GujaratiInput from '../components/GujaratiInput';
import { generatePDFBlob } from '../utils/pdfGenerator';


export default function Dashboard() {
  const { t } = useLanguage();
  const [targetAmount, setTargetAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerNameGujarati, setCustomerNameGujarati] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerAddressGujarati, setCustomerAddressGujarati] = useState('');


  const [customerPhone, setCustomerPhone] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bill, setBill] = useState(null);
  const handleWhatsApp = async () => {
    if (!customerPhone) {
      alert("Please enter a phone number first.");
      return;
    }
    
    setLoading(true);
    const backendBaseUrl = `http://${window.location.hostname}:5000`;
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
      const generatedBill = await generateBill({
        targetAmount,
        customerName,
        customerNameGujarati,
        customerAddress,
        customerPhone
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
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPhone('');
  };

  useEffect(() => {
    if (customerName.length > 1 && showSuggestions) {
      const fetchC = async () => {
         try {
           const data = await searchCustomers(customerName);
           setSuggestions(data);
         } catch(e){}
      };
      const timeout = setTimeout(fetchC, 300);
      return () => clearTimeout(timeout);
    } else {
      setSuggestions([]);
    }
  }, [customerName, showSuggestions]);

  const selectCustomer = (c) => {
    setCustomerName(c.name);
    setCustomerNameGujarati(c.nameGujarati || '');
    setCustomerAddress(c.address || '');
    setCustomerAddressGujarati(c.addressGujarati || '');
    if (c.phone) setCustomerPhone(c.phone);

    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleNewCustomer = () => {
    setCustomerAddress('');
    setCustomerAddressGujarati('');
    setCustomerPhone('');
    setSuggestions([]);
    setShowSuggestions(false);
  };





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
                <GujaratiInput 
                  className="input-field" 
                  placeholder={t('customerName')}
                  value={customerNameGujarati || customerName}
                  onChange={(val) => {
                    setCustomerNameGujarati(val);
                    setShowSuggestions(true);
                  }}
                  onOriginal={(orig) => {
                    setCustomerName(orig);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                />



                {/* Only show Existing Customer suggestions if we are NOT actively showing Gujarati transliteration */}
                {suggestions.length > 0 && showSuggestions && customerName.length > 2 && (
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
                    <li style={{padding: '5px 10px', fontSize: '0.7rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span>Suggestions:</span>
                      <button 
                        onClick={() => setShowSuggestions(false)}
                        style={{background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '2px'}}
                      >
                        <X size={12} />
                      </button>
                    </li>
                    <li 
                      onClick={handleNewCustomer}
                      style={{padding: '10px 12px', cursor: 'pointer', background: 'rgba(3, 105, 161, 0.05)', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold'}}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(3, 105, 161, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(3, 105, 161, 0.05)'}
                    >
                      <div style={{fontSize: '0.85rem'}}>+ {t('newCustomer') || 'New Customer'}</div>
                      <div style={{fontSize: '1rem', marginTop: '2px'}}>
                        {customerNameGujarati} <span style={{fontSize: '0.8rem', opacity: 0.7}}>({customerName})</span>
                      </div>
                    </li>





                    {suggestions.map(c => (
                      <li key={c._id} 
                          onClick={() => selectCustomer(c)}
                          style={{padding: '12px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column'}}>
                        <span style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{c.name}</span>
                        {(c.address || c.phone) && <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{c.phone} {c.address}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="pos-form-row">
              <div className="input-group" style={{flex: 1, marginBottom: 0}}>
                <label className="input-label"><Phone size={14} style={{display: 'inline', marginBottom: '-2px'}}/> Phone Number (Optional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div className="input-group" style={{flex: 1, marginBottom: 0}}>
                <label className="input-label"><MapPin size={14} style={{display: 'inline', marginBottom: '-2px'}}/> {t('custAddrAlt')}</label>
                <GujaratiInput 
                  className="input-field" 
                  placeholder={t('address')}
                  value={customerAddress}
                  onChange={(val) => setCustomerAddress(val)} 
                />
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
    </div>
  );
}
