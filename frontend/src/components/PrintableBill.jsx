import React, { useEffect, useState, useRef } from 'react';
import { numberToWords } from '../utils/numberToWords';
import { useLanguage } from '../utils/LanguageContext';
import { fetchSettings } from '../utils/api';

export default function PrintableBill({ bill }) {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [scale, setScale] = useState(1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    fetchSettings().then(d => setSettings(d)).catch(e => console.log('Err settings', e));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        const containerWidth = wrapperRef.current.offsetWidth - 40; // 20px padding on each side
        const billWidth = 794; // 210mm in pixels (96dpi)
        if (containerWidth < billWidth) {
          setScale(containerWidth / billWidth);
        } else {
          setScale(1);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    // Initial delay to ensure offsetWidth is captured correctly after fade-in
    const timeout = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [bill, settings]);

  if (!bill || !settings) return null;

  const renderBookNo = () => {
    if (!bill.serialNumber) return "05"; // fallback for older bills
    const book = Math.floor((bill.serialNumber - 1) / 100) + 1;
    return String(book).padStart(2, '0');
  };

  const renderBillNo = () => {
    if (!bill.serialNumber) {
      return bill._id.substring(bill._id.length - 4).toUpperCase();
    }
    const num = ((bill.serialNumber - 1) % 100) + 1;
    return String(num).padStart(3, '0');
  };

  const finalTotal = bill.actualTotal || bill.targetAmount || 0;

  return (
    <div id="printable-bill-wrapper" ref={wrapperRef} style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '20px 0',
      width: '100%',
      overflow: 'hidden'
    }}>
      <div id="printable-bill" style={{
        width: '210mm', 
        minHeight: '200mm',
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        background: '#eedd82', 
        color: 'black',
        padding: '15px',
        fontFamily: 'arial, sans-serif',
        marginBottom: `calc(-200mm * (1 - ${scale}))` // Offset the height gap from scaling
      }}>
        <div style={{ border: '2px solid #000', display: 'flex', flexDirection: 'column', minHeight: '180mm' }}>
          
          {/* Top Header */}
          <div style={{display: 'flex', borderBottom: '2px solid #000'}}>
            <div style={{width: '35%', borderRight: '2px solid #000', padding: '8px', fontSize: '13px', lineHeight: '1.4'}}>
              <div style={{textAlign: 'center', fontWeight: 'bold', marginBottom: '8px'}}>
                {bill.billType === 'return' ? 'CREDIT NOTE / RETURN' : t('taxInvoice')}<br/>
                {bill.paymentMode === 'online' ? 'ONLINE / GPAY' : (bill.paymentMode === 'credit' ? 'UDHAAR / CREDIT' : 'CASH')}
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                <span>{t('original')}</span>
                <span>{t('duplicate')}</span>
              </div>
              <div style={{fontWeight: 'bold'}}>GSTIN - {settings.gstin || '24BRNPM8073Q1ZU'}</div>
              <div>{settings.stateInfo || 'State : Gujarat    Code : 24'}</div>
              {settings.logo && (
                <div style={{marginTop: '10px', textAlign: 'center'}}>
                  <img src={settings.logo} alt="Logo" style={{maxHeight: '60px', maxWidth: '100%'}} />
                </div>
              )}
            </div>
            <div style={{width: '65%', padding: '10px 8px', textAlign: 'center'}}>
              <h1 style={{fontSize: '28px', margin: '0 0 4px 0', color: '#002060', fontWeight: 'bold'}}>{settings.shopName || t('shopName')}</h1>
              <p style={{fontSize: '14px', margin: '0', fontWeight: '600'}}>{settings.shopSubTitle || t('shopSubTitle')}</p>
              <p style={{fontSize: '14px', margin: '0 0 4px 0', fontWeight: '600', whiteSpace: 'pre-wrap'}}>{settings.shopAddress || t('shopAddress')}</p>
            </div>
          </div>

          {/* Customer & Bill Details */}
          <div style={{display: 'flex', borderBottom: '2px solid #000'}}>
              <div style={{width: '68%', borderRight: '2px solid #000', padding: '6px', fontSize: '14px', lineHeight: '1.8'}}>
                <div style={{display: 'flex', alignItems: 'flex-end'}}>
                  <div style={{minWidth: '40px', fontWeight: 'bold'}}>{t('me_slash_name')} </div>
                  <div style={{borderBottom: '1px dotted #000', flex: 1, fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: '16px', paddingLeft: '8px'}}>{bill.customerName}</div>
                </div>
                <div style={{display: 'flex', alignItems: 'flex-end', marginTop: '4px'}}>
                  <div style={{minWidth: '60px', fontWeight: 'bold'}}>{t('addressLabel')}</div>
                  <div style={{borderBottom: '1px dotted #000', flex: 1, fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: '16px', paddingLeft: '8px'}}>{bill.customerAddress}</div>
                </div>
                <div style={{display: 'flex', marginTop: '8px', borderTop: '1px solid #000', paddingTop: '4px'}}>
                  <div style={{minWidth: '60px', fontWeight: 'bold'}}>{t('gstinLabel')}</div>
                  <div style={{flex: 1}}></div>
                  <div style={{minWidth: '60px', fontWeight: 'bold'}}>{t('stateLabel')}</div>
                  <div style={{flex: 1}}></div>
                  <div style={{minWidth: '60px', fontWeight: 'bold'}}>{t('codeLabel')}</div>
                  <div style={{flex: 2}}></div>
                </div>
              </div>
              <div style={{width: '32%', fontSize: '14px'}}>
                <div style={{display: 'flex', padding: '6px 8px', borderBottom: '1px solid #000'}}>
                  <span style={{width: '70px', fontWeight: 'bold'}}>{t('bookNo')} </span> <span style={{color: '#c00', fontWeight: 'bold'}}>{renderBookNo()}</span>
                </div>
                <div style={{display: 'flex', padding: '6px 8px', borderBottom: '1px solid #000'}}>
                  <span style={{width: '70px', fontWeight: 'bold'}}>{t('billNo')} </span> <span style={{color: '#c00', fontWeight: 'bold'}}>{renderBillNo()}</span>
                </div>
                <div style={{display: 'flex', padding: '6px 8px'}}>
                  <span style={{width: '70px', fontWeight: 'bold'}}>{t('dateLabel')} </span> <span style={{color: '#0f3c88', fontFamily: '"Kalam", cursive', fontSize: '15px'}}>{new Date(bill.createdAt).toLocaleDateString('en-IN', {day: '2-digit', month: '2-digit', year: '2-digit'}).replace(/\//g, '-')}</span>
                </div>
              </div>
          </div>

          {/* Table */}
          <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column'}}>
            <thead>
              <tr style={{borderBottom: '2px solid #000', fontSize: '14px', fontWeight: 'bold', display: 'flex', width: '100%'}}>
                <th style={{padding: '8px', borderRight: '1px solid #000', width: '35%'}}>{t('tableCol1')}</th>
                <th style={{padding: '8px', borderRight: '1px solid #000', width: '15%'}}>{t('tableCol2')}</th>
                <th style={{padding: '8px', borderRight: '1px solid #000', width: '10%'}}>Mtr</th>
                <th style={{padding: '8px', borderRight: '1px solid #000', width: '10%'}}>{t('tableCol3')}</th>
                <th style={{padding: '8px', borderRight: '2px solid #000', width: '12%'}}>{t('tableCol4')}</th>
                <th style={{padding: '8px', width: '18%'}}>{t('tableCol5')}</th>
              </tr>
            </thead>
            <tbody style={{flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%'}}>
              {bill.items.map((item, idx) => (
                <tr key={idx} style={{display: 'flex', width: '100%', fontSize: '16px', fontFamily: '"Kalam", cursive', color: '#0f3c88'}}>
                  <td style={{padding: '6px 8px', borderRight: '1px solid #000', width: '35%', textAlign: 'left'}}>{item.name}</td>
                  <td style={{padding: '6px 8px', borderRight: '1px solid #000', width: '15%', textAlign: 'center'}}>{item.hsnCode || ''}</td>
                  <td style={{padding: '6px 8px', borderRight: '1px solid #000', width: '10%', textAlign: 'center'}}>{item.meter || '-'}</td>
                  <td style={{padding: '6px 8px', borderRight: '1px solid #000', width: '10%'}}>{item.quantity}</td>
                  <td style={{padding: '6px 8px', borderRight: '2px solid #000', width: '12%', textAlign: 'right'}}>{item.price.toFixed(0)}</td>
                  <td style={{padding: '6px 8px', width: '18%', textAlign: 'right'}}>{(item.price * item.quantity * (item.meter || 1)).toFixed(0)}</td>
                </tr>
              ))}
              
              {/* Filler rows to stretch the table */}
              {Array.from({length: Math.max(1, 8 - bill.items.length)}).map((_, i) => (
                 <tr key={`empty-${i}`} style={{display: 'flex', width: '100%', flexGrow: i === 0 ? 1 : 0}}>
                   <td style={{padding: '12px', borderRight: '1px solid #000', width: '35%'}}>&nbsp;</td>
                   <td style={{borderRight: '1px solid #000', width: '15%'}}></td>
                   <td style={{borderRight: '1px solid #000', width: '10%'}}></td>
                   <td style={{borderRight: '1px solid #000', width: '10%'}}></td>
                   <td style={{borderRight: '2px solid #000', width: '12%'}}></td>
                   <td style={{width: '18%'}}></td>
                 </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{display: 'flex', borderTop: '2px solid #000', marginTop: 'auto'}}>
              <div style={{width: '68%', borderRight: '2px solid #000', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                 <div style={{position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '5px'}}>
                   {/* Decorative GPay text - Only show for online payments */}
                   {bill.paymentMode === 'online' && (
                     <div style={{position: 'absolute', top: '45px', left: '10px', fontFamily: '"Kalam", cursive', fontSize: '32px', color: '#0f3c88', opacity: 0.2, transform: 'rotate(-10deg)', zIndex: 0}}>
                       GPay
                     </div>
                   )}

                   <div style={{fontSize: '10px', fontWeight: 'bold', marginBottom: '2px', position: 'relative', zIndex: 1, color: '#666'}}>Total Amount in Words:</div>
                   <div style={{fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: '13px', borderBottom: '1px dotted rgba(0,0,0,0.1)', paddingBottom: '4px', position: 'relative', zIndex: 1, width: '95%'}}>
                      {numberToWords(finalTotal)}
                   </div>
                   
                   <div style={{display: 'flex', alignItems: 'center', marginTop: '55px', borderBottom: '1px solid #000', borderTop: '1px solid #000', padding: '4px 0', width: '85%'}}>
                     <span style={{fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: '20px'}}>{finalTotal}-only</span>
                   </div>
                 </div>
                 
                 <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '10px 0'}}>
                   <div style={{fontSize: '11px', fontWeight: 'bold', lineHeight: '1.6'}}>
                     {t('termsLabel')}<br/>
                     {settings.terms1 || t('terms1')}<br/>
                     {settings.terms2 || t('terms2')}
                   </div>
                   <div style={{fontFamily: '"Kalam", cursive', fontSize: '18px', color: '#0f3c88', opacity: 0.8, paddingRight: '40px'}}>
                     Thank You - Visit Again!
                   </div>
                 </div>
              </div>

              <div style={{width: '32%'}}>
                <div style={{display: 'flex', borderBottom: '1px solid #000', padding: '4px 8px'}}>
                  <span style={{width: '65%', fontWeight: 'bold', fontSize: '13px'}}>{t('subtotal')}</span>
                  <span style={{width: '35%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: '15px'}}>{bill.totalAmount?.toFixed(2) || (finalTotal * 0.9523).toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', borderBottom: '1px solid #000', padding: '4px 8px'}}>
                  <span style={{width: '65%', fontWeight: 'bold', fontSize: '13px'}}>{t('cgst')}</span>
                  <span style={{width: '35%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: '15px'}}>{bill.cgst?.toFixed(2) || ((finalTotal * 0.9523) * 0.025).toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', borderBottom: '1px solid #000', padding: '4px 8px'}}>
                  <span style={{width: '65%', fontWeight: 'bold', fontSize: '13px'}}>{t('sgst')}</span>
                  <span style={{width: '35%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: '15px'}}>{bill.sgst?.toFixed(2) || ((finalTotal * 0.9523) * 0.025).toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', borderBottom: '1px solid #000', padding: '4px 8px'}}>
                  <span style={{width: '65%', fontWeight: 'bold', fontSize: '13px'}}>{t('igst')}</span>
                  <span style={{width: '35%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: '15px'}}></span>
                </div>
                <div style={{display: 'flex', borderBottom: '2px solid #000', padding: '4px 8px'}}>
                  <span style={{width: '65%', fontWeight: 'bold', fontSize: '13px'}}>{t('roundOff')}</span>
                  <span style={{width: '35%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: '15px'}}>{(bill.roundOff > 0 ? '+' : '')}{(bill.roundOff || 0).toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', padding: '8px'}}>
                  <span style={{width: '50%', fontWeight: 'bold', fontSize: '16px'}}>{t('total')}</span>
                  <span style={{width: '50%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: '18px', fontWeight: 'bold'}}>{finalTotal.toFixed(0)}/-</span>
                </div>
                
                {/* Stamp & Signature Section */}
                <div style={{borderTop: '2px solid #000', padding: '8px', textAlign: 'center', minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', position: 'relative'}}>
                   {/* The requested Stamp */}
                   <div className="stamp-animation" style={{
                     position: 'absolute',
                     top: '40%',
                     left: '50%',
                     transform: 'translate(-50%, -50%) rotate(-5deg)',
                     color: '#0f3c88',
                     border: '2px dotted #0f3c88',
                     borderRadius: '8px',
                     padding: '4px 10px',
                     opacity: 0.7,
                     background: 'rgba(238, 221, 130, 0.4)',
                     fontWeight: 'bold',
                     fontSize: '11px',
                     zIndex: 0,
                     pointerEvents: 'none',
                     whiteSpace: 'nowrap'
                   }}>
                     {settings.stampName || 'SHREE HARI DRESSES & CUTPIS'}
                   </div>

                   <div style={{height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1}}>
                    {settings.signature && (
                      <img src={settings.signature} alt="Signature" style={{maxHeight: '50px'}} />
                    )}
                   </div>
                   
                   <div style={{fontWeight: 'bold', fontSize: '12px', zIndex: 1, borderTop: '1px solid rgba(0,0,0,0.3)', width: '85%', paddingTop: '4px'}}>
                     Authorized Signatory
                   </div>
                </div>
              </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap');
        
        .stamp-animation {
          animation: stampSlam 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes stampSlam {
          0% { 
            transform: translate(-50%, -50%) rotate(-25deg) scale(4); 
            opacity: 0; 
            filter: blur(10px);
          }
          100% { 
            transform: translate(-50%, -50%) rotate(-5deg) scale(1); 
            opacity: 0.7; 
            filter: blur(0);
          }
        }

        @media print {
          .stamp-animation {
            animation: none !important;
            opacity: 0.7 !important;
            transform: translate(-50%, -50%) rotate(-5deg) scale(1) !important;
          }
          html, body {
            background: white !important;
          }
          #sidebar, .sidebar { display: none !important; }
          .no-print { display: none !important; }
          #printable-bill-wrapper {
             padding: 0 !important;
          }
          #printable-bill {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
}
