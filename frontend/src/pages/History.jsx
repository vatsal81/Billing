import React, { useState, useEffect } from 'react';
import { fetchBills, voidBill, deleteBill, fetchExpenses, getFrontendUrl, getBackendUrl } from '../utils/api';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, FileText, Banknote, RefreshCw, Eye, X, Printer, Search, Download, Ban, MessageCircle, Share2, Trash2, CheckCircle2 } from 'lucide-react';

import { useLanguage } from '../utils/LanguageContext';
import PrintableBill from '../components/PrintableBill';
import { generatePDFBlob } from '../utils/pdfGenerator';

export default function History() {
  const { t } = useLanguage();
  const [bills, setBills] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatingPdfBill, setGeneratingPdfBill] = useState(null);
  const [billToDelete, setBillToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingProcess, setIsDeletingProcess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [isViewingProcess, setIsViewingProcess] = useState(false);
  const [viewingBillNo, setViewingBillNo] = useState('');
  const [isSharingProcess, setIsSharingProcess] = useState(false);
  const [sharingBillNo, setSharingBillNo] = useState('');

  const handleVoid = async (id) => {
    if(!window.confirm("Are you sure you want to void this bill? It will be removed from your revenue total but keep its serial sequence.")) return;
    try {
      await voidBill(id);
      loadData();
    } catch(e) {
      setError(e.response?.data?.message || e.message);
    }
  };


  const handleDelete = (bill) => {
    setBillToDelete(bill);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!billToDelete) return;
    
    const invNumber = billToDelete.serialNumber 
      ? String(((billToDelete.serialNumber - 1) % 100) + 1).padStart(3, '0') 
      : billToDelete._id.substring(billToDelete._id.length - 4).toUpperCase();

    setShowDeleteConfirm(false);
    setIsDeletingProcess(true);
    
    try {
      // Professional 2.5s delay for shredder animation
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      await deleteBill(billToDelete._id);
      
      setIsDeletingProcess(false);
      setDeleteSuccess(true);
      
      // Show success for 1.5s
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setDeleteSuccess(false);
      setBillToDelete(null);
      loadData();
    } catch(e) {
      setIsDeletingProcess(false);
      setBillToDelete(null);
      setError(e.response?.data?.message || e.message);
    }
  };

  const handleViewBill = async (bill) => {
    const invNumber = bill.serialNumber 
      ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') 
      : bill._id.substring(bill._id.length - 4).toUpperCase();
    
    setViewingBillNo(invNumber);
    setIsViewingProcess(true);
    
    // Professional 2.5s delay for magnifier animation
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setIsViewingProcess(false);
    setSelectedBill(bill);
    setViewingBillNo('');
  };


  const handleWhatsApp = async (b) => {
    if (!b.customerPhone) {
        alert("No phone number recorded for this customer.");
        return;
    }

    const invNumber = b.serialNumber 
      ? String(((b.serialNumber - 1) % 100) + 1).padStart(3, '0') 
      : b._id.substring(b._id.length - 4).toUpperCase();

    setSharingBillNo(invNumber);
    setIsSharingProcess(true);
    
    // Professional 2.5s delay for WhatsApp animation
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Always use the Render URL for the PDF link to ensure it works on mobile/whatsapp
    const viewLink = `${getFrontendUrl()}/view-bill/${b._id}`;
    
    // Determine Customer Type
    let type = 'FIRST_TIME';
    if (b.actualTotal >= 18000) type = 'VIP';
    else if (b.customerId && b.customerId.totalSpent > b.actualTotal) type = 'REGULAR';

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

    const text = `*SHREE HARI DRESSES & CUTPIECE*\n-----------------------------------------------------------\n\nDear *${b.customerName}*,\n\n${emotionalOpening}\n\n*PURCHASE DETAILS*\n-----------------------------------------------------------\nDate : ${new Date(b.createdAt).toLocaleDateString('en-IN')}\nBill No : ${invNumber}\nAmount : Rs.${(b.actualTotal || 0).toLocaleString('en-IN')}\n-----------------------------------------------------------\n\nView Your Invoice:\n${viewLink}\n\n"${quote}"\n\n${closing}\n\nShree Hari Dresses & Cutpiece\nVisit Us Again - Your Next Favorite Look Is Waiting\n-----------------------------------------------------------`;

    
    const waUrl = `https://wa.me/91${b.customerPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    
    setIsSharingProcess(false);
    setSharingBillNo('');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, exps] = await Promise.all([fetchBills(), fetchExpenses()]);
      setBills(data);
      setExpenses(exps);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Analytics Math
  const activeBills = bills.filter(b => b.status !== 'void');
  const totalRevenue = activeBills.reduce((sum, bill) => sum + bill.actualTotal, 0);
  const totalInvoices = activeBills.length;
  const avgBill = totalInvoices > 0 ? (totalRevenue / totalInvoices).toFixed(2) : 0;
  
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Analytics Data
  const revenueByDate = {};
  activeBills.forEach(b => {
    const d = new Date(b.createdAt);
    const dateStr = `${d.getDate()}/${d.getMonth()+1}`;
    revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + b.actualTotal;
  });
  const trendData = Object.keys(revenueByDate).map(date => ({ name: date, revenue: revenueByDate[date] })).reverse();

  const itemSales = {};
  activeBills.forEach(b => {
    b.items.forEach(item => {
      itemSales[item.name] = (itemSales[item.name] || 0) + item.quantity;
    });
  });
  const topItemsData = Object.keys(itemSales)
    .map(name => ({ name, value: itemSales[name] }))
    .sort((a,b) => b.value - a.value)
    .slice(0, 5);
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const filteredBills = bills.filter(bill => {
    const billNo = bill.serialNumber 
      ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') 
      : bill._id.substring(bill._id.length - 4).toUpperCase();
      
    let match = true;
    if (searchTerm) {
      const search = searchTerm.toLowerCase().trim();
      const rawSearch = searchTerm.trim(); // For case-sensitive invoice numbers
      const name = (bill.customerName || '').toLowerCase();
      const phone = (bill.customerPhone || '');
      const amount = String(bill.actualTotal);
      
      if (!billNo.includes(rawSearch) && 
          !name.includes(search) && 
          !phone.includes(search) &&
          !amount.includes(search)) {
          match = false;
      }
    }
    const bDate = new Date(bill.createdAt);
    if (startDate && bDate < new Date(startDate)) match = false;
    if (endDate && bDate > new Date(endDate + 'T23:59:59')) match = false;
    
    return match;
  });

  const exportCSV = () => {
    let csv = "Date,Bill No,Customer Name,Tax Amount,Total Paid,Status\n";
    filteredBills.forEach(b => {
      const d = new Date(b.createdAt).toLocaleDateString('en-IN');
      const billNo = b.serialNumber ? String(((b.serialNumber - 1) % 100) + 1).padStart(3, '0') : b._id.substring(b._id.length - 4).toUpperCase();
      const tax = (b.cgst + b.sgst).toFixed(2);
      const row = `"${d}","${billNo}","${b.customerName || 'Cash'}","${tax}","${b.actualTotal}","${b.status || 'active'}"`;
      csv += row + "\n";
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bills_export.csv';
    a.click();
  };

  const getAvailableBooks = () => {
    const books = new Set();
    bills.forEach(b => {
      if (b.serialNumber) {
        const bookNum = Math.floor((b.serialNumber - 1) / 100) + 1;
        books.add(bookNum);
      }
    });
    return Array.from(books).sort((a, b) => b - a);
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h2>{t('histTitle')}</h2>
          <p style={{color: 'var(--text-secondary)'}}>{t('histSubtitle')}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportCSV}>
             <Download size={18} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={18} /> {t('refresh')}
          </button>
        </div>
      </header>

      {error && (
        <div style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px'}}>
          {error}
        </div>
      )}

      {/* Bill Book Downloads */}
      {getAvailableBooks().length > 0 && (
        <div style={{marginBottom: '40px'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--accent-gradient)', color: 'white', padding: '8px', borderRadius: '10px' }}>
              <Download size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>Download Complete Bill Books</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>(100 Bills per Book)</p>
            </div>
          </div>
          
          <div style={{
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
            gap: '16px'
          }}>
            {getAvailableBooks().map((bookNum, index) => {
              const productionBackend = "https://billing-8ffn.onrender.com";
              const backendBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : productionBackend);
              const downloadUrl = `${backendBaseUrl}/api/bills/book/${bookNum}/pdf`;
              
              return (
                <button 
                  key={bookNum}
                  onClick={() => window.open(downloadUrl, '_blank')}
                  className="glass-panel hover-lift"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    padding: '20px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                    animation: `fadeInUp 0.4s ease-out forwards`,
                    animationDelay: `${Math.min(index * 0.05, 0.4)}s`,
                    opacity: 0,
                    transform: 'translateY(10px)'
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', 
                    background: 'rgba(3, 105, 161, 0.1)', color: 'var(--accent-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '4px'
                  }}>
                    <FileText size={24} strokeWidth={2} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '1.05rem', letterSpacing: '-0.3px' }}>Book {String(bookNum).padStart(2, '0')}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: '700', background: 'rgba(3, 105, 161, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>PDF</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics Board */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        
        <div className="glass-panel hover-lift" style={{padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', position: 'relative', overflow: 'hidden'}}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--success)' }}></div>
          <div style={{background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--success)'}}>
            <Banknote size={24} />
          </div>
          <div>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '600'}}>{t('totalRevenue')}</p>
            <h3 style={{fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px'}}>Rs.{(totalRevenue || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', position: 'relative', overflow: 'hidden'}}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-primary)' }}></div>
          <div style={{background: 'rgba(3, 105, 161, 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--accent-primary)'}}>
            <FileText size={24} />
          </div>
          <div>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '600'}}>{t('totalInvoices')}</p>
            <h3 style={{fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px'}}>{totalInvoices}</h3>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', position: 'relative', overflow: 'hidden'}}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}></div>
          <div style={{background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '600'}}>Net Profit</p>
            <h3 style={{fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}}>Rs.{(netProfit || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid" style={{marginBottom: '40px'}}>
        <div className="glass-panel" style={{padding: '24px', height: '350px'}}>
          <h3 style={{marginBottom: '20px'}}>Revenue Timeline</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 11, fill: 'var(--text-secondary)'}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 11, fill: 'var(--text-secondary)'}}
                  tickFormatter={(val) => `Rs.${val >= 1000 ? (val/1000) + 'k' : val}`}
                />
                <Tooltip 
                  contentStyle={{backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)'}}
                  itemStyle={{color: 'white'}}
                  formatter={(value) => [`Rs.${(value || 0).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--accent-primary)" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{padding: '24px', height: '350px', display: 'flex', flexDirection: 'column'}}>
          <h3 style={{marginBottom: '20px'}}>Top 5 Items (Qty)</h3>
          {topItemsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <PieChart>
                <Pie data={topItemsData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {topItemsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px', zIndex: 10}}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'}}>No Data</div>
          )}
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="glass-panel" style={{padding: '24px'}}>
        
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <h3>{t('recentReceipts')}</h3>
          <div className="header-actions" style={{ flex: 1, justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
              <input 
                type="date" 
                className="input-field" 
                style={{ width: 'auto', flex: 1, minWidth: '130px' }} 
                value={startDate ?? ''} 
                onChange={(e)=>setStartDate(e.target.value)} 
              />
              <input 
                type="date" 
                className="input-field" 
                style={{ width: 'auto', flex: 1, minWidth: '130px' }} 
                value={endDate ?? ''} 
                onChange={(e)=>setEndDate(e.target.value)} 
              />
              <div style={{position: 'relative', flex: 2, minWidth: '200px'}}>
                <Search size={16} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)'}} />
                <input 
                  type="text" 
                  className="input-field" 
                  style={{paddingLeft: '36px'}}
                  placeholder="Search..." 
                  value={searchTerm ?? ''}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="animate-pulse" style={{color: 'var(--text-secondary)'}}>Loading ledger data...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredBills.length === 0 ? (
              <div style={{padding: '32px 8px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                {bills.length === 0 ? t('noInvoices') : "No matching bills found"}
              </div>
            ) : (
              filteredBills.map((bill, index) => {
                const totalTaxes = bill.cgst + bill.sgst;
                const dateObj = new Date(bill.createdAt);
                const isVoid = bill.status === 'void';
                const invNumber = bill.serialNumber ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') : bill._id.substring(bill._id.length - 4).toUpperCase();
                
                return (
                  <div key={bill._id} className="glass-panel hover-lift receipt-card" style={{
                    padding: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '12px',
                    opacity: isVoid ? 0.6 : 1,
                    borderLeft: `5px solid ${isVoid ? 'var(--text-secondary)' : 'var(--accent-primary)'}`,
                    animation: `fadeInUp 0.4s ease-out forwards`,
                    animationDelay: `${Math.min(index * 0.05, 0.4)}s`,
                  }}>
                    
                    {/* Left Details */}
                    <div className="receipt-left" style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto' }}>
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
                        background: isVoid ? 'rgba(0,0,0,0.05)' : 'rgba(3, 105, 161, 0.1)', 
                        color: isVoid ? 'var(--text-secondary)' : 'var(--accent-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }} className="hide-on-mobile-small">
                        <FileText size={22} strokeWidth={2.5} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textDecoration: isVoid ? 'line-through' : 'none', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {bill.customerName || <span style={{fontStyle: 'italic'}}>{t('walkInCash')}</span>}
                          {isVoid && <span style={{color: 'var(--danger)', fontSize: '0.75rem', marginLeft: '8px', textDecoration: 'none', padding: '2px 8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px'}}>VOID</span>}
                          {bill.billType === 'return' && !isVoid && <span style={{color: '#ef4444', fontSize: '0.75rem', marginLeft: '8px', padding: '2px 8px', background: '#fee2e2', borderRadius: '12px'}}>RETURN</span>}
                        </h4>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          Inv #{invNumber} • {dateObj.toLocaleDateString('en-IN')} {dateObj.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {bill.uniqueInvoiceId && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start', marginTop: '2px' }}>
                            {bill.uniqueInvoiceId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Actions */}
                    <div className="receipt-actions" style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleViewBill(bill)} className="action-btn-hover" style={{background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '700', fontSize: '0.9rem'}} title="View">
                        <Eye size={18} /> <span className="hide-on-mobile">View</span>
                      </button>
                      <button onClick={() => handleWhatsApp(bill)} className="action-btn-hover" style={{background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '700', fontSize: '0.9rem'}} title="WhatsApp">
                        <MessageCircle size={18} /> <span className="hide-on-mobile">Share</span>
                      </button>
                      {!isVoid && (
                        <button onClick={() => handleVoid(bill._id)} className="action-btn-hover" style={{background: 'rgba(251, 191, 36, 0.1)', color: '#f59e0b', padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '700', fontSize: '0.9rem'}} title="Void">
                          <Ban size={18} /> <span className="hide-on-mobile">Void</span>
                        </button>
                      )}
                      <button onClick={() => handleDelete(bill)} className="action-btn-hover" style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '700', fontSize: '0.9rem'}} title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Right: Amount */}
                    <div className="receipt-right" style={{ textAlign: 'right', flexShrink: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', letterSpacing: '-0.5px', color: isVoid ? 'var(--text-secondary)' : (bill.billType === 'return' ? '#ef4444' : 'var(--success)') }}>
                        {bill.billType === 'return' ? '-' : ''}Rs.{(bill.actualTotal || 0).toLocaleString('en-IN')}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                        Incl. ₹{totalTaxes.toFixed(2)} Tax
                      </span>
                    </div>

                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Premium Magnifier View Loader */}
      {isViewingProcess && (
        <div className="modal-overlay" style={{ zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="premium-search-loader" style={{ padding: '40px', borderRadius: '32px' }}>
                    <div className="magnifier-animation-wrapper">
                        <FileText size={60} className="base-bill-icon" />
                        <div className="magnifier-lens">
                            <Search size={30} color="white" />
                        </div>
                        <div className="scan-line"></div>
                    </div>
                </div>
                <h2 className="loader-title" style={{ color: 'var(--accent-primary)', marginTop: '20px' }}>Retrieving Bill #{viewingBillNo}...</h2>
                <p className="loader-subtitle" style={{ color: 'var(--text-secondary)' }}>
                    Accessing secure records and generating high-fidelity preview.
                </p>
            </div>
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

      {/* Bill View Modal */}
      {selectedBill && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', overflowY: 'auto'
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
              onClick={() => handleWhatsApp(selectedBill)}
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
              onClick={() => setSelectedBill(null)}
            >
              <X size={14} /> Close
            </button>
          </div>
          <div style={{borderRadius: '8px', width: '100%', maxWidth: '800px'}}>
             <PrintableBill bill={selectedBill} />
          </div>
        </div>
      )}

      {/* Hidden container for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id="pdf-capture-element" style={{ width: '210mm' }}>
          {generatingPdfBill && <PrintableBill bill={generatingPdfBill} />}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(8px)' }}>
            <div style={{ 
                background: 'white', 
                padding: '40px', 
                borderRadius: '32px', 
                maxWidth: '400px', 
                width: '90%', 
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                animation: 'modalSlideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 24px',
                    color: '#ef4444'
                }}>
                    <Trash2 size={40} className="shake-animation" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px' }}>Delete Invoice?</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
                    Are you sure you want to delete <strong style={{ color: '#1e293b' }}>#{billToDelete?.serialNumber ? String(((billToDelete.serialNumber - 1) % 100) + 1).padStart(3, '0') : billToDelete?._id.substring(billToDelete._id.length - 4).toUpperCase()}</strong>? This action is permanent and cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setShowDeleteConfirm(false)} style={{ 
                        flex: 1, 
                        padding: '14px', 
                        borderRadius: '16px', 
                        border: '1px solid #e2e8f0', 
                        background: 'white', 
                        color: '#64748b', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}>Cancel</button>
                    <button onClick={confirmDelete} style={{ 
                        flex: 1, 
                        padding: '14px', 
                        borderRadius: '16px', 
                        border: 'none', 
                        background: '#ef4444', 
                        color: 'white', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                        transition: 'all 0.2s'
                    }}>Delete Now</button>
                </div>
            </div>
        </div>
      )}

      {/* Premium Shredder Deletion Loader */}
      {isDeletingProcess && (
        <div className="modal-overlay" style={{ zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
            <div style={{ textAlign: 'center', position: 'relative' }}>
                <div className="shredder-container">
                    <div className="paper-particles">
                        <span></span><span></span><span></span><span></span><span></span>
                    </div>
                    <FileText size={64} className="shredding-bill-pro" />
                    <div className="shredder-mouth">
                        <div className="shredder-glow"></div>
                    </div>
                </div>
                
                <h3 className="purging-text">PURGING RECORD...</h3>
                
                <div className="optimum-progress">
                    <div className="optimum-bar">
                        <div className="bar-shine"></div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {deleteSuccess && (
        <div className="modal-overlay" style={{ zIndex: 12000, background: 'rgba(16, 185, 129, 0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="success-icon-container" style={{ marginBottom: '20px' }}>
              <CheckCircle2 size={80} color="white" className="animate-bounce" />
            </div>
            <h2 className="loader-title" style={{ color: 'white', fontSize: '2.2rem' }}>Bill Deleted Successfully!</h2>
            <p className="loader-subtitle" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem' }}>
              Inventory and serial numbers have been synchronized.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(40px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        .shredder-container {
            position: relative;
            width: 120px;
            height: 140px;
            margin: 0 auto;
        }
        .shredding-bill-pro {
            color: rgba(255,255,255,0.7);
            animation: proShred 2.5s infinite cubic-bezier(0.45, 0, 0.55, 1);
            position: relative;
            z-index: 1;
        }
        @keyframes proShred {
            0% { transform: translateY(-20px); opacity: 0; }
            20% { transform: translateY(0); opacity: 1; }
            80% { transform: translateY(30px); opacity: 0.5; clip-path: inset(0 0 40% 0); }
            100% { transform: translateY(45px); opacity: 0; clip-path: inset(0 0 100% 0); }
        }
        .shredder-mouth {
            width: 80px;
            height: 10px;
            background: #1e293b;
            border: 2px solid #ef4444;
            margin: -10px auto 0;
            border-radius: 4px;
            position: relative;
            z-index: 2;
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
            animation: vibrate 0.1s infinite;
        }
        @keyframes vibrate {
            0% { transform: translateX(0); }
            25% { transform: translateX(1px); }
            75% { transform: translateX(-1px); }
            100% { transform: translateX(0); }
        }
        .shredder-glow {
            position: absolute;
            inset: -5px;
            background: #ef4444;
            filter: blur(10px);
            opacity: 0.4;
            border-radius: 4px;
            animation: glowPulse 1.5s infinite ease-in-out;
        }
        @keyframes glowPulse {
            0%, 100% { opacity: 0.2; transform: scaleX(1); }
            50% { opacity: 0.6; transform: scaleX(1.1); }
        }
        .paper-particles {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 40px;
        }
        .paper-particles span {
            position: absolute;
            width: 4px;
            height: 8px;
            background: rgba(255,255,255,0.4);
            top: 10px;
            animation: fall 1s infinite linear;
        }
        .paper-particles span:nth-child(1) { left: 10%; animation-delay: 0.2s; }
        .paper-particles span:nth-child(2) { left: 30%; animation-delay: 0.5s; }
        .paper-particles span:nth-child(3) { left: 50%; animation-delay: 0.1s; }
        .paper-particles span:nth-child(4) { left: 70%; animation-delay: 0.7s; }
        .paper-particles span:nth-child(5) { left: 90%; animation-delay: 0.4s; }
        
        @keyframes fall {
            to { transform: translateY(40px) rotate(360deg); opacity: 0; }
        }
        
        .purging-text {
            color: white;
            margin-top: 40px;
            font-weight: 900;
            letter-spacing: 0.3em;
            font-size: 1rem;
            text-transform: uppercase;
            background: linear-gradient(90deg, #fff, #ef4444, #fff);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: textShine 3s linear infinite;
        }
        @keyframes textShine {
            to { background-position: 200% center; }
        }
        
        .optimum-progress {
            width: 240px;
            height: 6px;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
            margin: 25px auto 0;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .optimum-bar {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #b91c1c, #ef4444);
            position: relative;
            animation: optimumFill 2.5s forwards cubic-bezier(0.65, 0, 0.35, 1);
        }
        @keyframes optimumFill {
            to { width: 100%; }
        }
        .bar-shine {
            position: absolute;
            top: 0;
            left: 0;
            width: 50px;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            animation: shineMove 1.5s infinite;
        }
        @keyframes shineMove {
            0% { left: -50px; }
            100% { left: 100%; }
        }
        
        .shake-animation {
            animation: shake 0.5s infinite ease-in-out;
        }
        @keyframes shake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
        }

        .premium-search-loader {
            background: rgba(255, 255, 255, 0.5);
            border-radius: 32px;
            margin: 20px 0;
            display: flex;
            justify-content: center;
        }
        .magnifier-animation-wrapper {
            position: relative;
            width: 120px;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .base-bill-icon {
            color: #cbd5e1;
            animation: billPulse 2s infinite ease-in-out;
        }
        @keyframes billPulse {
            0%, 100% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(1.1); opacity: 0.7; }
        }
        .magnifier-lens {
            position: absolute;
            width: 64px;
            height: 64px;
            background: var(--accent-gradient);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 15px 35px rgba(3, 105, 161, 0.4);
            border: 3px solid white;
            animation: lensMove 4s infinite ease-in-out;
            z-index: 2;
        }
        @keyframes lensMove {
            0% { transform: translate(-35px, -35px); }
            25% { transform: translate(35px, -25px); }
            50% { transform: translate(30px, 35px); }
            75% { transform: translate(-40px, 30px); }
            100% { transform: translate(-35px, -35px); }
        }
        .scan-line {
            position: absolute;
            width: 100px;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
            z-index: 1;
            animation: scanVertical 2.5s infinite ease-in-out;
            box-shadow: 0 0 15px var(--accent-primary);
        }
        @keyframes scanVertical {
            0% { transform: translateY(-45px); opacity: 0; }
            20% { opacity: 0.8; }
            80% { opacity: 0.8; }
            100% { transform: translateY(45px); opacity: 0; }
        }

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
}
