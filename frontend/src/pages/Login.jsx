import React, { useState } from 'react';
import { useAuth } from '../utils/AuthContext';
import { login } from '../utils/api';
import { useLanguage } from '../utils/LanguageContext';
import { Lock, LogIn } from 'lucide-react';

export default function Login() {
  const { t } = useLanguage();
  const { loginUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login({ username, password });
      loginUser(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)'}}>
      <div className="glass-panel animate-fade-in" style={{width: '100%', maxWidth: '400px', padding: '40px 30px'}}>
        <div style={{textAlign: 'center', marginBottom: '30px'}}>
          <div style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', marginBottom: '16px'}}>
            <Lock size={32} />
          </div>
          <h2 className="text-gradient" style={{fontSize: '2rem'}}>{t('appTitle') || 'Shree Hari'}</h2>
          <p style={{color: 'var(--text-secondary)'}}>Secure Staff Login</p>
        </div>

        {error && <div style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontSize: '0.9rem'}}>{error}</div>}

        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Username</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{width: '100%', padding: '14px', marginTop: '10px'}} disabled={loading}>
            <LogIn size={20} /> {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
