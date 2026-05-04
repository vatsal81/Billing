import React, { useState, useEffect } from 'react';
import { fetchProducts, generateManualBill, searchCustomers, createCustomer, transliterateText, getFrontendUrl } from '../utils/api';
import { ShoppingCart, User, Phone, MapPin, X, Trash2, Printer, Search, MessageCircle, Plus, Save, Check } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext';
import GujaratiInput from '../components/GujaratiInput';
import PrintableBill from '../components/PrintableBill';
import '../index.css';

const ManualPos = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerNameGujarati, setCustomerNameGujarati] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerAddressGujarati, setCustomerAddressGujarati] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', nameGujarati: '', address: '', addressGujarati: '', phone: '' });
  const [animatingItems, setAnimatingItems] = useState({});

  const handleAddClick = (p, e) => {
    if (e) e.stopPropagation();
    addToCart(p);
    setAnimatingItems(prev => ({ ...prev, [p._id]: true }));
    setTimeout(() => {
      setAnimatingItems(prev => ({ ...prev, [p._id]: false }));
    }, 500); // Checkmark displays for 500ms
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product === product._id);
    if (existing) {
      setCart(cart.map(item =>
        item.product === product._id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      const fullName = product.nameEnglish ? `${product.name} (${product.nameEnglish})` : product.name;
      setCart([...cart, { product: product._id, name: fullName, price: product.price, quantity: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.product !== id));
  };

  const updateQuantity = (id, q) => {
    if (q < 1) return;
    setCart(cart.map(item => item.product === id ? { ...item, quantity: q } : item));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05; // 5% GST
    return Math.round(subtotal + tax);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    try {
      setLoading(true);
      
      // Artificial delay to show the premium processing animation
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const billData = {
        items: cart,
        customerId,
        customerName,
        customerNameGujarati,
        customerAddress,
        customerAddressGujarati,
        customerPhone,
        paymentMode
      };
      const res = await generateManualBill(billData);
      setBill(res);
      setLoading(false);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      setLoading(false);
    }
  };

  const handleWhatsApp = async (bill) => {
    if (!customerPhone) {
        alert("No phone number recorded for this customer.");
        return;
    }
    const viewLink = `${getFrontendUrl()}/view-bill/${bill._id}`;
    const text = `નમસ્તે ${customerName || 'ગ્રાહક મિત્ર'},\n\nશ્રી હરિ ડ્રેસીસ & કટપીસમાં પધારવા બદલ આભાર! 🛍️\n\nબિલ વિગતો:\n📅 તારીખ: ${new Date(bill.createdAt).toLocaleDateString('en-IN')}\n🧾 બિલ નં: ${bill.serialNumber ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') : bill._id.substring(bill._id.length - 4).toUpperCase()}\n💰 કુલ રકમ: ₹${bill.actualTotal.toLocaleString('en-IN')}\n\nતમારું બિલ જોવા અથવા ડાઉનલોડ કરવા માટે નીચેની લિંક પર ક્લિક કરો:\n${viewLink}\n\nફરી પધારજો! આપનો દિવસ શુભ રહે. 😊\n\n------------------\n\nHello ${customerName || 'Valued Customer'},\n\nThank you for shopping at Shree Hari! 🛍️\n\nYour Online Bill: ${viewLink}\n\nHave a great day!`;
    const waUrl = `https://wa.me/91${customerPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const clearForm = () => {
    setBill(null);
    setCart([]);
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
        } catch (e) { }
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
    <div className="animate-fade-in no-print">
      <header className="page-header no-print">
        <div>
          <h2 className="text-gradient" style={{ fontSize: 'min(7vw, 2.2rem)' }}>{t('manualTitle')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('manualSubtitle')}</p>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <div className="pos-container">
        {/* Left Side: Product Selection */}
        <div className="glass-panel" style={{ padding: 'min(4vw, 20px)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>{t('stockList')}</h3>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
            gap: '16px' 
          }}>
            {products.map((p, index) => (
              <div key={p._id}
                style={{
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-color)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'var(--transition)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                  position: 'relative',
                  animation: `fadeInUp 0.5s ease-out forwards`,
                  animationDelay: `${index * 0.05}s`,
                  opacity: 0,
                  transform: 'translateY(10px)'
                }} 
              >
                {/* Minimalist Top Layout */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                    {p.name}
                  </h4>
                  {p.nameEnglish && <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500'}}>{p.nameEnglish}</span>}
                </div>
                
                <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', opacity: 0.3, margin: '4px 0' }}></div>
                
                {/* Bottom Action Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: '900', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>₹{p.price}</span>
                  
                  <button 
                    type="button"
                    onClick={(e) => handleAddClick(p, e)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md)',
                      background: animatingItems[p._id] ? 'var(--success)' : 'var(--accent-gradient)',
                      color: 'white',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: animatingItems[p._id] ? '0 4px 12px rgba(5, 150, 105, 0.4)' : '0 4px 12px rgba(3, 105, 161, 0.2)',
                      transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      cursor: 'pointer',
                      transform: animatingItems[p._id] ? 'scale(1.15)' : 'scale(1)'
                    }} 
                    className="action-btn-hover"
                  >
                    {animatingItems[p._id] ? <Check size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Live Cart & Form */}
        <div className="glass-panel" style={{ padding: 'min(4vw, 24px)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>{t('yourBill')}</h3>

          <div className="pos-form-row">
            <div className="input-group" style={{ flex: 1, position: 'relative' }}>
              <label className="input-label"><User size={14} style={{ display: 'inline', marginBottom: '-2px' }} /> {t('customerName')}</label>
              
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
                <div className="form-grid" style={{ gap: '12px', display: 'grid' }}>
                  <div style={{ position: 'relative', width: '100%' }}>
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
                            style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{c.nameGujarati || c.name} {c.nameGujarati && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>({c.name})</span>}</span>
                            {(c.address || c.phone) && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.phone} {c.addressGujarati || c.address}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleNewCustomer}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                  >
                    <Plus size={18} /> New Customer
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pos-form-row">
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Payment Mode</label>
              <select className="input-field" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="online">Online / UPI</option>
                <option value="credit">Credit (Udhaar)</option>
              </select>
            </div>
          </div>

          <div style={{ flex: 1, borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px' }}>
            {cart.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>{t('cartEmpty')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cart.map(item => (
                  <div key={item.product} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem' }}>{item.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>₹{item.price} x {item.quantity}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="number" className="input-field" style={{ width: '60px', padding: '6px' }} value={item.quantity} onChange={(e) => updateQuantity(item.product, parseInt(e.target.value))} />
                      <button onClick={() => removeFromCart(item.product)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '15px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.2rem' }}>{t('total')} (incl. GST)</h3>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>₹{calculateTotal().toLocaleString('en-IN')}</h3>
                </div>
                <button 
                  className="btn btn-primary hover-lift" 
                  style={{ 
                    width: '100%', 
                    marginTop: '24px',
                    padding: '18px',
                    fontSize: '1.15rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    background: 'var(--accent-gradient)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 8px 20px rgba(3, 105, 161, 0.3)',
                    border: 'none',
                    letterSpacing: '0.5px'
                  }} 
                  onClick={handleCheckout} 
                  disabled={loading || cart.length === 0}
                >
                  {loading ? (
                    <>
                      <div style={{ width: '22px', height: '22px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      {t('calculating') || 'Processing...'}
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={22} strokeWidth={2.5} />
                      {t('checkoutBtn')}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
          <h2 className="loader-title">Generating Bill...</h2>
          <p className="loader-subtitle">
            Finalizing items and calculating taxes.<br/>Please wait a moment.
          </p>
        </div>
      )}

      {bill && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.92)', 
          zIndex: 2000, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          padding: 'min(5vw, 40px)', 
          overflowY: 'auto',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="no-print" style={{ 
            width: '100%', 
            maxWidth: '800px', 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '12px', 
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <button className="btn" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid #22c55e', flex: 1, minWidth: '120px' }} onClick={() => handleWhatsApp(bill)}>WhatsApp</button>
            <button className="btn btn-primary" style={{ flex: 1, minWidth: '120px' }} onClick={() => window.print()}>Print</button>
            <button className="btn btn-secondary" style={{ flex: 1, minWidth: '120px' }} onClick={clearForm}>Close</button>
          </div>
          <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}><PrintableBill bill={bill} /></div>
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
                <div className="form-grid" style={{ marginBottom: '20px' }}>
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

                  <div className="form-grid">
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
};

export default ManualPos;
