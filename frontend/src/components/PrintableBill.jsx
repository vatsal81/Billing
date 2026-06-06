import React, { useEffect, useState, useRef } from 'react';
import { numberToWords } from '../utils/numberToWords';
import { useLanguage } from '../utils/LanguageContext';
import { fetchSettings } from '../utils/api';

export default function PrintableBill({ bill, settings: propSettings }) {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(propSettings || null);
  const [scale, setScale] = useState(1);
  const [layoutSize, setLayoutSize] = useState(() => {
    return localStorage.getItem('billLayoutSize') || 'A4';
  });
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (propSettings) {
      setSettings(propSettings);
    } else {
      fetchSettings().then(d => setSettings(d)).catch(e => console.log('Err settings', e));
    }
  }, [propSettings]);

  useEffect(() => {
    document.body.classList.add('bill-print-active');
    return () => {
      document.body.classList.remove('bill-print-active');
    };
  }, []);

  const getDimensions = () => {
    switch (layoutSize) {
      case 'A5':
        return { width: '148mm', minHeight: '195mm', borderMinHeight: '175mm', billWidthPx: 559 };
      case 'A6':
        return { width: '105mm', minHeight: '138mm', borderMinHeight: '122mm', billWidthPx: 397 };
      case 'A4':
      default:
        return { width: '210mm', minHeight: '280mm', borderMinHeight: '250mm', billWidthPx: 794 };
    }
  };

  const dims = getDimensions();
  const isA4 = layoutSize === 'A4';
  const isA5 = layoutSize === 'A5';
  const isA6 = layoutSize === 'A6';

  // Dynamic layout values
  const billPadding = isA4 ? '15px' : isA5 ? '10px' : '6px';
  const headerPadding = isA4 ? '8px' : isA5 ? '5px' : '3px';
  const cellPadding = isA4 ? '6px 8px' : isA5 ? '4px 6px' : '2px 4px';

  // Dynamic font sizes
  const titleFont = isA4 ? '28px' : isA5 ? '18px' : '13px';
  const subtitleFont = isA4 ? '14px' : isA5 ? '10px' : '8px';
  const addressFont = isA4 ? '14px' : isA5 ? '10px' : '8px';
  const sectionHeaderFont = isA4 ? '13px' : isA5 ? '10px' : '8px';
  const normalTextFont = isA4 ? '14px' : isA5 ? '10px' : '8px';
  const kalamTextFont = isA4 ? '16px' : isA5 ? '12px' : '9px';
  const totalWordsFont = isA4 ? '19px' : isA5 ? '14px' : '10px';
  const signatoryTitleFont = isA4 ? '12px' : isA5 ? '9px' : '7px';
  const stampFont = isA4 ? '11px' : isA5 ? '9px' : '7px';
  const tableHeaderFont = isA4 ? '14px' : isA5 ? '10px' : '8px';

  // Filler rows & signature heights
  const fillerRowsCount = isA4 ? Math.max(0, 8 - bill.items.length) : isA5 ? Math.max(0, 4 - bill.items.length) : Math.max(0, 2 - bill.items.length);
  const signatureMinHeight = isA4 ? '100px' : isA5 ? '75px' : '55px';
  const signatureImgHeight = isA4 ? '50px' : isA5 ? '35px' : '25px';

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        const containerWidth = wrapperRef.current.offsetWidth - 40; // 20px padding on each side
        if (containerWidth < dims.billWidthPx) {
          setScale(containerWidth / dims.billWidthPx);
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
  }, [bill, settings, layoutSize]);

  if (!bill || !settings) return null;

  const getInvoiceNumberValue = () => {
    const inv = bill.invoiceNumber;
    if (!inv) return bill.serialNumber || 1;
    const match = inv.match(/\d+$/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (!isNaN(parsed)) return parsed;
    }
    const parsedAll = parseInt(inv.replace(/\D/g, ''), 10);
    if (!isNaN(parsedAll)) return parsedAll;
    return bill.serialNumber || 1;
  };

  const renderBookNo = () => {
    const val = getInvoiceNumberValue();
    const book = Math.floor((val - 1) / 100) + 1;
    return String(book).padStart(2, '0');
  };

  const renderBillNo = () => {
    const val = getInvoiceNumberValue();
    const num = ((val - 1) % 100) + 1;
    return String(num).padStart(3, '0');
  };

  const finalTotal = bill.actualTotal || bill.targetAmount || 0;

  const originalSubtotal = bill.items ? bill.items.reduce((sum, item) => sum + (item.price * item.quantity * (item.meter || 1)), 0) : 0;

  let discountValue = 0;
  if (bill.discountType === 'percentage') {
    discountValue = originalSubtotal * ((bill.discountAmount || 0) / 100);
  } else if (bill.discountType === 'flat') {
    discountValue = bill.discountAmount || 0;
  }

  const discountedSubtotal = originalSubtotal - discountValue;
  const gstAmount = (bill.cgst || 0) + (bill.sgst || 0);
  const totalWithGst = discountedSubtotal + gstAmount;

  return (
    <div id="printable-bill-wrapper" ref={wrapperRef} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 0',
      width: '100%',
      overflow: 'hidden'
    }}>
      {/* Dynamic Layout Selector */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '6px 12px',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        width: 'fit-content'
      }}>
        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print Layout:</span>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.15)', padding: '3px', borderRadius: '15px' }}>
          {['A4', 'A5', 'A6'].map(size => (
            <button
              key={size}
              onClick={() => {
                setLayoutSize(size);
                localStorage.setItem('billLayoutSize', size);
              }}
              style={{
                padding: '4px 14px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                background: layoutSize === size ? 'var(--accent-gradient)' : 'transparent',
                color: layoutSize === size ? 'white' : 'var(--text-secondary)',
                transition: 'var(--transition)'
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div id="printable-bill" style={{
        width: dims.width,
        minHeight: dims.minHeight,
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        background: '#eedd82',
        color: 'black',
        padding: billPadding,
        fontFamily: 'arial, sans-serif',
        boxSizing: 'border-box',
        overflow: 'hidden',
        marginBottom: `calc(-${dims.minHeight} * (1 - ${scale}))` // Offset the height gap from scaling
      }}>
        <div style={{ border: '2px solid #000', display: 'flex', flexDirection: 'column', minHeight: dims.borderMinHeight, overflow: 'hidden' }}>

          {/* Top Header */}
          <div style={{ display: 'flex', borderBottom: '2px solid #000' }}>
            <div style={{ width: '35%', flex: '0 0 35%', borderRight: '2px solid #000', padding: headerPadding, fontSize: sectionHeaderFont, lineHeight: '1.4', boxSizing: 'border-box' }}>
              <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: isA6 ? '4px' : '8px' }}>
                {bill.billType === 'return' ? 'CREDIT NOTE / RETURN' : t('taxInvoice')}<br />
                {bill.paymentMode === 'online' ? 'ONLINE / GPAY' : (bill.paymentMode === 'credit' ? 'UDHAAR / CREDIT' : 'CASH')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isA6 ? '3px' : '6px' }}>
                <span>{t('original')}</span>
                <span>{t('duplicate')}</span>
              </div>
              <div style={{ fontWeight: 'bold' }}>GSTIN - {settings.gstin || '24BRNPM8073Q1ZU'}</div>
              <div>{settings.stateInfo || 'State : Gujarat    Code : 24'}</div>
              {settings.logo && (
                <div style={{ marginTop: isA6 ? '4px' : '10px', textAlign: 'center' }}>
                  <img src={settings.logo} alt="Logo" style={{ maxHeight: isA4 ? '60px' : isA5 ? '40px' : '25px', maxWidth: '100%' }} />
                </div>
              )}
            </div>
            <div style={{ width: '65%', flex: '0 0 65%', padding: `${isA4 ? '10px' : isA5 ? '6px' : '4px'} 8px`, textAlign: 'center', boxSizing: 'border-box' }}>
              <h1 style={{ fontSize: titleFont, margin: `0 0 ${isA6 ? '2px' : '4px'} 0`, color: '#002060', fontWeight: 'bold' }}>{settings.shopName || t('shopName')}</h1>
              <p style={{ fontSize: subtitleFont, margin: '0', fontWeight: '600' }}>{settings.shopSubTitle || t('shopSubTitle')}</p>
              <p style={{ fontSize: addressFont, margin: `0 0 ${isA6 ? '2px' : '4px'} 0`, fontWeight: '600', whiteSpace: 'pre-wrap' }}>{settings.shopAddress || t('shopAddress')}</p>
            </div>
          </div>

          {/* Customer & Bill Details */}
          <div style={{ display: 'flex', borderBottom: '2px solid #000' }}>
            <div style={{ width: '68%', flex: '0 0 68%', borderRight: '2px solid #000', padding: headerPadding, fontSize: normalTextFont, lineHeight: '1.8', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ minWidth: isA6 ? '25px' : '40px', fontWeight: 'bold' }}>{t('me_slash_name')} </div>
                <div style={{ borderBottom: '1px dotted #000', flex: 1, fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: kalamTextFont, paddingLeft: '8px' }}>{bill.customerName}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '4px' }}>
                <div style={{ minWidth: isA6 ? '40px' : '60px', fontWeight: 'bold' }}>{t('addressLabel')}</div>
                <div style={{ borderBottom: '1px dotted #000', flex: 1, fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: kalamTextFont, paddingLeft: '8px' }}>{bill.customerAddress}</div>
              </div>
              <div style={{ display: 'flex', marginTop: '8px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                <div style={{ minWidth: isA6 ? '40px' : '60px', fontWeight: 'bold' }}>{t('gstinLabel')}</div>
                <div style={{ flex: 1 }}></div>
                <div style={{ minWidth: isA6 ? '40px' : '60px', fontWeight: 'bold' }}>{t('stateLabel')}</div>
                <div style={{ flex: 1 }}></div>
                <div style={{ minWidth: isA6 ? '40px' : '60px', fontWeight: 'bold' }}>{t('codeLabel')}</div>
                <div style={{ flex: 2 }}></div>
              </div>
            </div>
            <div style={{ width: '32%', flex: '0 0 32%', fontSize: normalTextFont, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', padding: `${isA4 ? '6px' : isA5 ? '4px' : '3px'} 8px`, borderBottom: '1px solid #000' }}>
                <span style={{ width: isA6 ? '45px' : '70px', fontWeight: 'bold', flexShrink: 0 }}>{t('bookNo')} </span> <span style={{ color: '#c00', fontWeight: 'bold' }}>{renderBookNo()}</span>
              </div>
              <div style={{ display: 'flex', padding: `${isA4 ? '6px' : isA5 ? '4px' : '3px'} 8px`, borderBottom: '1px solid #000' }}>
                <span style={{ width: isA6 ? '45px' : '70px', fontWeight: 'bold', flexShrink: 0 }}>{t('billNo')} </span> <span style={{ color: '#c00', fontWeight: 'bold' }}>{renderBillNo()}</span>
              </div>
              <div style={{ display: 'flex', padding: `${isA4 ? '6px' : isA5 ? '4px' : '3px'} 8px` }}>
                <span style={{ width: isA6 ? '45px' : '70px', fontWeight: 'bold', flexShrink: 0 }}>{t('dateLabel')} </span> <span style={{ color: '#0f3c88', fontFamily: '"Kalam", cursive', fontSize: isA6 ? '10px' : isA5 ? '12px' : '15px' }}>{new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            {/* Table Header */}
            <div style={{
              borderBottom: '2px solid #000',
              fontSize: tableHeaderFont,
              fontWeight: 'bold',
              display: 'flex',
              width: '100%',
              textAlign: 'center'
            }}>
              <div style={{ padding: headerPadding, borderRight: '1px solid #000', width: '47%', flex: '0 0 47%', boxSizing: 'border-box' }}>{t('tableCol1')}</div>
              <div style={{ padding: headerPadding, borderRight: '1px solid #000', width: '11%', flex: '0 0 11%', boxSizing: 'border-box' }}>{t('tableCol2')}</div>
              <div style={{ padding: headerPadding, borderRight: '1px solid #000', width: '10%', flex: '0 0 10%', boxSizing: 'border-box' }}>Mtr/Pc</div>
              <div style={{ padding: headerPadding, borderRight: '1px solid #000', width: '7%', flex: '0 0 7%', boxSizing: 'border-box' }}>Qty</div>
              <div style={{ padding: headerPadding, borderRight: '2px solid #000', width: '10%', flex: '0 0 10%', boxSizing: 'border-box' }}>{t('tableCol4')}</div>
              <div style={{ padding: headerPadding, width: '15%', flex: '0 0 15%', boxSizing: 'border-box' }}>{t('tableCol5')}</div>
            </div>

            {/* Table Body */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              {bill.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', width: '100%', fontSize: kalamTextFont, fontFamily: '"Kalam", cursive', color: '#0f3c88' }}>
                  <div style={{ padding: cellPadding, borderRight: '1px solid #000', width: '47%', flex: '0 0 47%', boxSizing: 'border-box', textAlign: 'left' }}>{item.name}</div>
                  <div style={{ padding: cellPadding, borderRight: '1px solid #000', width: '11%', flex: '0 0 11%', boxSizing: 'border-box', textAlign: 'center' }}>{item.hsnCode || ''}</div>
                  <div style={{ padding: cellPadding, borderRight: '1px solid #000', width: '10%', flex: '0 0 10%', boxSizing: 'border-box', textAlign: 'center' }}>{item.meter || 1}</div>
                  <div style={{ padding: cellPadding, borderRight: '1px solid #000', width: '7%', flex: '0 0 7%', boxSizing: 'border-box', textAlign: 'center' }}>{item.quantity}</div>
                  <div style={{ padding: cellPadding, borderRight: '2px solid #000', width: '10%', flex: '0 0 10%', boxSizing: 'border-box', textAlign: 'right' }}>{item.price.toFixed(0)}</div>
                  <div style={{ padding: cellPadding, width: '15%', flex: '0 0 15%', boxSizing: 'border-box', textAlign: 'right' }}>{(item.price * item.quantity * (item.meter || 1)).toFixed(0)}</div>
                </div>
              ))}

              {/* Filler rows to stretch the table */}
              {Array.from({ length: fillerRowsCount }).map((_, i) => (
                <div key={`empty-${i}`} style={{ display: 'flex', width: '100%', flexGrow: i === 0 ? 1 : 0 }}>
                  <div style={{ padding: isA4 ? '12px' : isA5 ? '8px' : '4px', borderRight: '1px solid #000', width: '47%', flex: '0 0 47%', boxSizing: 'border-box' }}>&nbsp;</div>
                  <div style={{ borderRight: '1px solid #000', width: '11%', flex: '0 0 11%', boxSizing: 'border-box' }}></div>
                  <div style={{ borderRight: '1px solid #000', width: '10%', flex: '0 0 10%', boxSizing: 'border-box' }}></div>
                  <div style={{ borderRight: '1px solid #000', width: '7%', flex: '0 0 7%', boxSizing: 'border-box' }}></div>
                  <div style={{ borderRight: '2px solid #000', width: '10%', flex: '0 0 10%', boxSizing: 'border-box' }}></div>
                  <div style={{ width: '15%', flex: '0 0 15%', boxSizing: 'border-box' }}></div>
                </div>
              ))}

              {/* Total Qty Row */}
              <div style={{ display: 'flex', width: '100%', borderTop: '2px solid #000', background: 'rgba(0,0,0,0.04)' }}>
                <div style={{ padding: `${isA4 ? '5px' : '3px'} 8px`, borderRight: '1px solid #000', width: '47%', flex: '0 0 47%', boxSizing: 'border-box', fontWeight: 'bold', fontSize: normalTextFont, textAlign: 'right', color: '#000' }}>Total Qty</div>
                <div style={{ borderRight: '1px solid #000', width: '11%', flex: '0 0 11%', boxSizing: 'border-box' }}></div>
                <div style={{ padding: `${isA4 ? '5px' : '3px'} 8px`, borderRight: '1px solid #000', width: '10%', flex: '0 0 10%', boxSizing: 'border-box', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: kalamTextFont, fontWeight: 'bold', textAlign: 'center' }}>
                  {bill.items.reduce((sum, item) => sum + ((Number(item.meter) || 1) * (Number(item.quantity) || 0)), 0).toFixed(1)}
                </div>
                <div style={{ padding: `${isA4 ? '5px' : '3px'} 8px`, borderRight: '1px solid #000', width: '7%', flex: '0 0 7%', boxSizing: 'border-box', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: kalamTextFont, fontWeight: 'bold', textAlign: 'center' }}>
                  {bill.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
                </div>
                <div style={{ borderRight: '2px solid #000', width: '10%', flex: '0 0 10%', boxSizing: 'border-box' }}></div>
                <div style={{ width: '15%', flex: '0 0 15%', boxSizing: 'border-box' }}></div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', borderTop: '2px solid #000', marginTop: 'auto' }}>
            <div style={{ width: '68%', flex: '0 0 68%', borderRight: '2px solid #000', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', overflow: 'hidden' }}>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '5px' }}>
                {/* Decorative GPay text - Only show for online payments */}
                {bill.paymentMode === 'online' && !isA6 && (
                  <div style={{ position: 'absolute', top: isA5 ? '0px' : '0px', right: '15px', fontFamily: '"Kalam", cursive', fontSize: isA5 ? '24px' : '32px', color: '#0f3c88', opacity: 0.15, transform: 'rotate(-10deg)', zIndex: 0 }}>
                    GPay
                  </div>
                )}

                <div style={{ fontSize: isA6 ? '8px' : '10px', fontWeight: 'bold', marginBottom: '2px', position: 'relative', zIndex: 1, color: '#666' }}>Total Amount in Words:</div>
                <div style={{ fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: totalWordsFont, borderBottom: '1px dotted rgba(0,0,0,0.3)', paddingBottom: '4px', paddingLeft: '0', position: 'relative', zIndex: 1, width: 'calc(100% + 16px)', marginLeft: '-8px', boxSizing: 'border-box' }}>
                  {numberToWords(finalTotal)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginTop: isA6 ? '4px' : isA5 ? '15px' : '25px', borderBottom: '1px solid #000', borderTop: '1px solid #000', padding: '4px 0', paddingLeft: '16px', width: 'calc(100% + 16px)', marginLeft: '-8px', boxSizing: 'border-box' }}>
                  <span style={{ fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: isA6 ? '11px' : isA5 ? '15px' : '20px' }}>₹ {finalTotal}/- only</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '10px 0' }}>
                <div style={{ fontSize: isA6 ? '7px' : isA5 ? '9px' : '11px', fontWeight: 'bold', lineHeight: '1.6' }}>
                  {t('termsLabel')}<br />
                  {settings.terms1 || t('terms1')}<br />
                  {settings.terms2 || t('terms2')}
                </div>
                {!isA6 && (
                  <div style={{ fontFamily: '"Kalam", cursive', fontSize: isA5 ? '13px' : '18px', color: '#0f3c88', opacity: 0.8, paddingRight: isA5 ? '10px' : '40px' }}>
                    Thank You - Visit Again!
                  </div>
                )}
              </div>
            </div>

            <div style={{ width: '32%', flex: '0 0 32%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '4px 8px' }}>
                <span style={{ flex: '0 0 65%', fontWeight: 'bold', fontSize: isA4 ? '13px' : normalTextFont, overflow: 'hidden' }}>{t('subtotal')}</span>
                <span style={{ flex: '0 0 35%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: isA4 ? '15px' : kalamTextFont }}>{originalSubtotal.toFixed(2)}</span>
              </div>
              {discountValue > 0 && (
                <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '4px 8px' }}>
                  <span style={{ flex: '0 0 65%', fontWeight: 'bold', fontSize: isA4 ? '13px' : normalTextFont, overflow: 'hidden' }}>Discount ({bill.discountType === 'percentage' ? `${bill.discountAmount}%` : 'Flat'})</span>
                  <span style={{ flex: '0 0 35%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#e11d48', fontSize: isA4 ? '15px' : kalamTextFont }}>-{discountValue.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '4px 8px' }}>
                <span style={{ flex: '0 0 65%', fontWeight: 'bold', fontSize: isA4 ? '13px' : normalTextFont }}>{t('cgst')}</span>
                <span style={{ flex: '0 0 35%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: isA4 ? '15px' : kalamTextFont }}>{(bill.cgst || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '4px 8px' }}>
                <span style={{ flex: '0 0 65%', fontWeight: 'bold', fontSize: isA4 ? '13px' : normalTextFont }}>{t('sgst')}</span>
                <span style={{ flex: '0 0 35%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: isA4 ? '15px' : kalamTextFont }}>{(bill.sgst || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '4px 8px' }}>
                <span style={{ flex: '0 0 65%', fontWeight: 'bold', fontSize: isA4 ? '13px' : normalTextFont }}>Total (with GST)</span>
                <span style={{ flex: '0 0 35%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: isA4 ? '15px' : kalamTextFont }}>{totalWithGst.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', borderBottom: '2px solid #000', padding: '4px 8px' }}>
                <span style={{ flex: '0 0 65%', fontWeight: 'bold', fontSize: isA4 ? '13px' : normalTextFont }}>{t('roundOff')}</span>
                <span style={{ flex: '0 0 35%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: isA4 ? '15px' : kalamTextFont }}>{(bill.roundOff > 0 ? '+' : '')}{(bill.roundOff || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', padding: '8px', alignItems: 'center' }}>
                <span style={{ flex: '0 0 50%', fontWeight: 'bold', fontSize: isA6 ? '11px' : isA5 ? '13px' : '16px' }}>Final Amount</span>
                <span style={{ flex: '0 0 50%', textAlign: 'right', fontFamily: '"Kalam", cursive', color: '#0f3c88', fontSize: isA6 ? '12px' : isA5 ? '15px' : '24px', fontWeight: 'bold' }}>{finalTotal.toFixed(0)}/-</span>
              </div>

              {/* Stamp & Signature Section */}
              <div style={{ borderTop: '2px solid #000', padding: '8px', textAlign: 'center', minHeight: signatureMinHeight, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
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
                  fontSize: stampFont,
                  zIndex: 0,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap'
                }}>
                  {settings.stampName || 'SHREE HARI DRESSES & CUTPIS'}
                </div>

                <div style={{ height: signatureImgHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  {settings.signature && (
                    <img src={settings.signature} alt="Signature" style={{ maxHeight: signatureImgHeight }} />
                  )}
                </div>

                <div style={{ fontWeight: 'bold', fontSize: signatoryTitleFont, zIndex: 1, borderTop: '1px solid rgba(0,0,0,0.3)', width: '85%', paddingTop: '4px' }}>
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
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
          /* Hide scrollbars globally during printing */
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          ::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          @page {
            size: ${layoutSize === 'A4' ? 'A4 portrait' : layoutSize === 'A5' ? 'A5 portrait' : 'A6 portrait'};
            margin: ${layoutSize === 'A6' ? '3mm' : '5mm'};
          }
          .stamp-animation {
            animation: none !important;
            opacity: 0.7 !important;
            transform: translate(-50%, -50%) rotate(-5deg) scale(1) !important;
          }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          
          /* Hide non-essential layout items when bill is printing */
          .no-print,
          #sidebar,
          .sidebar,
          .mobile-header,
          .bottom-nav {
            display: none !important;
          }

          /* Hide other app components under the main app container */
          body.bill-print-active .app-container > *:not(.main-content) {
            display: none !important;
          }

          /* Clear main content layout restrictions */
          body.bill-print-active .main-content {
            padding: 0 !important;
            margin: 0 !important;
            background: none !important;
            background-color: transparent !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }

          /* Hide all page components that are siblings of the print modal overlay or bill wrapper */
          body.bill-print-active .main-content > div > *:not(.print-modal-overlay):not(#printable-bill-wrapper) {
            display: none !important;
          }

          /* Reset print modal overlays to behave as transparent wrappers */
          body.bill-print-active .print-modal-overlay {
            position: static !important;
            background: none !important;
            background-color: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            box-shadow: none !important;
          }

          #printable-bill-wrapper {
             padding: 0 !important;
             margin: 0 !important;
             width: 100% !important;
             max-width: 100% !important;
             display: block !important;
             overflow: visible !important;
             height: auto !important;
          }
          #printable-bill {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            width: 100% !important;
            max-width: 100% !important;
            transform: none !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          /* Force hide overflow scroll on modal wrappers */
          .modal-content, 
          .modal-overlay, 
          .main-content, 
          .page-container, 
          .app-container {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
          }
        }
      `}} />
    </div>
  );
}