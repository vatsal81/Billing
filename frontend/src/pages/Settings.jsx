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
    stampName: '',
    logo: '',
    signature: ''
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

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image too large. Please use an image smaller than 2MB.");
        return;
      }
      setSettings({ ...settings, [field]: file });
      
      const previewUrl = URL.createObjectURL(file);
      if (field === 'logo') setLogoPreview(previewUrl);
      if (field === 'signature') setSigPreview(previewUrl);
    }
  };

  const [logoPreview, setLogoPreview] = useState(null);
  const [sigPreview, setSigPreview] = useState(null);

  const getImageUrl = (field) => {
    const value = settings[field];
    if (!value) return null;
    if (value instanceof File) {
        return field === 'logo' ? logoPreview : sigPreview;
    }
    if (value.startsWith('uploads')) {
        return `http://localhost:5000/${value}`;
    }
    return value; // Base64
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(settings).forEach(key => {
        if (key !== 'logo' && key !== 'signature') {
          formData.append(key, settings[key]);
        }
      });
      
      if (settings.logo instanceof File) formData.append('logo', settings.logo);
      if (settings.signature instanceof File) formData.append('signature', settings.signature);

      await updateSettings(formData);
      setMsg("Settings saved exactly as provided.");
      setTimeout(() => setMsg(''), 3000);
      loadSettings(); // Reload to get paths
    } catch(e) { 
        console.error(e);
        alert("Failed to save settings");
    } finally { setSaving(false); }
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

          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">Company Logo</label>
              <div style={{border: '2px dashed var(--border-color)', padding: '20px', borderRadius: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.02)'}}>
                {getImageUrl('logo') ? (
                  <div style={{position: 'relative', display: 'inline-block'}}>
                    <img src={getImageUrl('logo')} alt="Logo" style={{maxHeight: '100px', borderRadius: '8px'}} />
                    <button type="button" onClick={() => {
                        setSettings({...settings, logo: ''});
                        setLogoPreview(null);
                    }} style={{position: 'absolute', top: '-10px', right: '-10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer'}}>×</button>
                  </div>
                ) : (
                  <div onClick={() => document.getElementById('logo-upload').click()} style={{cursor: 'pointer'}}>
                    <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Click to upload Logo</p>
                    <p style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>(PNG/JPG, Max 2MB)</p>
                  </div>
                )}
                <input id="logo-upload" type="file" hidden accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Authorized Signature</label>
              <div style={{border: '2px dashed var(--border-color)', padding: '20px', borderRadius: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.02)'}}>
                {getImageUrl('signature') ? (
                  <div style={{position: 'relative', display: 'inline-block'}}>
                    <img src={getImageUrl('signature')} alt="Signature" style={{maxHeight: '100px', borderRadius: '8px'}} />
                    <button type="button" onClick={() => {
                        setSettings({...settings, signature: ''});
                        setSigPreview(null);
                    }} style={{position: 'absolute', top: '-10px', right: '-10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer'}}>×</button>
                  </div>
                ) : (
                  <div onClick={() => document.getElementById('sig-upload').click()} style={{cursor: 'pointer'}}>
                    <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Click to upload Signature</p>
                    <p style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>(PNG/JPG, Max 2MB)</p>
                  </div>
                )}
                <input id="sig-upload" type="file" hidden accept="image/*" onChange={(e) => handleFileChange(e, 'signature')} />
              </div>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={saving}>
             <Save size={18} /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}
