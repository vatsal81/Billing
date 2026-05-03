import React, { useState, useEffect } from 'react';
import { fetchProducts, createProduct, deleteProduct, updateProduct, transliterateText } from '../utils/api';
import { Trash2, Plus, RefreshCw, Search, Download, AlertTriangle, Check, Truck, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext';
import GujaratiInput from '../components/GujaratiInput';
import Modal from '../components/Modal';


export default function Inventory() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [nameEnglish, setNameEnglish] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(100);
  const [threshold, setThreshold] = useState(5);
  const [error, setError] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [unpricedItems, setUnpricedItems] = useState([]);
  
  // Restock Modal States
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [restockAmount, setRestockAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState(null);


  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data);
      setFilteredProducts(data);
      
      // Check for unpriced items
      const unpriced = data.filter(p => !p.price || p.price === 0);
      setUnpricedItems(unpriced);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleExportCSV = () => {
    if (products.length === 0) return;
    
    const headers = ['Name (Gujarati)', 'Name (English)', 'HSN Code', 'Selling Price', 'Stock Amount', 'Low Stock Threshold'];
    const rows = products.map(p => [
      `"${p.name}"`,
      `"${p.nameEnglish || ''}"`,
      `"${p.hsnCode || ''}"`,
      p.price || 0,
      p.stockAmount || 0,
      p.lowStockThreshold || 5
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const results = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.hsnCode && p.hsnCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredProducts(results);
  }, [searchTerm, products]);

  // Auto-transliterate English name to Gujarati name
  useEffect(() => {
    const translateName = async () => {
      if (nameEnglish) {
        const trans = await transliterateText(nameEnglish);
        setName(trans);
      }
    };
    const timeout = setTimeout(translateName, 800);
    return () => clearTimeout(timeout);
  }, [nameEnglish]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !price) return;
    try {
      setLoading(true);
      await createProduct({ 
        name, 
        nameEnglish,
        hsnCode,
        price: Number(price), 
        stockAmount: Number(stock), 
        lowStockThreshold: Number(threshold) 
      });
      setName('');
      setNameEnglish('');
      setHsnCode('');
      setPrice('');
      setStock(100);
      setThreshold(5);
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await deleteProduct(id);
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };
  
  const handleRestock = (product) => {
    setSelectedProduct(product);
    setIsRestockModalOpen(true);
    setRestockAmount('');
  };

  const handleUpdateStock = async () => {
    if (!restockAmount || restockAmount <= 0 || !selectedProduct || isProcessing) return;
    
    // Step 1: Force UI to processing state instantly
    setIsProcessing(true);
    setShowSuccess(false);
    
    try {
      // Step 2: Cinematic Delay for the Truck Journey (3.5s)
      // We do this first to ensure the user sees the "Story"
      const simulation = new Promise(resolve => setTimeout(resolve, 3500));
      
      // Step 3: Perform actual DB update in parallel or after
      const update = updateProduct(selectedProduct._id, {
        stockAmount: Number(selectedProduct.stockAmount) + Number(restockAmount) 
      });

      // Wait for both the cinematic story AND the database update to finish
      await Promise.all([simulation, update]);
      
      // Step 4: Transition to Success
      setIsProcessing(false);
      setShowSuccess(true);
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setIsProcessing(false);
      setShowSuccess(false);
    }
  };

  const closeRestockModal = () => {
    if (showSuccess) {
      setSuccessToast({
        name: selectedProduct.name,
        newStock: (Number(selectedProduct.stockAmount) || 0) + (Number(restockAmount) || 0)
      });
      setTimeout(() => setSuccessToast(null), 4000);
    }
    setIsRestockModalOpen(false);
    setRestockAmount('');
    setShowSuccess(false);
    setIsProcessing(false);
    setSelectedProduct(null);
  };

  const handleUpdatePrice = async (id) => {
    if (!newPrice || isNaN(newPrice)) return;
    try {
      setLoading(true);
      await updateProduct(id, { price: Number(newPrice) });
      setEditingPrice(null);
      setNewPrice('');
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h2>{t('invTitle')}</h2>
          <p style={{color: 'var(--text-secondary)'}}>{t('invSubtitle')}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExportCSV} disabled={products.length === 0}>
            <Download size={18} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={loadProducts}>
            <RefreshCw size={18} /> {t('refresh')}
          </button>
        </div>
      </header>


      {error && (
        <div style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px'}}>
          {error}
        </div>
      )}

      <div className="charts-grid" style={{ gridTemplateColumns: products.length > 0 ? '1fr 2fr' : '1fr' }}>
        
        {/* Add Product Form */}
        <div className="premium-card" style={{padding: '24px', height: 'fit-content', margin: '0 8px 24px'}}>
          <h3 style={{marginBottom: '20px'}}>{t('addNewItem')}</h3>
          <form onSubmit={handleCreate}>
            <div className="input-group">
              <label className="input-label">Item Name (English) <span style={{color: 'var(--danger)'}}>*</span></label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Kurti"
                value={nameEnglish}
                onChange={(e) => setNameEnglish(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Item Name (Gujarati) <span style={{color: 'var(--danger)'}}>*</span></label>
              <GujaratiInput 
                className="input-field" 
                placeholder="e.g. કુર્તી"
                value={name}
                onChange={(val) => setName(val)}
                onOriginal={(orig) => {
                  if (!nameEnglish) setNameEnglish(orig);
                }}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">HSN Code</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. 6211"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">{t('priceInRs')}</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="e.g. 500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0.01"
                step="0.01"
              />
            </div>
            <div style={{display: 'flex', gap: '16px'}}>
              <div className="input-group" style={{flex: 1}}>
                <label className="input-label">Init Stock</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
              </div>
              <div className="input-group" style={{flex: 1}}>
                <label className="input-label">Low Alert At</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '12px'}} disabled={loading}>
              <Plus size={18} /> {loading ? t('adding') : t('addProductBtn')}
            </button>
          </form>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div style={{ 
            margin: '0 8px 16px', 
            padding: '12px 16px', 
            background: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideDown 0.4s ease-out'
          }}>
            <div style={{ background: '#22c55e', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={14} strokeWidth={4} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: '#166534', fontWeight: '700', fontSize: '0.9rem' }}>Stock updated successfully!</p>
              <p style={{ margin: 0, color: '#15803d', fontSize: '0.8rem', opacity: 0.8 }}>{successToast.name} new stock is {successToast.newStock}</p>
            </div>
            <button onClick={() => setSuccessToast(null)} style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', padding: '4px' }}>
              <Plus size={18} style={{ transform: 'rotate(45deg)' }} />
            </button>
          </div>
        )}

        {/* Product List */}
        <div className="premium-card" style={{padding: '24px', margin: '0 8px'}}>
          <div className="page-header" style={{ marginBottom: '20px' }}>
            <h3 style={{margin: 0}}>{t('currentStock')} ({filteredProducts.length})</h3>
            <div className="header-actions" style={{ flex: 1, maxWidth: '300px' }}>
              <div className="input-group" style={{marginBottom: 0, width: '100%', position: 'relative'}}>
                <Search size={16} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)'}} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Search..." 
                  style={{paddingLeft: '40px'}}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {loading && products.length === 0 ? (
            <div className="animate-pulse" style={{color: 'var(--text-secondary)'}}>{t('loadingInv')}</div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {filteredProducts.length === 0 ? (
                <div style={{textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border-color)'}}>
                  <Search size={40} style={{marginBottom: '16px', opacity: 0.2}} />
                  <p style={{color: 'var(--text-secondary)'}}>
                    {searchTerm ? "No products match your search." : t('noProducts')}
                  </p>
                </div>
              ) : (
                filteredProducts.map(p => (
                  <div key={p._id} className="inventory-card animate-scale-in" style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                  }}>
                    {/* Background Glow */}
                    <div style={{
                      position: 'absolute',
                      top: '-50%',
                      right: '-10%',
                      width: '200px',
                      height: '200px',
                      background: (p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                      filter: 'blur(60px)',
                      borderRadius: '50%',
                      zIndex: 0
                    }}></div>

                    <div style={{flex: '1 1 250px', zIndex: 1}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px'}}>
                        <h4 style={{fontSize: '1.25rem', fontWeight: '700', margin: 0}}>{p.name}</h4>
                        {p.nameEnglish && <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px'}}>{p.nameEnglish}</span>}
                      </div>
                      
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
                         <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                            <span style={{opacity: 0.6}}>HSN:</span> <span style={{fontWeight: '600'}}>{p.hsnCode || 'N/A'}</span>
                         </div>
                         <div style={{width: '1px', height: '12px', background: 'var(--border-color)'}}></div>
                         {editingPrice === p._id ? (
                            <div style={{display: 'flex', gap: '6px'}}>
                              <input 
                                type="number" 
                                className="input-field" 
                                style={{width: '90px', padding: '4px 10px', height: '32px', margin: 0}}
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                autoFocus
                              />
                              <button className="btn btn-primary" style={{padding: '0 12px', height: '32px'}} onClick={() => handleUpdatePrice(p._id)}>Save</button>
                              <button className="btn btn-secondary" style={{padding: '0 12px', height: '32px'}} onClick={() => setEditingPrice(null)}>Esc</button>
                            </div>
                          ) : (
                            <div 
                              onClick={() => { setEditingPrice(p._id); setNewPrice(p.price); }}
                              style={{
                                color: 'var(--success)', 
                                fontWeight: '700', 
                                fontSize: '1.1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                transition: 'background 0.2s',
                              }}
                              className="price-tag"
                            >
                              ₹{(p.price || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                              <span style={{fontSize: '0.7rem', opacity: 0.6, fontWeight: 'normal'}}>Edit</span>
                            </div>
                          )}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex', 
                      flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                      alignItems: window.innerWidth < 640 ? 'stretch' : 'center', 
                      gap: '16px', 
                      zIndex: 1,
                      paddingTop: '16px',
                      marginTop: '4px',
                      borderTop: '1px solid #f1f5f9'
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 800, marginBottom: '4px'}}>Current Stock</p>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 14px',
                          borderRadius: '100px',
                          background: (p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? '#fef2f2' : '#f0fdf4',
                          color: (p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? '#dc2626' : '#166534',
                          border: `1px solid ${(p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? '#fecaca' : '#bbf7d0'}`,
                          fontWeight: '800',
                          fontSize: '1.1rem'
                        }}>
                          {p.stockAmount || 0}
                          {(p.stockAmount || 0) <= (p.lowStockThreshold || 5) && <AlertTriangle size={16} />}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{
                            flex: 1,
                            height: '44px', 
                            padding: '0 20px', 
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            background: '#f8fafc',
                            border: '1.2px solid #e2e8f0',
                            color: '#334155'
                          }}
                          onClick={() => handleRestock(p)}
                        >
                          {t('restock')}
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{
                            width: '44px', 
                            height: '44px', 
                            padding: 0, 
                            borderRadius: '12px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            background: '#fef2f2',
                            border: '1.2px solid #fecaca',
                            color: '#dc2626'
                          }}
                          onClick={() => handleDelete(p._id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Unpriced Items Alert */}
      {unpricedItems.length > 0 && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
            <div className="modal-content alert-modal" style={{ maxWidth: '500px', textAlign: 'center', padding: '40px', border: '2px solid #ef4444', animation: 'shake 0.5s ease-in-out', background: 'white' }}>
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ width: '80px', height: '80px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#ef4444' }}>
                        <Search size={40} />
                    </div>
                </div>
                <h2 style={{ color: '#1e3a8a', marginBottom: '10px' }}>Missing Selling Prices!</h2>
                <p style={{ color: '#64748b', marginBottom: '20px' }}>
                    There are <strong>{unpricedItems.length}</strong> products in your inventory with no selling price. Please set their prices before creating sales bills.
                </p>
                <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '20px', background: '#f8fafc', padding: '10px', borderRadius: '8px', textAlign: 'left' }}>
                    {unpricedItems.map((item, idx) => (
                        <div key={idx} style={{ padding: '8px', borderBottom: idx === unpricedItems.length - 1 ? 'none' : '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                            <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                            <span style={{ color: '#94a3b8', marginLeft: '10px' }}>({item.hsnCode})</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setUnpricedItems([])}>I will set them now</button>
                </div>
            </div>
        </div>
      )}

      {/* Premium Restock Modal */}
      <Modal 
        isOpen={isRestockModalOpen} 
        onClose={closeRestockModal}
        title={(!showSuccess && !isProcessing) ? "Restock Item" : ""}
        footer={(!showSuccess && !isProcessing) ? (
          <>
            <button className="btn btn-secondary" onClick={closeRestockModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpdateStock} style={{ background: '#0369a1', border: 'none' }} disabled={isProcessing}>
              {isProcessing ? "Updating..." : "Update Stock"}
            </button>
          </>
        ) : null}
      >
        {isProcessing ? (
          /* Elite Premium Delivery Unloading Screen */
          <div style={{ textAlign: 'center', padding: '40px 0', background: 'white' }}>
             <div className="premium-delivery-container">
                <div className="road-line"></div>
                <div className="truck-shadow"></div>
                <div className="elite-truck journey kicking">
                   <div className="exhaust-smoke journey-mode"></div>
                   <div className="exhaust-smoke journey-mode"></div>
                   <Truck size={48} color="#0369a1" strokeWidth={2.5} />
                </div>
                
                {/* Dynamic Packages - Delayed until Arrival */}
                <div className="elite-package journey-mode"><div className="box-trail"></div></div>
                <div className="elite-package journey-mode" style={{ animationDelay: '2s' }}><div className="box-trail"></div></div>
                <div className="elite-package journey-mode" style={{ animationDelay: '2.6s' }}><div className="box-trail"></div></div>
                
                <div className="shop-bag-container">
                   <ShoppingBag size={40} color="#94a3b8" />
                   {/* Celebratory Sparkles at the end */}
                   <div className="success-sparkle sparkle-1"></div>
                   <div className="success-sparkle sparkle-2"></div>
                   <div className="success-sparkle sparkle-3"></div>
                   <div className="success-sparkle sparkle-4"></div>
                </div>
             </div>
             
             <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
               Restocking Shop...
             </h2>
             <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '0' }}>
               Synchronizing with database
             </p>
             
             <div className="progress-bar-container">
                <div className="progress-bar-fill"></div>
             </div>
          </div>
        ) : !showSuccess ? (
          <div style={{ textAlign: 'center', padding: '0' }}>

            {/* Product Info */}
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ margin: '0 0 2px 0', color: '#0f172a', fontSize: '1.3rem', fontWeight: '800' }}>
                {selectedProduct?.name}
              </h3>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '4px 12px', borderRadius: '100px', fontWeight: '600' }}>
                 <span>Stock:</span>
                 <span style={{ color: '#0369a1', fontWeight: '800' }}>{selectedProduct?.stockAmount}</span>
              </div>
            </div>
            
            {/* Amount to Add Box */}
            <div style={{ marginBottom: '12px', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Amount to Add
              </label>
              <div style={{ padding: '10px 16px', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <input 
                  type="number" 
                  className="premium-input" 
                  style={{ 
                    fontSize: '1.8rem', 
                    textAlign: 'center', 
                    fontWeight: 800, 
                    padding: '0', 
                    border: 'none', 
                    outline: 'none', 
                    background: 'transparent', 
                    color: '#0f172a', 
                    width: '100%' 
                  }}
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            
            {/* New Total Stock Box */}
            <div style={{ padding: '12px', background: '#f0f7ff', borderRadius: '16px', border: '1.5px solid #e0f2fe' }}>
              <p style={{ margin: '0 0 2px 0', fontSize: '0.75rem', color: '#0369a1', fontWeight: 700 }}>
                New Total Stock
              </p>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#075985' }}>
                 {(Number(selectedProduct?.stockAmount) || 0) + (Number(restockAmount) || 0)}
              </h3>
            </div>
          </div>
        ) : (
          /* Success Screen - High-End Google Pay Animation */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
             <div className="success-checkmark-circle" style={{ 
               width: '80px', 
               height: '80px', 
               background: '#22c55e', 
               color: 'white', 
               borderRadius: '50%', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center', 
               margin: '0 auto 24px auto',
               position: 'relative',
               boxShadow: '0 10px 25px rgba(34, 197, 94, 0.3)'
             }}>
               <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="success-checkmark-check">
                  <polyline points="20 6 9 17 4 12"></polyline>
               </svg>
             </div>
             
             <div className="success-content-fade" style={{ animationDelay: '0.8s' }}>
               <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                 Stock Updated!
               </h2>
               <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px' }}>
                 Inventory synchronized
               </p>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
                     <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Added</p>
                     <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>+{restockAmount}</p>
                  </div>
                  <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '16px', border: '1px solid #e0f2fe' }}>
                     <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>New Stock</p>
                     <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0369a1' }}>
                       {(Number(selectedProduct?.stockAmount) || 0) + (Number(restockAmount) || 0)}
                     </p>
                  </div>
               </div>
               
               <button 
                 className="btn btn-primary" 
                 style={{ width: '100%', height: '54px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 800, background: '#0369a1', border: 'none' }}
                 onClick={closeRestockModal}
               >
                 Done
               </button>
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
