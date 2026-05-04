import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCustomers } from '../utils/api';
import { CheckCircle2, ShieldCheck, ArrowLeft, Smartphone, CreditCard, HelpCircle } from 'lucide-react';

export default function PaymentView() {
    const { customerId, amount } = useParams();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const customers = await fetchCustomers();
                const found = customers.find(c => c._id === customerId);
                setCustomer(found);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [customerId]);

    if (loading) return <div className="loader-container"><div className="loader" /></div>;
    if (!customer) return <div style={{ padding: '40px', textAlign: 'center' }}><h2>Invalid Payment Link</h2><Link to="/" className="btn btn-primary">Go Home</Link></div>;

    const upiId = "9979105580@okbizaxis"; 
    const shopName = "Shree Hari Dresses & Cutpiece";
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiLink)}`;

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: '#0f172a',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: window.innerWidth < 768 ? '12px' : '20px',
            overflow: 'hidden',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Animated Background Mesh - Brand Aligned Blue */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                left: '-10%',
                width: '60%',
                height: '60%',
                background: 'radial-gradient(circle, rgba(3, 105, 161, 0.15) 0%, rgba(3, 105, 161, 0) 70%)',
                filter: 'blur(80px)',
                animation: 'pulse 10s infinite alternate'
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-10%',
                right: '-10%',
                width: '50%',
                height: '50%',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0) 70%)',
                filter: 'blur(80px)',
                animation: 'pulse 8s infinite alternate-reverse'
            }} />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(1.1); opacity: 0.8; }
                }
                @keyframes qrPulse {
                    0% { box-shadow: 0 0 0 0 rgba(3, 105, 161, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(3, 105, 161, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(3, 105, 161, 0); }
                }
                .animate-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .glass-header {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                }
                .premium-card {
                    background: white;
                    border-radius: 32px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    position: relative;
                }
                .qr-container {
                    animation: qrPulse 2s infinite;
                }
            `}</style>

            {/* Premium Header */}
            <header className="glass-header animate-up" style={{ 
                width: '100%', 
                maxWidth: '400px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '8px 16px',
                marginBottom: '24px',
                marginTop: '6px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'white', padding: '4px 10px', borderRadius: '8px' }}>
                        <h1 style={{ margin: 0, fontSize: '0.95rem', color: '#0369a1', fontWeight: 800 }}>શ્રી હરિ</h1>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600 }}>
                    <ShieldCheck size={12} color="#10b981" /> Secure Portal
                </div>
            </header>

            {/* Main Payment Card */}
            <div className="premium-card animate-up" style={{ 
                width: '100%', 
                maxWidth: '400px', 
                padding: window.innerWidth < 768 ? '24px 20px' : '32px 28px', 
                textAlign: 'center',
                animationDelay: '0.1s'
            }}>
                <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '3px', background: 'linear-gradient(90deg, transparent, #0369a1, transparent)', borderRadius: '0 0 100px 100px' }} />
                
                <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(3, 105, 161, 0.05)', color: '#0369a1', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                    Payment Request
                </div>
                
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px', letterSpacing: '-0.01em' }}>{customer.name}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '20px' }}>{customer.phone}</div>

                <div style={{ 
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                    padding: '12px 20px', 
                    borderRadius: '20px', 
                    display: 'inline-flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '160px',
                    marginBottom: '24px',
                    border: '1px solid #f1f5f9'
                }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Amount Due</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#64748b' }}>₹</span>
                        <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>{Number(amount).toLocaleString('en-IN')}</span>
                    </div>
                </div>

                {/* QR Section */}
                <div className="qr-container" style={{ 
                    background: 'white', 
                    border: '1px solid #f1f5f9', 
                    padding: '12px', 
                    borderRadius: '24px', 
                    marginBottom: '24px',
                    display: 'inline-block',
                    boxShadow: '0 8px 12px -3px rgba(0,0,0,0.03)'
                }}>
                    <img src={qrUrl} alt="Payment QR" style={{ width: window.innerWidth < 768 ? '180px' : '220px', height: window.innerWidth < 768 ? '180px' : '220px', borderRadius: '12px' }} />
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" style={{ height: '12px' }} />
                        <div style={{ width: '1px', height: '10px', background: '#e2e8f0' }} />
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Scan to Pay Securely</div>
                    </div>
                </div>

                <a href={upiLink} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '10px', 
                    background: 'linear-gradient(135deg, #0369a1 0%, #075985 100%)', 
                    color: 'white', 
                    padding: '16px', 
                    borderRadius: '20px', 
                    textDecoration: 'none', 
                    fontSize: '1rem', 
                    fontWeight: 700,
                    boxShadow: '0 8px 15px -3px rgba(3, 105, 161, 0.4)',
                    marginBottom: '20px'
                }}>
                    <Smartphone size={18} /> Click to Pay Now
                </a>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', padding: '0' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#10b981', marginBottom: '4px' }}><CheckCircle2 size={20} style={{ margin: '0 auto' }} /></div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Secure</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#0369a1', marginBottom: '4px' }}><CreditCard size={20} style={{ margin: '0 auto' }} /></div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Instant</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#f59e0b', marginBottom: '4px' }}><ShieldCheck size={20} style={{ margin: '0 auto' }} /></div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Verified</div>
                    </div>
                </div>
            </div>

            {/* Footer Help */}
            <div className="animate-up" style={{ 
                marginTop: 'auto', 
                paddingBottom: '16px',
                textAlign: 'center', 
                color: 'rgba(255,255,255,0.3)', 
                fontSize: '0.75rem',
                animationDelay: '0.3s'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
                    <HelpCircle size={12} /> Need help? Contact the shop
                </div>
                <div style={{ fontWeight: 600 }}>© 2026 SHREE HARI DRESSES & CUTPIECE</div>
            </div>
        </div>
    );
}
