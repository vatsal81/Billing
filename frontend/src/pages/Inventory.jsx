import React, { useState, useEffect } from 'react';
import { fetchProducts, createProduct, deleteProduct, updateProduct } from '../utils/api';
import { Trash2, Plus, RefreshCw, Search, Download, AlertTriangle, Check, Truck, ShoppingBag, Package, ShoppingCart, Pencil } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext';
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
  const [purchaseRate, setPurchaseRate] = useState('');
  const [stock, setStock] = useState(100);
  const [threshold, setThreshold] = useState(5);
  const [error, setError] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [unpricedItems, setUnpricedItems] = useState([]);
  const [showUnpricedAlert, setShowUnpricedAlert] = useState(false);
  
  // Restock Modal States
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [restockAmount, setRestockAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Edit States
  const [editName, setEditName] = useState('');
  const [editNameEnglish, setEditNameEnglish] = useState('');
  const [editHsn, setEditHsn] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPurchaseRate, setEditPurchaseRate] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editThreshold, setEditThreshold] = useState('');


  const loadProducts = async (isInitial = false) => {
    try {
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data);
      setFilteredProducts(data);
      
      // Check for unpriced items
      const unpriced = data.filter(p => !p.price || p.price === 0);
      setUnpricedItems(unpriced);
      if (isInitial && unpriced.length > 0) {
        setShowUnpricedAlert(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(true);
  }, []);

  const handleExportCSV = () => {
    if (products.length === 0) return;
    
    const headers = ['Name', 'HSN Code', 'Purchase Rate', 'Selling Price', 'Stock Amount', 'Low Stock Threshold'];
    const rows = products.map(p => [
      `"${p.nameEnglish || p.name}"`,
      `"${p.hsnCode || ''}"`,
      p.purchaseRate || 0,
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
      (p.nameEnglish && p.nameEnglish.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.hsnCode && p.hsnCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredProducts(results);
  }, [searchTerm, products]);



  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !price) return;
    try {
      setLoading(true);
      await createProduct({ 
        name: nameEnglish, 
        nameEnglish,
        hsnCode,
        price: Number(price), 
        purchaseRate: Number(purchaseRate),
        stockAmount: Number(stock), 
        lowStockThreshold: Number(threshold) 
      });
      setName('');
      setNameEnglish('');
      setHsnCode('');
      setPrice('');
      setPurchaseRate('');
      setStock(100);
      setThreshold(5);
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  const handleDeleteClick = (product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;
    try {
      setIsProcessingDelete(true);
      // Wait for the elite shredding animation to play for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 2500));
      await deleteProduct(selectedProduct._id);
      await loadProducts();
      setIsProcessingDelete(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        setIsDeleteModalOpen(false);
        setSelectedProduct(null);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setIsProcessingDelete(false);
    }
  };
  
  const handleRestock = (product) => {
    setSelectedProduct(product);
    setIsRestockModalOpen(true);
    setRestockAmount('');
  };

  const handleEditClick = (product) => {
    setSelectedProduct(product);
    setEditName(product.name);
    setEditNameEnglish(product.nameEnglish || '');
    setEditHsn(product.hsnCode || '');
    setEditPrice(product.price || '');
    setEditPurchaseRate(product.purchaseRate || '');
    setEditStock(product.stockAmount || '');
    setEditThreshold(product.lowStockThreshold || 5);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!selectedProduct || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await updateProduct(selectedProduct._id, {
        name: editNameEnglish,
        nameEnglish: editNameEnglish,
        hsnCode: editHsn,
        price: Number(editPrice),
        purchaseRate: Number(editPurchaseRate),
        stockAmount: Number(editStock),
        lowStockThreshold: Number(editThreshold)
      });
      
      await loadProducts();
      setIsEditModalOpen(false);
      setIsProcessing(false);
      
      setSuccessToast({
        name: editNameEnglish,
        newStock: Number(editStock)
      });
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setIsProcessing(false);
    }
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
        name: selectedProduct.nameEnglish || selectedProduct.name,
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

      <div style={{ display: 'grid', gridTemplateColumns: products.length > 0 ? 'minmax(350px, 1fr) 2.5fr' : '1fr', gap: '24px', alignItems: 'start', marginBottom: '32px' }}>
        
        {/* Add Product Form */}
        <div className="premium-card" style={{padding: '24px', height: 'fit-content', margin: '0'}}>
          <h3 style={{marginBottom: '20px'}}>{t('addNewItem')}</h3>
          <form onSubmit={handleCreate}>
            <div className="input-group">
              <label className="input-label">Item Name (English) <span style={{color: 'var(--danger)'}}>*</span></label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Kurti"
                value={nameEnglish ?? ''}
                onChange={(e) => setNameEnglish(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">HSN Code</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. 6211"
                value={hsnCode ?? ''}
                onChange={(e) => setHsnCode(e.target.value)}
              />
            </div>
            <div style={{display: 'flex', gap: '16px'}}>
              <div className="input-group" style={{flex: 1}}>
                <label className="input-label">Purchase Rate</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="e.g. 400"
                  value={purchaseRate ?? ''}
                  onChange={(e) => setPurchaseRate(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="input-group" style={{flex: 1}}>
                <label className="input-label">Selling Price <span style={{color: 'var(--danger)'}}>*</span></label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="e.g. 500"
                  value={price ?? ''}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>
            <div style={{display: 'flex', gap: '16px'}}>
              <div className="input-group" style={{flex: 1}}>
                <label className="input-label">Init Stock</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={stock ?? ''}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
              </div>
              <div className="input-group" style={{flex: 1}}>
                <label className="input-label">Low Alert At</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={threshold ?? ''}
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
                  value={searchTerm ?? ''}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {loading && products.length === 0 ? (
            <div className="animate-pulse" style={{color: 'var(--text-secondary)'}}>{t('loadingInv')}</div>
          ) : (
            <div className="custom-scrollbar" style={{ maxHeight: '650px', overflowY: 'auto', paddingRight: '8px', margin: '0 -8px' }}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px'}}>
              {filteredProducts.length === 0 ? (
                <div style={{textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border-color)'}}>
                  <Search size={40} style={{marginBottom: '16px', opacity: 0.2}} />
                  <p style={{color: 'var(--text-secondary)'}}>
                    {searchTerm ? "No products match your search." : t('noProducts')}
                  </p>
                </div>
              ) : (
                filteredProducts.map(p => (
                  <div key={p._id} className="glass-panel hover-lift receipt-card" style={{
                    padding: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '12px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderLeft: `5px solid ${(p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? 'var(--danger)' : 'var(--success)'}`
                  }}>
                    
                    {/* Left Details */}
                    <div className="receipt-left" style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto' }}>
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
                        background: (p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                        color: (p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? 'var(--danger)' : 'var(--success)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }} className="hide-on-mobile-small">
                        <Package size={22} strokeWidth={2.5} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {p.nameEnglish || p.name}
                        </h4>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          HSN: {p.hsnCode || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Actions */}
                    <div className="receipt-actions" style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleRestock(p)} className="action-btn-hover" style={{background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '700', fontSize: '0.9rem'}} title="Restock">
                        <ShoppingCart size={18} /> <span className="hide-on-mobile">Restock</span>
                      </button>
                      <button onClick={() => handleEditClick(p)} className="action-btn-hover" style={{background: 'rgba(3, 105, 161, 0.1)', color: 'var(--accent-primary)', padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '700', fontSize: '0.9rem'}} title="Edit">
                        <Pencil size={18} /> <span className="hide-on-mobile">Edit</span>
                      </button>
                      <button onClick={() => handleDeleteClick(p)} className="action-btn-hover" style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '700', fontSize: '0.9rem'}} title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Right: Amount & Stock */}
                    <div className="receipt-right" style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      {editingPrice === p._id ? (
                        <div style={{display: 'flex', gap: '6px', marginBottom: '2px'}}>
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{width: '70px', padding: '2px 6px', height: '26px', margin: 0, fontSize: '0.85rem'}}
                            value={newPrice ?? ''}
                            onChange={(e) => setNewPrice(e.target.value)}
                            autoFocus
                          />
                          <button className="btn btn-primary" style={{padding: '0 6px', height: '26px', fontSize: '0.75rem'}} onClick={() => handleUpdatePrice(p._id)}>Save</button>
                          <button className="btn btn-secondary" style={{padding: '0 6px', height: '26px', fontSize: '0.75rem'}} onClick={() => setEditingPrice(null)}>X</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <h3 
                            onClick={() => { setEditingPrice(p._id); setNewPrice(p.price); }}
                            style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.5px', color: 'var(--success)', cursor: 'pointer' }}
                            title="Click to edit selling price"
                          >
                            Rs.{(p.price || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                          </h3>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', opacity: 0.8 }}>
                            Pur: Rs.{(p.purchaseRate || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                          </span>
                        </div>
                      )}
                      
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px',
                        background: (p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: (p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? 'var(--danger)' : 'var(--success)',
                        fontWeight: '800', fontSize: '0.75rem'
                      }}>
                        {p.stockAmount || 0} In Stock
                        {(p.stockAmount || 0) <= (p.lowStockThreshold || 5) && <AlertTriangle size={12} />}
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unpriced Items Alert */}
      {showUnpricedAlert && unpricedItems.length > 0 && (
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
                            <span style={{ fontWeight: 'bold' }}>{item.nameEnglish || item.name}</span>
                            <span style={{ color: '#94a3b8', marginLeft: '10px' }}>({item.hsnCode})</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowUnpricedAlert(false)}>I will set them now</button>
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
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '14px 0', fontSize: '1rem', fontWeight: '700', borderRadius: '12px' }} onClick={closeRestockModal}>Cancel</button>
            <button className="btn btn-primary hover-lift" onClick={handleUpdateStock} style={{ flex: 1, padding: '14px 0', fontSize: '1rem', fontWeight: '800', borderRadius: '12px', background: 'var(--accent-gradient)', border: 'none', boxShadow: '0 6px 16px rgba(3, 105, 161, 0.25)' }} disabled={isProcessing}>
              {isProcessing ? "Updating..." : "Update Stock"}
            </button>
          </div>
        ) : null}
      >
        {isProcessing ? (
          /* Elite Premium Delivery Unloading Screen */
          <div style={{ textAlign: 'center', padding: '40px 10px', background: 'white' }}>
             <div className="premium-delivery-container">
                <div className="road-line"></div>
                <div className="truck-shadow"></div>
                <div className="elite-truck">
                   <div className="exhaust-smoke"></div>
                   <div className="exhaust-smoke" style={{ animationDelay: '0.3s' }}></div>
                   <Truck size={48} color="var(--accent-primary)" strokeWidth={2.5} />
                </div>
                
                {/* Dynamic Packages arcing from truck to bag */}
                <div className="elite-package" style={{ animationDelay: '0.8s', background: 'var(--accent-primary)' }}></div>
                <div className="elite-package" style={{ animationDelay: '1.2s', background: 'var(--success)' }}></div>
                <div className="elite-package" style={{ animationDelay: '1.6s', background: 'var(--danger)' }}></div>
                
                <div className="shop-bag-container">
                   <ShoppingBag size={40} strokeWidth={2} />
                </div>
             </div>
             
             <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
               Restocking Shop...
             </h2>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0', fontWeight: '500' }}>
               Synchronizing with database
             </p>
             
             <div className="progress-bar-container">
                <div className="progress-bar-fill"></div>
             </div>
          </div>
        ) : !showSuccess ? (
          <div style={{ textAlign: 'center', padding: '0' }}>

            {/* Product Info */}
            <div style={{ marginBottom: '20px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
               <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.4rem', fontWeight: '800' }}>
                {selectedProduct?.nameEnglish || selectedProduct?.name}
              </h3>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '6px 16px', borderRadius: '100px', fontWeight: '600', border: '1px solid var(--border-color)' }}>
                 <span>Current Stock:</span>
                 <span style={{ color: 'var(--accent-primary)', fontWeight: '800', fontSize: '1rem' }}>{selectedProduct?.stockAmount}</span>
              </div>
            </div>
            
            {/* Amount to Add Box */}
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '4px' }}>
                Amount to Add
              </label>
              <div style={{ padding: '8px 20px', background: 'var(--bg-card)', borderRadius: '16px', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }} onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'} onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                <span style={{ fontSize: '1.6rem', color: 'var(--accent-primary)', fontWeight: '800', marginRight: '12px' }}>+</span>
                <input 
                  type="number" 
                  style={{ 
                    fontSize: '2.2rem', 
                    textAlign: 'center', 
                    fontWeight: 800, 
                    padding: '8px 0', 
                    border: 'none', 
                    outline: 'none', 
                    background: 'transparent', 
                    color: 'var(--text-primary)', 
                    width: '100%',
                    letterSpacing: '1px'
                  }}
                  value={restockAmount ?? ''}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            
            {/* New Total Stock Box */}
            <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--success)', fontWeight: 700 }}>
                New Total Stock
              </p>
              <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: '900', color: 'var(--success)', letterSpacing: '-0.5px' }}>
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

      {/* Elite Delete Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => !isProcessingDelete && setIsDeleteModalOpen(false)}
        title={(!isProcessingDelete && !showSuccess) ? "Confirm Deletion" : ""}
        footer={(!isProcessingDelete && !showSuccess) ? (
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '14px 0', fontSize: '1rem', fontWeight: '700', borderRadius: '12px' }} onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary hover-lift" onClick={handleConfirmDelete} style={{ flex: 1, padding: '14px 0', fontSize: '1rem', fontWeight: '800', borderRadius: '12px', background: 'var(--danger)', border: 'none', boxShadow: '0 6px 16px rgba(239, 68, 68, 0.25)' }}>
              Delete Item
            </button>
          </div>
        ) : null}
      >
        {isProcessingDelete ? (
          /* Elite Shredding Animation */
          <div style={{ textAlign: 'center', padding: '40px 10px', background: 'white' }}>
             <div className="premium-delete-container">
                <div className="delete-package">
                   <Package size={28} strokeWidth={2.5} />
                </div>
                <div className="shredder-top">
                  <div className="shredder-slot"></div>
                </div>
                <div className="shredder-bottom">
                   <div className="shred-particles">
                      <div className="shred-piece"></div>
                      <div className="shred-piece"></div>
                      <div className="shred-piece"></div>
                      <div className="shred-piece"></div>
                   </div>
                </div>
             </div>
             
             <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--danger)', marginBottom: '8px' }}>
               Deleting Item...
             </h2>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0', fontWeight: '500' }}>
               Removing from database
             </p>
             
             <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ background: 'var(--danger)' }}></div>
             </div>
          </div>
        ) : showSuccess ? (
          /* Success Screen - Deletion Confirmed */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
             <div className="success-checkmark-circle" style={{ 
               width: '80px', 
               height: '80px', 
               background: 'var(--danger)', 
               color: 'white', 
               borderRadius: '50%', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center', 
               margin: '0 auto 24px auto',
               position: 'relative',
               boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)'
             }}>
               <Trash2 size={36} strokeWidth={2.5} className="success-checkmark-check" />
             </div>
             
             <div className="success-content-fade" style={{ animationDelay: '0.4s' }}>
               <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
                 Deleted!
               </h2>
               <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: '600' }}>
                 Stock deleted successfully
               </p>
             </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <Trash2 size={30} strokeWidth={2.5} />
            </div>
            
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: '800' }}>
              Are you absolutely sure?
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '24px' }}>
              You are about to permanently delete <strong style={{ color: 'var(--text-primary)' }}>{selectedProduct?.nameEnglish || selectedProduct?.name}</strong> from your inventory. This action cannot be undone.
            </p>
            
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px dashed rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
               <AlertTriangle size={24} color="var(--danger)" flexShrink={0} />
               <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: '600' }}>
                 All stock history and records for this item will be lost.
               </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isProcessing && setIsEditModalOpen(false)}
        title="Edit Product Details"
        footer={(
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpdateProduct} disabled={isProcessing}>
              {isProcessing ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      >
        <form onSubmit={handleUpdateProduct}>
          <div className="input-group">
            <label className="input-label">Item Name (English)</label>
            <input
              type="text"
              className="input-field"
              value={editNameEnglish ?? ''}
              onChange={(e) => setEditNameEnglish(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">HSN Code</label>
            <input
              type="text"
              className="input-field"
              value={editHsn ?? ''}
              onChange={(e) => setEditHsn(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Purchase Rate</label>
              <input
                type="number"
                className="input-field"
                value={editPurchaseRate ?? ''}
                onChange={(e) => setEditPurchaseRate(e.target.value)}
                step="0.01"
              />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Selling Price *</label>
              <input
                type="number"
                className="input-field"
                value={editPrice ?? ''}
                onChange={(e) => setEditPrice(e.target.value)}
                required
                step="0.01"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Current Stock</label>
              <input
                type="number"
                className="input-field"
                value={editStock ?? ''}
                onChange={(e) => setEditStock(e.target.value)}
                required
              />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Low Alert Threshold</label>
              <input
                type="number"
                className="input-field"
                value={editThreshold ?? ''}
                onChange={(e) => setEditThreshold(e.target.value)}
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Success Toast - Top Centered Alert Style */}
      {successToast && (
        <div style={{ 
          position: 'fixed',
          top: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          padding: '10px 24px', 
          background: '#f0fdf4', 
          border: '1px solid #10b981', 
          borderRadius: '100px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          animation: 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ background: '#10b981', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Check size={14} strokeWidth={4} />
          </div>
          <p style={{ margin: 0, color: '#064e3b', fontWeight: '800', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
            {successToast.name} Stock Updated!
          </p>
          <button onClick={() => setSuccessToast(null)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
