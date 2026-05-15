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
    walkInCash: "Walk-in Cash"
  }
};

export const LanguageProvider = ({ children }) => {
  const t = (key) => {
    return translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language: 'en', toggleLanguage: () => {}, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
