import React, { useState, useEffect } from 'react';
import { fetchProducts, createProduct, deleteProduct, updateProduct } from '../utils/api';
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext';
import GujaratiInput from '../components/GujaratiInput';

export default function Inventory() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(100);
  const [threshold, setThreshold] = useState(5);
  const [error, setError] = useState(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !price) return;
    try {
      setLoading(true);
      await createProduct({ name, price: Number(price), stockAmount: Number(stock), lowStockThreshold: Number(threshold) });
      setName('');
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
  
  const handleRestock = async (id, currentStock) => {
    const amount = prompt("Enter amount to add to stock:", "50");
    if (!amount || isNaN(amount)) return;
    
    try {
      setLoading(true);
      await updateProduct(id, { stockAmount: Number(currentStock) + Number(amount) });
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h2>{t('invTitle')}</h2>
          <p style={{color: 'var(--text-secondary)'}}>{t('invSubtitle')}</p>
        </div>
        <button className="btn btn-secondary" onClick={loadProducts}>
          <RefreshCw size={18} /> {t('refresh')}
        </button>
      </header>

      {error && (
        <div style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px'}}>
          {error}
        </div>
      )}

      <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px'}}>
        
        {/* Add Product Form */}
        <div className="glass-panel" style={{padding: '24px', height: 'fit-content'}}>
          <h3 style={{marginBottom: '20px'}}>{t('addNewItem')}</h3>
          <form onSubmit={handleCreate}>
            <div className="input-group">
              <label className="input-label">{t('itemName')}</label>
              <GujaratiInput 
                className="input-field" 
                placeholder="e.g. કુર્તી"
                value={name}
                onChange={(val) => setName(val)}
                required
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
          <h3 style={{marginBottom: '20px'}}>{t('currentStock')} ({products.length})</h3>
          
          {loading && products.length === 0 ? (
            <div className="animate-pulse" style={{color: 'var(--text-secondary)'}}>{t('loadingInv')}</div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {products.length === 0 ? (
                <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0'}}>
                  {t('noProducts')}
                </p>
              ) : (
                products.map(p => (
                  <div key={p._id} style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{flex: 1}}>
                      <h4 style={{fontSize: '1.1rem'}}>{p.name}</h4>
                      <p style={{color: 'var(--success)', fontWeight: '600'}}>₹{p.price.toFixed(2)}</p>
                    </div>
                    <div style={{textAlign: 'right', paddingRight: '20px'}}>
                      <div style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>In Stock</div>
                      <div style={{fontWeight: 'bold', fontSize: '1.2rem', color: (p.stockAmount || 0) <= (p.lowStockThreshold || 5) ? 'var(--danger)' : 'var(--text-primary)'}}>
                         {p.stockAmount || 0} {(p.stockAmount || 0) <= (p.lowStockThreshold || 5) && <span style={{fontSize: '0.8rem', color: 'var(--danger)'}}><br/>(Low)</span>}
                      </div>
                    </div>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button 
                        className="btn btn-secondary" 
                        style={{padding: '8px', borderRadius: '8px', fontSize: '0.8rem'}}
                        onClick={() => handleRestock(p._id, p.stockAmount || 0)}
                        title="Restock"
                      >
                        Restock
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{padding: '8px', borderRadius: '8px'}}
                        onClick={() => handleDelete(p._id)}
                        title="Delete Product"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
