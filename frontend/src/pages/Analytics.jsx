import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, ShoppingCart, Package, Wallet, AlertTriangle, IndianRupee, Calendar, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { fetchAnalyticsStats, fetchBills } from '../utils/api';
import '../index.css';

const Analytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');
    const [bills, setBills] = useState([]);

    const [analyticsMonth, setAnalyticsMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const [tempMonth, setTempMonth] = useState(() => {
        const now = new Date();
        return String(now.getMonth() + 1).padStart(2, '0');
    });

    const [tempYear, setTempYear] = useState(() => {
        return String(new Date().getFullYear());
    });

    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (analyticsMonth && analyticsMonth !== 'all') {
            const parts = analyticsMonth.split('-');
            if (parts.length === 2) {
                setTempYear(parts[0]);
                setTempMonth(parts[1]);
            }
        }
    }, [analyticsMonth]);

    useEffect(() => {
        const getBills = async () => {
            try {
                const billsData = await fetchBills();
                setBills(billsData);
            } catch(e) {
                console.error(e);
            }
        };
        getBills();
    }, []);

    const loadStats = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchAnalyticsStats(period, analyticsMonth);
            setStats(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    }, [period, analyticsMonth]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const availableYears = useMemo(() => {
        const yearSet = new Set();
        const currentYear = new Date().getFullYear();
        yearSet.add(currentYear);
        bills.forEach(b => {
            const d = new Date(b.createdAt);
            yearSet.add(d.getFullYear());
        });
        return Array.from(yearSet).sort((a, b) => b - a);
    }, [bills]);

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatMonthLabel = (ym) => {
        if (ym === 'all') return 'All Time';
        const [y, m] = ym.split('-');
        return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
    };

    const combineData = (sales, purchases) => {
        if (!sales || !purchases) return [];
        const dates = [...new Set([...sales.map(s => s._id), ...purchases.map(p => p._id)])].sort();
        return dates.map(date => ({
            date: date.split('-').slice(1).reverse().join('/'),
            sales: sales.find(s => s._id === date)?.total || 0,
            purchases: purchases.find(p => p._id === date)?.total || 0
        }));
    };

    if (loading && !stats) return <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Dashboard...</div>;

    const statCards = [
        { title: 'Total Sales', value: Math.round(stats?.totalSales || 0), icon: <TrendingUp size={24} />, color: 'var(--success)', bg: 'rgba(5, 150, 105, 0.1)' },
        { title: 'Total Purchases', value: Math.round(stats?.totalPurchases || 0), icon: <TrendingDown size={24} />, color: 'var(--accent-primary)', bg: 'rgba(3, 105, 161, 0.1)' },
        { title: 'Current Stock Value', value: Math.round(stats?.currentStockValue || 0), icon: <Package size={24} />, color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
        { title: 'Total Expenses', value: Math.round(stats?.totalExpenses || 0), icon: <Wallet size={24} />, color: 'var(--danger)', bg: 'rgba(220, 38, 38, 0.1)' },
        { title: 'Net Profit', value: Math.round(stats?.profit || 0), icon: <IndianRupee size={24} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    ];

    const periodOptions = [
        { label: 'Last 7 Days', value: '7d' },
        { label: 'Last 30 Days', value: '30d' },
        { label: 'Last 90 Days', value: '90d' },
        { label: 'Last Year', value: '1y' },
        { label: 'All Time', value: 'all' }
    ];

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="text-gradient">Business Analytics</h1>
                    <p className="text-secondary">Comprehensive overview of your business performance</p>
                </div>
                <div className="filter-row">
                    <div className="period-selector-wrapper">
                        <div className="period-selector hide-scrollbar">
                            {periodOptions.map(option => (
                                <button 
                                    key={option.value}
                                    onClick={() => {
                                        setAnalyticsMonth('all');
                                        setPeriod(option.value);
                                        setShowPicker(false);
                                    }}
                                    className={`btn btn-sm ${(analyticsMonth === 'all' && period === option.value) ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ 
                                        padding: '8px 14px', 
                                        fontSize: '0.85rem', 
                                        fontWeight: '600',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: (analyticsMonth === 'all' && period === option.value) ? 'var(--accent-gradient)' : 'transparent',
                                        color: (analyticsMonth === 'all' && period === option.value) ? 'white' : 'var(--text-secondary)',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="custom-month-wrapper">
                        <button
                            onClick={() => setShowPicker(!showPicker)}
                            className={`btn btn-sm ${analyticsMonth !== 'all' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ 
                                padding: '8px 14px', 
                                fontSize: '0.85rem', 
                                fontWeight: '600',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                background: analyticsMonth !== 'all' ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
                                color: analyticsMonth !== 'all' ? 'white' : 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                height: '36px',
                                cursor: 'pointer'
                            }}
                        >
                            <Calendar size={14} />
                            {analyticsMonth === 'all' ? 'Custom Month' : formatMonthLabel(analyticsMonth)}
                        </button>

                        {showPicker && (
                            <div className="custom-month-picker-popover">
                                {/* Card Header */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #085f8c 0%, #054668 100%)',
                                    padding: '16px 20px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'rgba(255, 255, 255, 0.15)',
                                        border: '1px solid rgba(255, 255, 255, 0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff'
                                    }}>
                                        <Calendar size={18} strokeWidth={2} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.05rem', fontWeight: '800', letterSpacing: '-0.3px' }}>Select Report Period</h3>
                                        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.75rem', fontWeight: '500' }}>
                                            Choose month & year • <strong>{analyticsMonth === 'all' ? 'All Time' : formatMonthLabel(analyticsMonth)}</strong>
                                        </p>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {/* Month Dropdown */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ 
                                                color: '#085f8c', 
                                                fontSize: '0.7rem', 
                                                fontWeight: '800', 
                                                letterSpacing: '0.5px' 
                                            }}>MONTH</label>
                                            <select 
                                                value={tempMonth} 
                                                onChange={(e) => setTempMonth(e.target.value)}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    outline: 'none',
                                                    WebkitAppearance: 'none',
                                                    MozAppearance: 'none',
                                                    appearance: 'none',
                                                    backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPosition: 'right 12px center',
                                                    backgroundSize: '12px'
                                                }}
                                            >
                                                <option value="01">January</option>
                                                <option value="02">February</option>
                                                <option value="03">March</option>
                                                <option value="04">April</option>
                                                <option value="05">May</option>
                                                <option value="06">June</option>
                                                <option value="07">July</option>
                                                <option value="08">August</option>
                                                <option value="09">September</option>
                                                <option value="10">October</option>
                                                <option value="11">November</option>
                                                <option value="12">December</option>
                                            </select>
                                        </div>

                                        {/* Year Dropdown */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ 
                                                color: '#085f8c', 
                                                fontSize: '0.7rem', 
                                                fontWeight: '800', 
                                                letterSpacing: '0.5px' 
                                            }}>YEAR</label>
                                            <select 
                                                value={tempYear} 
                                                onChange={(e) => setTempYear(e.target.value)}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    outline: 'none',
                                                    WebkitAppearance: 'none',
                                                    MozAppearance: 'none',
                                                    appearance: 'none',
                                                    backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPosition: 'right 12px center',
                                                    backgroundSize: '12px'
                                                }}
                                            >
                                                {availableYears.map(y => (
                                                    <option key={y} value={String(y)}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                        <button
                                            onClick={() => {
                                                setAnalyticsMonth('all');
                                                setPeriod('all');
                                                setShowPicker(false);
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '10px 16px',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.85rem',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            All Time
                                        </button>
                                        <button
                                            onClick={() => {
                                                setAnalyticsMonth(`${tempYear}-${tempMonth}`);
                                                setShowPicker(false);
                                            }}
                                            style={{
                                                flex: 1.5,
                                                padding: '10px 16px',
                                                borderRadius: '12px',
                                                border: 'none',
                                                background: '#085f8c',
                                                color: '#ffffff',
                                                fontSize: '0.85rem',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s ease',
                                                boxShadow: '0 4px 12px rgba(8, 95, 140, 0.3)'
                                            }}
                                        >
                                            <TrendingUp size={14} /> View
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '16px', 
              marginBottom: '32px' 
            }}>
                {statCards.map((card, index) => (
                    <div key={index} className="glass-panel hover-lift" style={{ 
                        padding: '20px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'flex-start', 
                        gap: '12px', 
                        position: 'relative', 
                        overflow: 'hidden',
                        animation: `fadeInUp 0.4s ease-out forwards`,
                        animationDelay: `${index * 0.05}s`,
                        opacity: 0,
                        transform: 'translateY(10px)'
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: card.color }}></div>
                        <div style={{ padding: '12px', borderRadius: '12px', background: card.bg, color: card.color }}>
                            {card.icon}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>{card.title}</p>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px', color: card.title === 'Net Profit' ? (card.value >= 0 ? 'var(--success)' : 'var(--danger)') : 'inherit' }}>
                                ₹{(card.value || 0).toLocaleString('en-IN')}
                            </h2>
                        </div>
                    </div>
                ))}
            </div>

            <div className="charts-grid">
                <div className="premium-card" style={{ padding: '24px', position: 'relative' }}>
                    {loading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}><div className="loader"></div></div>}
                    <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={20} className="text-primary" />
                        Sales vs Purchases Performance
                    </h3>
                    <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={combineData(stats?.salesByDay, stats?.purchasesByDay)} margin={{ top: 10, right: 10, left: 40, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)' }}
                                    formatter={(value, name) => [`₹${(value || 0).toLocaleString('en-IN')}`, name === 'sales' ? 'Sales' : 'Purchases']}
                                />
                                <Area type="monotone" dataKey="sales" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                <Area type="monotone" dataKey="purchases" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchases)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="premium-card" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={20} className="text-primary" />
                        Inventory & Activity
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', color: 'var(--accent-primary)' }}><Package size={18} /></div>
                                <span>Total Products</span>
                            </div>
                            <span style={{ fontWeight: '700', fontSize: '1.2rem' }}>{stats?.totalProducts || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: stats?.lowStockProducts > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)', borderRadius: '12px', border: stats?.lowStockProducts > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '8px', background: stats?.lowStockProducts > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)', borderRadius: '8px', color: stats?.lowStockProducts > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}><AlertTriangle size={18} /></div>
                                <span style={{ color: stats?.lowStockProducts > 0 ? 'var(--danger)' : 'inherit' }}>Low Stock Items</span>
                            </div>
                            <span style={{ fontWeight: '700', fontSize: '1.2rem', color: stats?.lowStockProducts > 0 ? 'var(--danger)' : 'inherit' }}>{stats?.lowStockProducts || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--success)' }}><FileText size={18} /></div>
                                <span>Total Sales Bills</span>
                            </div>
                            <span style={{ fontWeight: '700', fontSize: '1.2rem' }}>{stats?.totalBills || 0}</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-primary), #4f46e5)', color: 'white' }}>
                        <p style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '4px' }}>Performance Snapshot</p>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Profit Margin</h4>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                            <div style={{ width: `${Math.min(100, Math.max(0, ((stats?.profit || 0) / (stats?.totalSales || 1)) * 100))}%`, height: '100%', background: 'white' }}></div>
                        </div>
                        <p style={{ fontSize: '1.2rem', fontWeight: '800' }}>
                            {stats?.totalSales > 0 ? (((stats.profit / stats.totalSales) * 100).toFixed(1)) : 0}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;

