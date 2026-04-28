import React, { useState, useEffect } from 'react';
import { fetchSettings, updateSettings } from '../utils/api';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext';

export default function Settings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    shopName: '',
    shopSubTitle: '',
    shopAddress: '',
    gstin: '',
    stateInfo: '',
    terms1: '',
    terms2: '',
    stampName: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch(e) { console.error(e) } finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(settings);
      setMsg("Settings saved exactly as provided.");
      setTimeout(() => setMsg(''), 3000);
    } catch(e) { } finally { setSaving(false); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="animate-fade-in">
      <header style={{marginBottom: '30px'}}>
        <h2 className="text-gradient" style={{fontSize: '2rem'}}><SettingsIcon style={{display: 'inline', marginBottom: '-4px'}} /> Settings</h2>
        <p style={{color: 'var(--text-secondary)'}}>Configure your physical bill layout perfectly.</p>
      </header>

      {msg && <div style={{background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '16px', borderRadius: '12px', marginBottom: '24px'}}>{msg}</div>}

      <div className="glass-panel" style={{padding: '24px', maxWidth: '800px'}}>
        <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Shop Name (Header)</label>
            <input type="text" className="input-field" value={settings.shopName} onChange={(e) => setSettings({...settings, shopName: e.target.value})} />
          </div>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Shop Sub Title (e.g. Wholesale & Retail)</label>
            <input type="text" className="input-field" value={settings.shopSubTitle} onChange={(e) => setSettings({...settings, shopSubTitle: e.target.value})} />
          </div>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Full Address</label>
            <textarea className="input-field" style={{minHeight: '80px', paddingTop: '10px'}} value={settings.shopAddress} onChange={(e) => setSettings({...settings, shopAddress: e.target.value})} />
          </div>
          <div style={{display: 'flex', gap: '16px'}}>
            <div className="input-group" style={{flex: 1, marginBottom: 0}}>
              <label className="input-label">GSTIN</label>
              <input type="text" className="input-field" value={settings.gstin} onChange={(e) => setSettings({...settings, gstin: e.target.value})} />
            </div>
            <div className="input-group" style={{flex: 1, marginBottom: 0}}>
              <label className="input-label">State Info (e.g. State : Gujarat Code : 24)</label>
              <input type="text" className="input-field" value={settings.stateInfo} onChange={(e) => setSettings({...settings, stateInfo: e.target.value})} />
            </div>
          </div>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Terms Line 1</label>
            <input type="text" className="input-field" value={settings.terms1} onChange={(e) => setSettings({...settings, terms1: e.target.value})} />
          </div>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Terms Line 2</label>
            <input type="text" className="input-field" value={settings.terms2} onChange={(e) => setSettings({...settings, terms2: e.target.value})} />
          </div>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Rubber Stamp Name (Gujarati / English)</label>
            <input type="text" className="input-field" value={settings.stampName} onChange={(e) => setSettings({...settings, stampName: e.target.value})} />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={saving}>
             <Save size={18} /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}
