import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

const translations = {
  en: {
    // App / Sidebar
    appTitle: "Shree Hari",
    appSubtitle: "Dresses & Cutpis - POS",
    navManual: "Manual POS",
    navAuto: "Auto POS",
    navLedger: "Ledger",
    navInventory: "Inventory",
    sysStatus: "System Status",
    online: "Online",
    languageOptions: "Language",

    // Common
    customerName: "Customer Name",
    address: "City / Address",
    custNameAlt: "Customer Name (Optional)",
    custAddrAlt: "City/Address (Optional)",
    subtotal: "Sub Total",
    cgst: "CGST 2.5%",
    sgst: "SGST 2.5%",
    igst: "IGST %",
    roundOff: "Round Off",
    total: "Total",
    refresh: "Refresh",

    // Manual POS
    manualTitle: "Manual POS",
    manualSubtitle: "Add items manually and see live billing with GST calculation.",
    stockList: "Available Stock",
    yourBill: "Your Bill (Cart)",
    addBtn: "Add",
    cartEmpty: "Cart is empty",
    generateBillBtn: "Generate Bill",
    checkoutBtn: "Checkout & Generate Bill",
    searchCustPlaceholder: "Search customer by name or phone...",
    errLoading: "Error loading data.",

    // Auto POS
    autoTitle: "Auto POS",
    autoSubtitle: "Just enter the final cash amount, and the system automatically calculates taxes & subtotal.",
    generateNewBill: "Generate New Bill",
    finalTotalInput: "Final Total e.g. 4020",
    finalTotalHint: "Enter the final cash amount you want on the bill.",
    calculating: "Calculating Taxes & Items...",
    generateSmartBillBtn: "Generate Smart Bill",

    // Bills and Previews
    billGenerated: "Bill Generated Successfully!",
    newBillBtn: "New Bill",
    printBtn: "Print Invoice",

    // Physical Bill Details
    taxInvoice: "TAX INVOICE",
    cashDebit: "CASH / DEBIT",
    original: "Original :",
    duplicate: "Duplicate :",
    shopName: "SHREE HARI DRESSES & CUTPIS",
    shopSubTitle: "Madhav Park 1, Next to Shree Hari Complex,",
    shopAddress: "Behind Alap Royal Palm, Bapasitaram Chowk, Mavdi, Rajkot - 390 004.",
    me_slash_name: "To :",
    addressLabel: "Addr :",
    gstinLabel: "GSTIN :",
    stateLabel: "State : Gujarat",
    codeLabel: "Code : 24",
    bookNo: "Book No :",
    billNo: "Bill No :",
    dateLabel: "Date :",

    // Bill Table
    tableCol1: "Item Description",
    tableCol2: "HSN Code",
    tableCol3: "Qty/Mtr",
    tableCol4: "Rate",
    tableCol5: "Amount Rs.",
    only: "Only",

    termsLabel: "Terms & Conditions:",
    terms1: "1. Subject to Rajkot Jurisdiction.",
    terms2: "2. E. & O.E.",

    // Inventory
    invTitle: "Stock Management",
    invSubtitle: "Add or remove items from your stock inventory.",
    addNewItem: "Add New Item",
    itemName: "Item Name",
    priceInRs: "Price in ₹",
    addProductBtn: "Add Product",
    adding: "Adding...",
    currentStock: "Current Stock",
    noProducts: "No products found. Add some to get started!",
    loadingInv: "Loading inventory...",

    // History
    histTitle: "Ledger & Analytics",
    histSubtitle: "Track shop performance and view historical invoices.",
    totalRevenue: "Total Revenue",
    totalInvoices: "Total Invoices",
    avgBillValue: "Avg. Bill Value",
    recentReceipts: "Recent Receipts",
    dateCol: "Date",
    invoiceNumCol: "Invoice #",
    customerCol: "Customer",
    taxesGstCol: "Taxes (GST)",
    totalPaidCol: "Total Paid",
    noInvoices: "No invoices generated yet.",
    walkInCash: "Walk-in Cash"
  },
  gu: {
    // App / Sidebar
    appTitle: "શ્રી હરિ",
    appSubtitle: "ડ્રેસીસ & કટપીસ - POS",
    navManual: "મેન્યુઅલ બિલિંગ",
    navAuto: "ઓટો બિલિંગ",
    navLedger: "ખાતાવહી (Ledger)",
    navInventory: "સ્ટોક મેનેજમેન્ટ",
    sysStatus: "સિસ્ટમ સ્ટેટસ",
    online: "ચાલુ છે (Online)",
    languageOptions: "ભાષા (Language)",

    // Common
    customerName: "ગ્રાહકનું નામ",
    address: "એડ્રેસ",
    custNameAlt: "ગ્રાહકનું નામ",
    custAddrAlt: "શહેર/એડ્રેસ",
    subtotal: "સબટૉટલ (Subtotal)",
    cgst: "CGST 2.5%",
    sgst: "SGST 2.5%",
    igst: "IGST %",
    roundOff: "રાઉન્ડ ઓફ",
    total: "કુલ (Total)",
    refresh: "રિફ્રેશ કરો",

    // Manual POS
    manualTitle: "મેન્યુઅલ બિલિંગ (Manual POS)",
    manualSubtitle: "કસ્ટમરની પસંદગિ પરથી વસ્તુ ઉમેરો અને લાઈવ બિલ અને GST ગણતરી જુઓ.",
    stockList: "સ્ટોક યાદી",
    yourBill: "તમારું બિલ (Cart)",
    addBtn: "ઉમેરો (Add)",
    cartEmpty: "કાર્ટ ખાલી છે",
    generateBillBtn: "બિલ બનાવો (Generate)",
    checkoutBtn: "ચેકઆઉટ અને બિલ બનાવો",
    searchCustPlaceholder: "ગ્રાહકનું નામ અથવા નંબર સર્ચ કરો...",
    errLoading: "માહિતી મળવામાં ભૂલ.",

    // Auto POS
    autoTitle: "ઓટો બિલિંગ (Auto POS)",
    autoSubtitle: "ફક્ત ફાઈનલ અમાઉન્ટ નાખો અને સિસ્ટમ જાતે ટેક્સ અને સબટોટલ ગણીને બિલ બનાવશે.",
    generateNewBill: "નવું બિલ બનાવો",
    finalTotalInput: "આખરી રકમ ઉદા. 4020",
    finalTotalHint: "તમારે બિલમાં જે ફાઇનલ રકમ જોઇતી હોય તે નાખો.",
    calculating: "ગણતરી ચાલુ છે...",
    generateSmartBillBtn: "સ્માર્ટ બિલ બનાવો",

    // Bills and Previews
    billGenerated: "બિલ તૈયાર છે !",
    newBillBtn: "નવું બિલ (New)",
    printBtn: "બિલ પ્રિન્ટ કરો",

    // Physical Bill Details
    taxInvoice: "TAX INVOICE",
    cashDebit: "CASH / DEBIT",
    original: "Original :",
    duplicate: "Duplicate :",
    shopName: "શ્રી હરિ ડ્રેસીસ & કટપીસ",
    shopSubTitle: "માધવ પાર્ક ૧, શ્રી હરિ કોમ્પ્લેક્ષની બાજુમાં,",
    shopAddress: "આલાપ રોયલ પામની પાછળ, બાપાસીતારામ ચોક, મવડી, રાજકોટ - 390 004.",
    me_slash_name: "મે. :",
    addressLabel: "એડ્રેસ :",
    gstinLabel: "GSTIN :",
    stateLabel: "State : Gujarat",
    codeLabel: "Code : 24",
    bookNo: "બુક નં. :",
    billNo: "બીલ નં. :",
    dateLabel: "તા. :",

    // Bill Table
    tableCol1: "માલની વિગત",
    tableCol2: "HSN Code",
    tableCol3: "નંગ / મીટર",
    tableCol4: "ભાવ",
    tableCol5: "રકમ રૂ.",
    only: "Only",

    termsLabel: "ટર્મસ એન્ડ કન્ડીશન :",
    terms1: "૧. ન્યાયક્ષેત્ર રાજકોટ રહેશે.",
    terms2: "૨. ભુલચુક લેવી દેવી.",

    // Inventory
    invTitle: "સ્ટોક મેનેજમેન્ટ (Inventory)",
    invSubtitle: "તમારા સ્ટોકમાં નવી વસ્તુ ઉમેરો અને ડીલીટ કરો.",
    addNewItem: "વસ્તુ ઉમેરો",
    itemName: "વસ્તુનું નામ",
    priceInRs: "ભાવ (₹ માં)",
    addProductBtn: "ઉમેરો",
    adding: "ઉમેરાઈ રહ્યું છે...",
    currentStock: "હાજર સ્ટોક",
    noProducts: "કોઈ વસ્તુ નથી. નવી વસ્તુ ઉમેરો!",
    loadingInv: "સ્ટોક લોડ થઇ રહ્યો છે...",

    // History
    histTitle: "ખાતાવહી (Ledger & Analytics)",
    histSubtitle: "દૈનિક રિપોર્ટ અને જૂના બિલ તપાસો.",
    totalRevenue: "કુલ આવક",
    totalInvoices: "કુલ બિલ",
    avgBillValue: "સરેરાશ બિલની રકમ",
    recentReceipts: "તાજેતરના બિલો",
    dateCol: "તારીખ",
    invoiceNumCol: "બીલ નં.",
    customerCol: "ગ્રાહક",
    taxesGstCol: "ટેક્સ (GST)",
    totalPaidCol: "ચૂકવેલ રકમ",
    noInvoices: "હજુ સુધી કોઈ બિલ બન્યા નથી.",
    walkInCash: "Walk-in Cash"
  }
};

export const LanguageProvider = ({ children }) => {
  // Try to load language from localStorage, otherwise default to 'gu'
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLang') || 'gu';
  });

  useEffect(() => {
    localStorage.setItem('appLang', language);
  }, [language]);

  const toggleLanguage = (langCode) => {
    setLanguage(langCode);
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
