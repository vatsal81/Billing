import React, { useState, useEffect } from 'react';
import { fetchExpenses, createExpense, deleteExpense } from '../utils/api';
import { Wallet, Plus, Trash2, Calendar, IndianRupee } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext';

export default function Expenses() {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!description || !amount) return;
    try {
      setLoading(true);
      await createExpense({ description, amount: Number(amount), date });
      setDescription('');
      setAmount('');
      loadExpenses();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense record?")) return;
    try {
      setLoading(true);
      await deleteExpense(id);
      loadExpenses();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="animate-fade-in">
      <header style={{marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h2>Expenses</h2>
          <p style={{color: 'var(--text-secondary)'}}>Track shop costs, utilities, and other overheads.</p>
        </div>
        <div style={{textAlign: 'right'}}>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Total Expenses</p>
          <h3 style={{color: 'var(--danger)', fontSize: '1.8rem'}}>₹{totalExpenses.toLocaleString('en-IN')}</h3>
        </div>
      </header>

      {error && (
        <div style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px'}}>
          {error}
        </div>
      )}

      <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px'}}>
        
        {/* Add Expense Form */}
        <div className="glass-panel" style={{padding: '24px', height: 'fit-content'}}>
          <h3 style={{marginBottom: '20px'}}>Log New Expense</h3>
          <form onSubmit={handleAddExpense}>
            <div className="input-group">
              <label className="input-label">Description</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Shop Rent / Electricity"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Amount (₹)</label>
              <input 
                type="number" 
                className="input-field" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '12px'}} disabled={loading}>
              <Plus size={18} /> {loading ? 'Saving...' : 'Add Expense'}
            </button>
          </form>
        </div>

        {/* Expense List */}
        <div className="glass-panel" style={{padding: '24px'}}>
          <h3 style={{marginBottom: '20px'}}>Expense Ledger</h3>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {expenses.length === 0 ? (
              <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0'}}>
                No expenses recorded yet.
              </p>
            ) : (
              expenses.map(exp => (
                <div key={exp._id} style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{flex: 1}}>
                    <h4 style={{fontSize: '1.1rem'}}>{exp.description}</h4>
                    <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>
                      <Calendar size={12} style={{display: 'inline', marginBottom: '-2px'}} /> {new Date(exp.date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div style={{textAlign: 'right', paddingRight: '20px'}}>
                    <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--danger)'}}>
                      -₹{exp.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <button 
                    className="btn btn-danger" 
                    style={{padding: '8px', borderRadius: '8px'}}
                    onClick={() => handleDelete(exp._id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
