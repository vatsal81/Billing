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
    if (searchTerm && 
        !billNo.includes(searchTerm) && 
        !(bill.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(bill.customerPhone || '').includes(searchTerm)) {
        match = false;
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
        <div className="glass-panel" style={{padding: '20px', marginBottom: '40px', border: '1px solid var(--accent-primary)'}}>
          <h4 style={{marginBottom: '15px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '10px'}}>
            <Download size={20} /> Download Complete Bill Books (100 Bills/Book)
          </h4>
          <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
            {getAvailableBooks().map(bookNum => {
              const productionBackend = "https://billing-8ffn.onrender.com";
              const backendBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : productionBackend);
              const downloadUrl = `${backendBaseUrl}/api/bills/book/${bookNum}/pdf`;
              
              return (
                <button 
                  key={bookNum}
                  className="btn btn-secondary" 
                  onClick={() => window.open(downloadUrl, '_blank')}
                  style={{borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', padding: '8px 16px'}}
                >
                  Book {String(bookNum).padStart(2, '0')} (PDF)
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics Board */}
      <div className="stats-grid" style={{marginBottom: '40px'}}>
        
        <div className="glass-panel" style={{padding: '24px', display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '16px', color: 'var(--success)'}}>
            <Banknote size={32} />
          </div>
          <div>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px'}}>{t('totalRevenue')}</p>
            <h3 style={{fontSize: '1.8rem'}}>₹{totalRevenue.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{padding: '24px', display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{background: 'rgba(99, 102, 241, 0.1)', padding: '16px', borderRadius: '16px', color: 'var(--accent-primary)'}}>
            <FileText size={32} />
          </div>
          <div>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px'}}>{t('totalInvoices')}</p>
            <h3 style={{fontSize: '1.8rem'}}>{totalInvoices}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{padding: '24px', display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '16px', color: 'var(--danger)'}}>
            <TrendingUp size={32} />
          </div>
          <div>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px'}}>Net Profit</p>
            <h3 style={{fontSize: '1.8rem', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}}>₹{netProfit.toLocaleString('en-IN')}</h3>
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
          <div className="table-container">
            <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
              <thead>
                <tr style={{borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)'}}>
                  <th style={{padding: '16px 8px'}}>{t('dateCol')}</th>
                  <th style={{padding: '16px 8px'}}>{t('invoiceNumCol')}</th>
                  <th style={{padding: '16px 8px'}}>{t('customerCol')}</th>
                  <th style={{padding: '16px 8px'}}>{t('taxesGstCol')}</th>
                  <th style={{padding: '16px 8px', textAlign: 'right'}}>{t('totalPaidCol')}</th>
                  <th style={{padding: '16px 8px', textAlign: 'center'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{padding: '32px 8px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                      {bills.length === 0 ? t('noInvoices') : "No matching bills found"}
                    </td>
                  </tr>
                ) : (
                  filteredBills.map(bill => {
                    const totalTaxes = bill.cgst + bill.sgst;
                    const dateObj = new Date(bill.createdAt);
                    return (
                      <tr key={bill._id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: bill.status === 'void' ? 0.6 : 1, textDecoration: bill.status === 'void' ? 'line-through' : 'none'}}>
                        <td style={{padding: '16px 8px'}}>{dateObj.toLocaleDateString('en-IN')} {dateObj.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}</td>
                        <td style={{padding: '16px 8px', fontFamily: 'monospace'}}>
                          {bill.serialNumber ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') : bill._id.substring(bill._id.length - 4).toUpperCase()}
                        </td>
                        <td style={{padding: '16px 8px'}}>{bill.customerName || <span style={{color: 'var(--text-secondary)', fontStyle: 'italic'}}>{t('walkInCash')}</span>} {bill.status === 'void' && <span style={{color: 'var(--danger)', fontSize: '0.8rem', marginLeft: '8px', textDecoration: 'none', display: 'inline-block'}}>(VOID)</span>}</td>
                        <td style={{padding: '16px 8px', color: 'var(--text-secondary)'}}>+ ₹{totalTaxes.toFixed(2)}</td>
                        <td style={{padding: '16px 8px', textAlign: 'right', fontWeight: 'bold', color: bill.status === 'void' ? 'var(--text-secondary)' : 'var(--success)'}}>
                          ₹{bill.actualTotal.toLocaleString('en-IN')}
                        </td>
                        <td style={{padding: '16px 8px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center'}}>
                          <button 
                            onClick={() => setSelectedBill(bill)}
                            style={{background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'}}
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleWhatsApp(bill)}
                            style={{background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'}}
                            title="Send WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </button>
                          {bill.status !== 'void' && (
                            <button 
                              onClick={() => handleVoid(bill._id)}
                              style={{background: 'rgba(251, 191, 36, 0.1)', color: '#f59e0b', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'}}
                              title="Void Bill"
                            >
                              <Ban size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(bill._id)}
                            style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'}}
                            title="Permanent Delete"
                          >
                            <Trash2 size={16} />
                          </button>


                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
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
