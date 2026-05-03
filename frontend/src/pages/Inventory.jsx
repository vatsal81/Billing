import React, { useState, useEffect } from 'react';
import { fetchProducts, createProduct, deleteProduct, updateProduct, transliterateText } from '../utils/api';
import { Trash2, Plus, RefreshCw, Search, Download, AlertTriangle } from 'lucide-react';
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
  const [restockAmount, setRestockAmount] = useState('50');


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
    setRestockAmount('50');
  };

  const handleConfirmRestock = async () => {
    if (!restockAmount || isNaN(restockAmount) || !selectedProduct) return;
    
    try {
      setLoading(true);
      await updateProduct(selectedProduct._id, { 
        stockAmount: Number(selectedProduct.stockAmount) + Number(restockAmount) 
      });
      setIsRestockModalOpen(false);
      setSelectedProduct(null);
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
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
                                hover: { background: 'rgba(16, 185, 129, 0.1)' }
                              }}
                              className="price-tag"
                            >
                              ₹{(p.price || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                              <span style={{fontSize: '0.7rem', opacity: 0.6, fontWeight: 'normal'}}>Edit</span>
                            </div>
                          )}
                      </div>
                    </div>

                    <div style={{display: 'flex', alignItems: 'center', gap: '24px', zIndex: 1}}>
                      <div style={{textAlign: 'right'}}>
                        <p style={{fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px'}}>Current Stock</p>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 16px',
                          borderRadius: '12px',
                          background: (p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: (p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? 'var(--danger)' : 'var(--success)',
                          border: `1px solid ${(p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                          fontWeight: '800',
                          fontSize: '1.2rem'
                        }}>
                          {p.stockAmount || 0}
                          {(p.stockAmount || 0) <= (p.lowStockThreshold || 5) && <AlertTriangle size={16} />}
                        </div>
                      </div>

                      <div style={{display: 'flex', gap: '8px'}}>
                        <button 
                          className="btn btn-secondary" 
                          style={{padding: '10px 16px', borderRadius: '12px'}}
                          onClick={() => handleRestock(p)}
                        >
                          Restock
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{width: '44px', height: '44px', padding: 0, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
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

      <style>{`
          @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-10px); }
              75% { transform: translateX(10px); }
          }
          .alert-modal {
              box-shadow: 0 25px 50px -12px rgba(239, 68, 68, 0.25);
          }
          .modal-header {
            padding: 24px 24px 12px;
            display: grid;
            grid-template-columns: 44px 1fr 44px;
            align-items: center;
            background: white;
            border-bottom: 1px solid #f1f5f9;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .modal-title {
            grid-column: 2;
            font-family: 'Outfit', sans-serif;
            font-size: 1.25rem;
            font-weight: 800;
            color: #1e293b;
            text-align: center;
            margin: 0;
          }
          .modal-close-btn {
            grid-column: 3;
            background: #f1f5f9;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s;
            margin-left: auto;
          }
          .modal-close-btn:hover {
            background: #e2e8f0;
            color: #0f172a;
            transform: rotate(90deg);
          }
          .modal-container {
            background: white;
            width: 100%;
            max-width: 360px;
            margin: 32px auto;
            border-radius: 24px;
            box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(0, 0, 0, 0.05);
            position: relative;
            animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .premium-input {
            width: 100%;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 12px 16px;
            font-size: 1rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: #f8fafc;
          }
          .premium-input:focus {
            border-color: #3b82f6;
            background: white;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
            outline: none;
          }
      `}</style>

      {/* Premium Restock Modal */}
      <Modal 
        isOpen={isRestockModalOpen} 
        onClose={() => setIsRestockModalOpen(false)}
        title="Restock Item"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsRestockModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleConfirmRestock}>Update Stock</button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '0' }}>
          {/* Product Header */}
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.4rem', fontWeight: '800', fontFamily: "'Outfit', sans-serif" }}>
              {selectedProduct?.name}
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '4px 12px', borderRadius: '100px', fontWeight: '600' }}>
               <span>Stock:</span>
               <span style={{ color: '#0369a1', fontWeight: '800' }}>{selectedProduct?.stockAmount}</span>
            </div>
          </div>
          
          {/* Amount to Add Box */}
          <div style={{ marginBottom: '16px', padding: '16px', background: '#ffffff', borderRadius: '20px', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <label style={{ display: 'block', textAlign: 'center', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Amount to Add
            </label>
            <input 
              type="number" 
              className="premium-input" 
              style={{ fontSize: '2rem', textAlign: 'center', fontWeight: 800, padding: '0', border: 'none', background: 'transparent', color: '#0f172a', width: '100%' }}
              value={restockAmount}
              onChange={(e) => setRestockAmount(e.target.value)}
              autoFocus
            />
          </div>
          
          {/* New Total Stock Box */}
          <div style={{ padding: '14px', background: '#f5f7ff', borderRadius: '20px', border: '1.5px solid #e0e7ff' }}>
            <p style={{ margin: '0 0 2px 0', fontSize: '0.85rem', color: '#4f46e5', fontWeight: 700 }}>
              New Total Stock
            </p>
            <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#3730a3' }}>
               {(Number(selectedProduct?.stockAmount) || 0) + (Number(restockAmount) || 0)}
            </h3>
          </div>
        </div>
      </Modal>
    </div>
  );
}
