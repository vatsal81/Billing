import React, { useState, useEffect } from 'react';
import { fetchExpenses, createExpense, deleteExpense } from '../utils/api';
import { Plus, Trash2, Calendar } from 'lucide-react';

const EXPENSE_CATEGORIES = ['Rent', 'Salary', 'Utilities', 'Transport', 'Purchases', 'Marketing', 'Maintenance', 'Other'];
const CATEGORY_COLORS = {
  Rent: '#6366f1', Salary: '#8b5cf6', Utilities: '#f59e0b', Transport: '#10b981',
  Purchases: '#3b82f6', Marketing: '#ec4899', Maintenance: '#f97316', Other: '#64748b'
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCategory, setFilterCategory] = useState('All');
  const [error, setError] = useState(null);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await fetchExpenses();
      setExpenses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExpenses(); }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!description || !amount) return;
    try {
      setLoading(true);
      await createExpense({ description, amount: Number(amount), category, date });
      setDescription(''); setAmount(''); setCategory('Other');
      loadExpenses();
    } catch (err) {
      setError(err.message); setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense record?")) return;
    try { setLoading(true); await deleteExpense(id); loadExpenses(); }
    catch (err) { setError(err.message); setLoading(false); }
  };

  const filtered = filterCategory === 'All' ? expenses : expenses.filter(e => e.category === filterCategory);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h2>Expenses</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Track shop costs, utilities, and other overheads.</p>
        </div>
        <div className="header-actions" style={{ textAlign: 'right' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Expenses</p>
            <h3 style={{ color: 'var(--danger)', fontSize: '1.8rem' }}>₹{(totalExpenses || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </header>

      {/* Category Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {['All', ...EXPENSE_CATEGORIES].map(cat => {
          const catTotal = cat === 'All' ? totalExpenses : expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
          const color = CATEGORY_COLORS[cat] || '#6366f1';
          const active = filterCategory === cat;
          return (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              style={{ padding: '6px 14px', borderRadius: '20px', border: `2px solid ${active ? color : 'var(--border-color)'}`, background: active ? color + '22' : 'transparent', color: active ? color : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: '0.2s' }}>
              {cat}{catTotal > 0 ? ` · ₹${(catTotal || 0).toLocaleString('en-IN')}` : ''}
            </button>
          );
        })}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>{error}</div>}

      <div className="charts-grid" style={{ gridTemplateColumns: expenses.length > 0 ? '1fr 2fr' : '1fr' }}>
        {/* Add Expense Form */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '20px' }}>Log New Expense</h3>
          <form onSubmit={handleAddExpense}>
            <div className="input-group">
              <label className="input-label">Category</label>
              <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Description</label>
              <input type="text" className="input-field" placeholder="e.g. Shop Rent / Electricity" value={description ?? ''} onChange={e => setDescription(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Amount (₹)</label>
              <input type="number" className="input-field" value={amount ?? ''} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Date</label>
              <input type="date" className="input-field" value={date ?? ''} onChange={e => setDate(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
              <Plus size={18} /> {loading ? 'Saving...' : 'Add Expense'}
            </button>
          </form>
        </div>

        {/* Expense List */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>
            Expense Ledger <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 400 }}>({filtered.length} records)</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>No expenses recorded yet.</p>
            ) : (
              filtered.map(exp => {
                const color = CATEGORY_COLORS[exp.category] || '#64748b';
                return (
                  <div key={exp._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: `4px solid ${color}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ background: color + '22', color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>{exp.category || 'Other'}</span>
                        <h4 style={{ fontSize: '1rem' }}>{exp.description}</h4>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> {new Date(exp.date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', paddingRight: '16px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--danger)' }}>-₹{(exp.amount || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <button className="btn btn-danger" style={{ padding: '8px', borderRadius: '8px' }} onClick={() => handleDelete(exp._id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
