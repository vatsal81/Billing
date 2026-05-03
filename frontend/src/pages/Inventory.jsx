import React, { useState, useEffect } from 'react';
import { fetchProducts, createProduct, deleteProduct, updateProduct, transliterateText } from '../utils/api';
import { Trash2, Plus, RefreshCw, Search, Download } from 'lucide-react';
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
        <div className="glass-panel" style={{padding: '24px', height: 'fit-content'}}>
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
        <div className="glass-panel" style={{padding: '24px'}}>
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
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {filteredProducts.length === 0 ? (
                <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0'}}>
                  {searchTerm ? "No products match your search." : t('noProducts')}
                </p>
              ) : (
                filteredProducts.map(p => (
                  <div key={p._id} className="responsive-grid" style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    gap: '16px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    alignItems: 'center'
                  }}>
                    <div style={{flex: 1, minWidth: '150px'}}>
                      <h4 style={{fontSize: '1.1rem'}}>{p.name} {p.nameEnglish && <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>({p.nameEnglish})</span>}</h4>
                      <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>HSN: {p.hsnCode || 'N/A'}</p>
                      {editingPrice === p._id ? (
                        <div style={{display: 'flex', gap: '8px', marginTop: '4px'}}>
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{width: '80px', padding: '4px 8px'}}
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            autoFocus
                          />
                          <button className="btn btn-primary" style={{padding: '4px 8px'}} onClick={() => handleUpdatePrice(p._id)}>Set</button>
                          <button className="btn btn-secondary" style={{padding: '4px 8px'}} onClick={() => setEditingPrice(null)}>X</button>
                        </div>
                      ) : (
                        <p style={{color: 'var(--success)', fontWeight: '600', cursor: 'pointer'}} onClick={() => { setEditingPrice(p._id); setNewPrice(p.price); }}>
                          ₹{(p.price || 0).toFixed(2)} <span style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>(Click to edit)</span>
                        </p>
                      )}
                    </div>
                    <div style={{textAlign: 'right', minWidth: '80px'}}>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>In Stock</div>
                      <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: (p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? 'var(--danger)' : 'var(--text-primary)'}}>
                         {p.stockAmount || 0} {(p.stockAmount || 0) <= (p.lowStockThreshold || 5) && <span style={{fontSize: '0.7rem', color: 'var(--danger)'}}><br/>(Low)</span>}
                      </div>
                    </div>
                    <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                      <button 
                        className="btn btn-secondary s-sm" 
                        onClick={() => handleRestock(p)}
                        title="Restock"
                      >
                        Restock
                      </button>
                      <button 
                        className="btn btn-danger s-sm" 
                        onClick={() => handleDelete(p._id)}
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
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
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>{selectedProduct?.name}</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Current Stock: <span style={{ fontWeight: 800, color: '#3b82f6' }}>{selectedProduct?.stockAmount}</span></p>
          </div>
          
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', textAlign: 'left', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount to Add</label>
            <input 
              type="number" 
              className="premium-input" 
              style={{ fontSize: '1.5rem', textAlign: 'center', fontWeight: 800, padding: '15px' }}
              value={restockAmount}
              onChange={(e) => setRestockAmount(e.target.value)}
              autoFocus
            />
          </div>
          
          <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', border: '1px dashed rgba(59, 130, 246, 0.3)' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#3b82f6', fontWeight: 600 }}>
              New total stock: <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{(Number(selectedProduct?.stockAmount) || 0) + (Number(restockAmount) || 0)}</span>
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

