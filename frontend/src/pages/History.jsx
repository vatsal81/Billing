import React, { useState, useEffect } from 'react';
import { fetchBills, voidBill, deleteBill, fetchExpenses, getFrontendUrl, getBackendUrl } from '../utils/api';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, FileText, Banknote, RefreshCw, Eye, X, Printer, Search, Download, Ban, MessageCircle, Share2, Trash2 } from 'lucide-react';

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

  const handleVoid = async (id) => {
    if(!window.confirm("Are you sure you want to void this bill? It will be removed from your revenue total but keep its serial sequence.")) return;
    try {
      await voidBill(id);
      loadData();
    } catch(e) {
      setError(e.response?.data?.message || e.message);
    }
  };


  const handleDelete = async (id) => {
    if(!window.confirm("WARNING: This will PERMANENTLY DELETE this bill from the database. This cannot be undone. Are you sure?")) return;
    try {
      await deleteBill(id);
      loadData();
    } catch(e) {
      setError(e.response?.data?.message || e.message);
    }
  };


  const handleWhatsApp = async (b) => {
    if (!b.customerPhone) {
        alert("No phone number recorded for this customer.");
        return;
    }

    // Always use the Render URL for the PDF link to ensure it works on mobile/whatsapp
    const viewLink = `${getFrontendUrl()}/view-bill/${b._id}`;
    
    const text = `નમસ્તે ${b.customerName || 'ગ્રાહક મિત્ર'},\n\nશ્રી હરિ ડ્રેસીસ & કટપીસમાં પધારવા બદલ આભાર! 🛍️\n\nબિલ વિગતો:\n📅 તારીખ: ${new Date(b.createdAt).toLocaleDateString('en-IN')}\n🧾 બિલ નં: ${b.serialNumber ? String(((b.serialNumber - 1) % 100) + 1).padStart(3, '0') : b._id.substring(b._id.length - 4).toUpperCase()}\n💰 કુલ રકમ: ₹${b.actualTotal.toLocaleString('en-IN')}\n\nતમારું બિલ જોવા અથવા ડાઉનલોડ કરવા માટે નીચેની લિંક પર ક્લિક કરો:\n${viewLink}\n\nફરી પધારજો! આપનો દિવસ શુભ રહે. 😊\n\n------------------\n\nHello ${b.customerName || 'Valued Customer'},\n\nThank you for shopping at Shree Hari! 🛍️\n\nYour Online Bill: ${viewLink}\n\nHave a great day!`;

    
    const waUrl = `https://wa.me/91${b.customerPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    
    setLoading(false);
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
      const nameGu = (bill.customerNameGujarati || '');
      const phone = (bill.customerPhone || '');
      const amount = String(bill.actualTotal);
      
      if (!billNo.includes(rawSearch) && 
          !name.includes(search) && 
          !nameGu.includes(search) &&
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
            <h3 style={{fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px'}}>₹{totalRevenue.toLocaleString('en-IN')}</h3>
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
            <h3 style={{fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}}>₹{netProfit.toLocaleString('en-IN')}</h3>
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
                  tickFormatter={(val) => `₹${val >= 1000 ? (val/1000) + 'k' : val}`}
                />
                <Tooltip 
                  contentStyle={{backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)'}}
                  itemStyle={{color: 'white'}}
                  formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
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
                value={startDate} 
                onChange={(e)=>setStartDate(e.target.value)} 
              />
              <input 
                type="date" 
                className="input-field" 
                style={{ width: 'auto', flex: 1, minWidth: '130px' }} 
                value={endDate} 
                onChange={(e)=>setEndDate(e.target.value)} 
              />
              <div style={{position: 'relative', flex: 2, minWidth: '200px'}}>
                <Search size={16} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)'}} />
                <input 
                  type="text" 
                  className="input-field" 
                  style={{paddingLeft: '36px'}}
                  placeholder="Search..." 
                  value={searchTerm}
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
                        </h4>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          Inv #{invNumber} • {dateObj.toLocaleDateString('en-IN')} {dateObj.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Actions */}
                    <div className="receipt-actions" style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setSelectedBill(bill)} className="action-btn-hover" style={{background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '700', fontSize: '0.9rem'}} title="View">
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
                      <button onClick={() => handleDelete(bill._id)} className="action-btn-hover" style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '700', fontSize: '0.9rem'}} title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Right: Amount */}
                    <div className="receipt-right" style={{ textAlign: 'right', flexShrink: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', letterSpacing: '-0.5px', color: isVoid ? 'var(--text-secondary)' : 'var(--success)' }}>
                        ₹{bill.actualTotal.toLocaleString('en-IN')}
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

      {/* Bill View Modal */}
      {selectedBill && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', overflowY: 'auto'
        }}>
          <div className="no-print" style={{width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '20px'}}>
            <button className="btn" style={{background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid #22c55e', display: 'flex', alignItems: 'center', gap: '8px'}} onClick={() => handleWhatsApp(selectedBill)}>
              <MessageCircle size={18} /> Send WhatsApp
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}><Printer size={18} /> Print</button>
            <button className="btn btn-secondary" onClick={() => setSelectedBill(null)}><X size={18} /> Close</button>
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

    </div>
  );
}
