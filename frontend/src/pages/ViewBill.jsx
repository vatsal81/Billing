import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBillById, fetchSettings, getBackendUrl } from '../utils/api';
import PrintableBill from '../components/PrintableBill';
import { Download, ShoppingBag, CheckCircle, ExternalLink } from 'lucide-react';

const ViewBill = () => {
    const { id } = useParams();
    const [bill, setBill] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [billData, settingsData] = await Promise.all([
                    fetchBillById(id),
                    fetchSettings()
                ]);
                setBill(billData);
                setSettings(settingsData);
            } catch (err) {
                console.error('Error loading bill:', err);
                setError('Could not find this bill. Please check the link again.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    const handleDownloadPdf = () => {
        const pdfUrl = `${getBackendUrl()}/api/bills/${id}/pdf?download=true`;
        window.open(pdfUrl, '_blank');
    };

    if (loading) return (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', background: 'var(--bg-primary)'}}>
            <div className="animate-pulse" style={{width: '60px', height: '60px', borderRadius: '50%', border: '4px solid var(--accent-primary)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite'}}></div>
            <p style={{color: 'var(--text-secondary)'}}>Loading your bill...</p>
        </div>
    );

    if (error) return (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', padding: '20px', textAlign: 'center'}}>
            <div style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '20px', borderRadius: '50%'}}>
                <ExternalLink size={40} />
            </div>
            <h2 style={{color: 'var(--text-primary)'}}>{error}</h2>
            <p style={{color: 'var(--text-secondary)'}}>If you think this is a mistake, please contact the shop.</p>
        </div>
    );

    return (
        <div style={{background: 'var(--bg-primary)', minHeight: '100vh', padding: '20px 10px'}}>
            <div style={{maxWidth: '800px', margin: '0 auto'}}>
                {/* Public Header */}
                <header style={{textAlign: 'center', marginBottom: '30px'}} className="animate-fade-in">
                    <div style={{display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '8px 16px', borderRadius: '30px', marginBottom: '15px'}}>
                        <CheckCircle size={18} /> Verified Bill from {settings?.shopName || 'Shree Hari'}
                    </div>
                    <h1 className="text-gradient" style={{fontSize: '2rem', marginBottom: '10px'}}>Online Bill View</h1>
                    <p style={{color: 'var(--text-secondary)'}}>Thank you for your purchase! You can view and download your professional bill below.</p>
                </header>

                {/* Actions */}
                <div style={{display: 'flex', gap: '12px', marginBottom: '30px', justifyContent: 'center'}} className="animate-fade-in">
                    <button 
                        onClick={handleDownloadPdf}
                        className="btn btn-primary" 
                        style={{padding: '12px 24px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(var(--accent-primary-rgb), 0.3)'}}
                    >
                        <Download size={20} /> Download PDF Receipt
                    </button>
                </div>

                {/* Bill Display */}
                <div style={{display: 'flex', justifyContent: 'center', marginBottom: '40px'}} className="animate-fade-in">
                    <PrintableBill bill={bill} settings={settings} />
                </div>

                {/* Footer Message */}
                <footer style={{textAlign: 'center', padding: '40px 20px', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)'}}>
                    <ShoppingBag size={30} style={{marginBottom: '15px', opacity: 0.5}} />
                    <p style={{fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)'}}>{settings?.shopName || 'Shree Hari Dresses & Cutpiece'}</p>
                    <p style={{marginTop: '5px'}}>{settings?.shopSubTitle || 'Wholesale & Retail'}</p>
                    <p style={{marginTop: '5px', fontSize: '0.9rem'}}>{settings?.shopAddress}</p>
                    <p style={{marginTop: '20px', fontSize: '0.8rem'}}>This is an electronically generated document. No signature is required.</p>
                </footer>
            </div>
        </div>
    );
};

export default ViewBill;
