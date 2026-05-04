import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, PackageSearch, BookOpen, ShoppingCart, Globe, Wallet, LogOut, FileText, Zap, TrendingUp, Building, User, Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import PurchaseBills from './pages/PurchaseBills';
import History from './pages/History';
import ManualPos from './pages/ManualPos';
import Settings from './pages/Settings';
import Expenses from './pages/Expenses';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Login from './pages/Login';
import ViewBill from './pages/ViewBill';
import { fetchAnalyticsStats } from './utils/api';
import { useLanguage } from './utils/LanguageContext';
import { useAuth } from './utils/AuthContext';
import './index.css';

function App() {
  const { language, toggleLanguage, t } = useLanguage();
  const { user, logoutUser, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const isAdmin = user?.role === 'admin';
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    if (user && isAdmin) {
      const getLowStock = async () => {
        try {
          const stats = await fetchAnalyticsStats('7d');
          setLowStockCount(stats.lowStockProducts || 0);
        } catch (e) { console.error(e); }
      };
      getLowStock();
      // Refresh every 5 minutes
      const interval = setInterval(getLowStock, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, isAdmin]);

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes - No Auth Required */}
        <Route path="/view-bill/:id" element={<ViewBill />} />
        
        {/* Protected Routes - Need Login */}
        <Route path="/*" element={
          !user ? <Login /> : (
            <div className="app-container" style={{ 
              height: '100dvh', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Mobile Header */}
              <header className="mobile-header no-print">
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <Menu size={24} onClick={() => setSidebarOpen(true)} style={{cursor: 'pointer', color: 'var(--text-primary)'}} />
                  <div className="brand">
                    <h2 className="text-gradient" style={{fontSize: '20px', margin: 0}}>{t('appTitle')}</h2>
                  </div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <button 
                    className="btn-secondary" 
                    style={{padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem'}}
                    onClick={() => toggleLanguage(language === 'en' ? 'gu' : 'en')}
                  >
                    {language === 'en' ? 'ગુજ' : 'Eng'}
                  </button>
                  <LogOut size={20} onClick={logoutUser} style={{color: 'var(--danger)', cursor: 'pointer'}} />
                </div>
              </header>

              {/* Sidebar Backdrop for Mobile */}
              {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

              {/* Sidebar Navigation - Localized */}
              <aside className={`sidebar no-print ${sidebarOpen ? 'open' : ''}`}>
                {/* Mobile Close Button */}
                <div className="mobile-close-btn" onClick={() => setSidebarOpen(false)}>
                  <X size={24} />
                </div>
                <div className="brand" style={{marginBottom: '10px'}}>
                  <h1 className="text-gradient" style={{fontSize: '32px'}}>{t('appTitle')}</h1>
                  <p style={{color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '4px'}}>{t('appSubtitle')}</p>
                </div>
                
                <nav style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <NavLink to="/analytics" onClick={() => setSidebarOpen(false)} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                    <LayoutDashboard size={20} />
                    Dashboard
                  </NavLink>
                  <NavLink to="/auto" onClick={() => setSidebarOpen(false)} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                    <Zap size={20} />
                    Smart Bill
                  </NavLink>
                  <NavLink to="/manual" onClick={() => setSidebarOpen(false)} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                    <ShoppingCart size={20} />
                    Manual POS
                  </NavLink>
                  
                  {isAdmin && (
                    <>
                      <NavLink to="/ledger" onClick={() => setSidebarOpen(false)} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        <BookOpen size={20} />
                        Sales Ledger
                      </NavLink>
                      <NavLink to="/inventory" onClick={() => setSidebarOpen(false)} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        <PackageSearch size={20} />
                        Inventory
                        {lowStockCount > 0 && <span className="nav-badge danger animate-pulse">{lowStockCount}</span>}
                      </NavLink>
                      <NavLink to="/purchase" onClick={() => setSidebarOpen(false)} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        <FileText size={20} />
                        Purchase Bills
                      </NavLink>
                      <NavLink to="/customer-udhaar" onClick={() => setSidebarOpen(false)} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        <User size={20} />
                        Customer Udhaar
                      </NavLink>
                      <NavLink to="/expenses" onClick={() => setSidebarOpen(false)} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        <Wallet size={20} />
                        Expenses
                      </NavLink>
                      <NavLink to="/suppliers" onClick={() => setSidebarOpen(false)} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        <Building size={20} />
                        Suppliers
                      </NavLink>
                      <NavLink to="/settings" onClick={() => setSidebarOpen(false)} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        <Globe size={20} />
                        Settings
                      </NavLink>
                    </>
                  )}
                </nav>

                <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div style={{padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)'}}>
                    <h4 style={{marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)'}}>
                      <Globe size={16} /> {t('languageOptions')}
                    </h4>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`} style={{flex: 1, padding: '8px'}} onClick={() => toggleLanguage('en')}>Eng</button>
                      <button className={`btn ${language === 'gu' ? 'btn-primary' : 'btn-secondary'}`} style={{flex: 1, padding: '8px'}} onClick={() => toggleLanguage('gu')}>ગુજ</button>
                    </div>
                  </div>
                  <div style={{padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)'}}>
                    <h4 style={{marginBottom: '8px', color: 'var(--success)'}}>{t('sysStatus')}</h4>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', marginBottom: '12px'}}>
                      <div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)'}}></div>
                      {t('online')} - {user.username}
                    </div>
                    <button onClick={logoutUser} className="btn btn-danger" style={{width: '100%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}><LogOut size={16} /> Logout</button>
                  </div>
                </div>
              </aside>

              {/* Main Content Area */}
              <main className="main-content" style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: window.innerWidth < 768 ? '70px 16px 85px' : '40px',
                background: 'var(--bg-primary)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Routes>
                    <Route path="/" element={<Analytics />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/manual" element={<ManualPos />} />
                    <Route path="/auto" element={<Dashboard />} />
                    {isAdmin && <Route path="/ledger" element={<History />} />}
                    {isAdmin && <Route path="/inventory" element={<Inventory />} />}
                    {isAdmin && <Route path="/purchase" element={<PurchaseBills />} />}
                    {isAdmin && <Route path="/expenses" element={<Expenses />} />}
                    {isAdmin && <Route path="/suppliers" element={<Suppliers />} />}
                    {isAdmin && <Route path="/customer-udhaar" element={<Customers />} />}
                    {isAdmin && <Route path="/settings" element={<Settings />} />}
                    <Route path="*" element={<ManualPos />} />
                </Routes>
              </main>

              {/* Bottom Navigation for Mobile */}
              <nav className="bottom-nav no-print">
                <NavLink to="/manual" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}><ShoppingCart size={20} /><span>POS</span></NavLink>
                <NavLink to="/auto" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}><LayoutDashboard size={20} /><span>Dash</span></NavLink>
                {isAdmin && (
                  <>
                    <NavLink to="/ledger" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}><BookOpen size={20} /><span>Bills</span></NavLink>
                    <NavLink to="/inventory" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}><PackageSearch size={20} /><span>Items</span></NavLink>
                  </>
                )}
              </nav>
            </div>
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
