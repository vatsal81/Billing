import React, { useState, useEffect } from 'react';
import { fetchProducts, generateManualBill, searchCustomers, createCustomer, getFrontendUrl } from '../utils/api';
import { ShoppingCart, User, Phone, MapPin, X, Trash2, Printer, Search, MessageCircle, Plus, Save, Check } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext';
import PrintableBill from '../components/PrintableBill';
import '../index.css';

const ManualPos = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
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
  const [newCustomer, setNewCustomer] = useState({ name: '', address: '', phone: '' });
  const [animatingItems, setAnimatingItems] = useState({});
  const [isSharingProcess, setIsSharingProcess] = useState(false);
  const [sharingBillNo, setSharingBillNo] = useState('');

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
      const fullName = product.name;
      setCart([...cart, { product: product._id, name: fullName, price: product.price, hsnCode: product.hsnCode, quantity: 1 }]);
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
        customerAddress,
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

    const invNumber = bill.serialNumber 
      ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') 
      : bill._id.substring(bill._id.length - 4).toUpperCase();

    setSharingBillNo(invNumber);
    setIsSharingProcess(true);
    
    // Professional 2.5s delay for WhatsApp animation
    await new Promise(resolve => setTimeout(resolve, 2500));

    const viewLink = `${getFrontendUrl()}/view-bill/${bill._id}`;
    
    // Determine Customer Type
    let type = 'FIRST_TIME';
    const totalAmount = bill.actualTotal || 0;
    if (totalAmount >= 18000) type = 'VIP';
    // Note: In ManualPos, we might not have the full customer object with totalSpent easily accessible in the same way, 
    // but we can check if customerId was provided to assume they are at least known.
    else if (customerId) type = 'REGULAR';

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

    const text = `*SHREE HARI DRESSES & CUTPIECE*\n-----------------------------------------------------------\n\nDear *${customerName}*,\n\n${emotionalOpening}\n\n*PURCHASE DETAILS*\n-----------------------------------------------------------\nDate : ${new Date(bill.createdAt).toLocaleDateString('en-IN')}\nBill No : ${invNumber}\nAmount : Rs.${(totalAmount || 0).toLocaleString('en-IN')}\n-----------------------------------------------------------\n\nView Your Invoice:\n${viewLink}\n\n"${quote}"\n\n${closing}\n\nShree Hari Dresses & Cutpiece\nVisit Us Again - Your Next Favorite Look Is Waiting\n-----------------------------------------------------------`;

    const waUrl = `https://wa.me/91${customerPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    
    setIsSharingProcess(false);
    setSharingBillNo('');
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

  return (
    <div className="animate-fade-in no-print" style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%',
      padding: '8px' // Decreased from all sides
    }}>
      <header className="page-header no-print" style={{ marginBottom: '12px' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: 'min(6vw, 1.8rem)' }}>{t('manualTitle')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('manualSubtitle')}</p>
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <div className="pos-container" style={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: window.innerWidth > 1024 ? '1.2fr 1fr' : '1fr',
        gap: '12px', // Compact gap
        minHeight: 0
      }}>
        {/* Left Side: Product Selection */}
        <div className="glass-panel custom-scrollbar" style={{ 
          padding: '12px', // Compact padding
          overflowY: 'auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px'
        }}>
          <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>{t('stockList')}</h3>
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
                  <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                    {p.nameEnglish || p.name}
                  </h4>
                </div>
                
                <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', opacity: 0.3, margin: '2px 0' }}></div>
                
                {/* Bottom Action Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: '900', fontSize: '1.1rem', letterSpacing: '-0.5px' }}>Rs.{p.price}</span>
                  
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
        <div className="glass-panel" style={{ 
          padding: '12px', // Compact padding
          display: 'flex', 
          flexDirection: 'column',
          overflowY: 'auto',
          height: '100%',
          borderRadius: '12px'
        }}>
          <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>{t('yourBill')}</h3>

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
                            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{c.name}</span>
                            {(c.address || c.phone) && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.phone} {c.address}</span>}
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
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rs.{item.price} x {item.quantity}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="text" inputMode="numeric" className="input-field" style={{ width: '60px', padding: '6px' }} value={item.quantity} onChange={(e) => updateQuantity(item.product, parseInt(e.target.value) || 0)} />
                      <button onClick={() => removeFromCart(item.product)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '15px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.2rem' }}>{t('total')} (incl. GST)</h3>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>Rs.{(calculateTotal() || 0).toLocaleString('en-IN')}</h3>
                </div>
                <button 
                  className="btn btn-primary hover-lift" 
                  style={{ 
                    width: '100%', 
                    marginTop: '16px',
                    padding: '12px',
                    fontSize: '1rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: 'var(--accent-gradient)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 4px 12px rgba(3, 105, 161, 0.2)',
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
            maxWidth: '500px', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '8px', 
            marginBottom: '16px'
          }}>
            <button 
              className="btn" 
              style={{ 
                background: 'rgba(34, 197, 94, 0.1)', 
                color: '#22c55e', 
                border: '1px solid #22c55e', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 4px',
                fontSize: '0.8rem',
                fontWeight: '700'
              }} 
              onClick={() => handleWhatsApp(bill)}
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button 
              className="btn btn-primary" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 4px',
                fontSize: '0.8rem',
                fontWeight: '700'
              }} 
              onClick={() => window.print()}
            >
              <Printer size={14} /> Print
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 4px',
                fontSize: '0.8rem',
                fontWeight: '700'
              }} 
              onClick={clearForm}
            >
              <X size={14} /> Close
            </button>
          </div>
          <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}><PrintableBill bill={bill} /></div>
        </div>
      )}

      {/* Premium WhatsApp Share Loader */}
      {isSharingProcess && (
        <div className="modal-overlay" style={{ zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(15px)' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="whatsapp-anim-container">
                    <div className="wa-circle-pulse"></div>
                    <div className="wa-icon-wrapper">
                        <MessageCircle size={60} color="white" fill="#25D366" />
                    </div>
                    <div className="wa-particles">
                        <span></span><span></span><span></span>
                    </div>
                </div>
                <h2 className="loader-title" style={{ color: '#075E54', marginTop: '30px' }}>Sharing Bill #{sharingBillNo}...</h2>
                <p className="loader-subtitle" style={{ color: '#128C7E', fontWeight: '600' }}>
                    Encrypting bill details and connecting to WhatsApp Secure Gateway.
                </p>
                <div className="wa-progress-line">
                    <div className="wa-progress-fill"></div>
                </div>
            </div>
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
            maxWidth: '360px', // Ultra-compact professional width
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

      <style>{`
        /* WhatsApp Premium Animation */
        .whatsapp-anim-container {
            position: relative;
            width: 120px;
            height: 120px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .wa-circle-pulse {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 4px solid #25D366;
            border-radius: 50%;
            animation: waPulse 1.5s infinite ease-out;
        }
        @keyframes waPulse {
            0% { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(1.4); opacity: 0; }
        }
        .wa-icon-wrapper {
            position: relative;
            z-index: 2;
            animation: waFloat 2s infinite ease-in-out;
        }
        @keyframes waFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .wa-particles span {
            position: absolute;
            width: 6px;
            height: 6px;
            background: #25D366;
            border-radius: 50%;
            animation: waParticle 2s infinite linear;
        }
        @keyframes waParticle {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--tw-tx, 40px), var(--tw-ty, -40px)) scale(0); opacity: 0; }
        }
        .wa-particles span:nth-child(1) { --tw-tx: 50px; --tw-ty: -30px; animation-delay: 0.2s; }
        .wa-particles span:nth-child(2) { --tw-tx: -40px; --tw-ty: -50px; animation-delay: 0.6s; }
        .wa-particles span:nth-child(3) { --tw-tx: 30px; --tw-ty: 40px; animation-delay: 1s; }

        .wa-progress-line {
            width: 200px;
            height: 4px;
            background: #DCF8C6;
            border-radius: 10px;
            margin: 20px auto 0;
            overflow: hidden;
        }
        .wa-progress-fill {
            width: 0%;
            height: 100%;
            background: #25D366;
            animation: waFill 2.5s forwards linear;
        }
        @keyframes waFill {
            to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default ManualPos;
