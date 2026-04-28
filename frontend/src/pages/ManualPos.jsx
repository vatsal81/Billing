import React, { useState, useEffect } from 'react';
import { fetchProducts, generateManualBill, searchCustomers } from '../utils/api';
import { ShoppingCart, Plus, Minus, Trash2, Printer, CheckCircle2, History as HistoryIcon, User, MapPin, Phone, MessageCircle, X } from 'lucide-react';

import { useLanguage } from '../utils/LanguageContext';
import PrintableBill from '../components/PrintableBill';
import GujaratiInput from '../components/GujaratiInput';
import { generatePDFBlob } from '../utils/pdfGenerator';


export default function ManualPos() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
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

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError(t('errLoading'));
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product === product._id);
    if (existing) {
      setCart(cart.map(item => item.product === product._id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product: product._id, name: product.name, price: product.price, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCgst = cartSubtotal * 0.025;
  const cartSgst = cartSubtotal * 0.025;
  const preRound = cartSubtotal + cartCgst + cartSgst;
  const cartTotal = Math.round(preRound);
  const cartRo = cartTotal - preRound;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      setLoading(true);
      const generatedBill = await generateManualBill({
        items: cart,
        customerName,
        customerNameGujarati,
        customerAddress,
        customerAddressGujarati,
        customerPhone
      });

      setBill(generatedBill);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const clearForm = () => {
    setBill(null);
    setCart([]);
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPhone('');
  };

  useEffect(() => {
    // We already have 'loadProducts' mapped in another useEffect, this one is for search
    if (customerName.length > 1 && showSuggestions) {
      const fetchC = async () => {
        try {
          const data = await searchCustomers(customerName);
          setSuggestions(data);
        } catch (e) { }
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



  if (bill) {
    return (
      <div className="animate-fade-in">
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
            <h3 style={{ color: 'var(--text-primary)' }}>{t('billGenerated')}</h3>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={clearForm}>
              <HistoryIcon size={18} /> {t('newBillBtn')}
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
    );
  }

  return (
    <div className="animate-fade-in no-print">
      <header style={{ marginBottom: '30px' }}>
        <h2 className="text-gradient" style={{ fontSize: '2rem' }}>{t('manualTitle')}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          {t('manualSubtitle')}
        </p>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <div className="pos-container">

        {/* Left Side: Product Selection */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>{t('stockList')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            {products.map(p => (
              <div key={p._id}
                onClick={() => addToCart(p)}
                style={{
                  padding: '16px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: '0.2s ease'
                }} className="product-card">
                <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>{p.name}</h4>
                <p style={{ color: 'var(--success)', fontWeight: 'bold' }}>₹{p.price}</p>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', marginTop: '12px', width: '100%' }}>{t('addBtn')}</button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Live Cart & Form */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px' }}>{t('yourBill')}</h3>

          <div className="pos-form-row">
            <div className="input-group" style={{ flex: 1, marginBottom: 0, position: 'relative' }}>
              <label className="input-label"><User size={14} style={{ display: 'inline', marginBottom: '-2px' }} /> {t('customerName')}</label>
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



              {suggestions.length > 0 && showSuggestions && (
                <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 100, listStyle: 'none', margin: '5px 0 0 0', padding: '5px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>

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
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{c.name}</span>
                      {(c.address || c.phone) && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.phone} {c.address}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="pos-form-row">
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="input-label"><Phone size={14} style={{ display: 'inline', marginBottom: '-2px' }} /> Phone</label>
                <input type="text" className="input-field" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="input-label"><MapPin size={14} style={{ display: 'inline', marginBottom: '-2px' }} /> {t('address')}</label>
                <GujaratiInput className="input-field" placeholder={t('address')} value={customerAddress} onChange={(val) => setCustomerAddress(val)} />

              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: '200px' }}>
              {cart.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                  {t('cartEmpty')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cart.map(item => (
                    <div key={item.product} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '1rem' }}>{item.name}</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>₹{item.price} each</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => updateQuantity(item.product, -1)}><Minus size={14} /></button>
                        <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => updateQuantity(item.product, 1)}><Plus size={14} /></button>
                        <span style={{ fontWeight: 'bold', marginLeft: '12px', minWidth: '60px', textAlign: 'right' }}>₹{item.price * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <span>{t('subtotal')}:</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <span>{t('cgst')}:</span>
                <span>₹{cartCgst.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <span>{t('sgst')}:</span>
                <span>₹{cartSgst.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                <span>{t('roundOff')}:</span>
                <span>₹{cartRo > 0 ? '+' : ''}{cartRo.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.4rem', color: 'var(--primary-text)', marginBottom: '24px' }}>
                <span>{t('total')}:</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px', fontSize: '1.2rem' }}
                onClick={handleCheckout}
                disabled={cart.length === 0 || loading}
              >
                <ShoppingCart size={20} /> {t('generateBillBtn')}
              </button>
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
        .product-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.1) !important; border-color: var(--accent-primary) !important; }
      `}} />
      </div>
    );
  }
