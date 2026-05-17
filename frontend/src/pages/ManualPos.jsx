import React, { useState, useEffect, useRef } from 'react';
import { fetchProducts, generateManualBill, searchCustomers, createCustomer, getFrontendUrl, createProduct, updateManualBill, fetchBills } from '../utils/api';
import { User, Phone, MapPin, X, Trash2, Printer, Search, MessageCircle, Plus, Save, Keyboard, UserPlus, RefreshCcw, PauseCircle, PlayCircle, ScanLine, Tag, Coins, Smartphone, CreditCard, Calendar, ChevronDown, AlertCircle, AlertTriangle, Edit3 } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext';
import PrintableBill from '../components/PrintableBill';
import '../index.css';

const ManualPos = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  
  // Customer State
  const [customerId, setCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerBalance, setCustomerBalance] = useState(0); 
  const [paymentMode, setPaymentMode] = useState('cash');
  const [billDate, setBillDate] = useState(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD
  
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', address: '', phone: '' });
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(-1);

  // ERP Features State
  const [discountAmount, setDiscountAmount] = useState(''); // Feature 1
  const [discountType, setDiscountType] = useState('none'); // Feature 1
  const [customRoundOff, setCustomRoundOff] = useState(''); // Custom Round Off
  const [isRoundOffManual, setIsRoundOffManual] = useState(false); // Round Off Manual flag
  const [billType, setBillType] = useState('sale'); // Feature 6
  const [barcodeMode, setBarcodeMode] = useState(false); // Feature 5
  const [heldBills, setHeldBills] = useState([]); // Feature 4
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);
  
  // Sales Bill Edit State
  const [editingBillId, setEditingBillId] = useState(null);
  const [editingBillSerial, setEditingBillSerial] = useState(null);
  const [showEditSearchModal, setShowEditSearchModal] = useState(false);
  const [recentBills, setRecentBills] = useState([]);
  const [editSearchTerm, setEditSearchTerm] = useState('');
  const [loadingRecent, setLoadingRecent] = useState(false);
  
  const [dialog, setDialog] = useState({
      isOpen: false,
      title: '',
      message: '',
      type: 'alert',
      onConfirm: null,
      onCancel: null
  });

  const showCustomAlert = (message, title = "System Notification") => {
      setDialog({
          isOpen: true,
          title,
          message,
          type: 'alert',
          onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
  };

  const showCustomConfirm = (message, onConfirm, onCancel = null, title = "Confirm Action") => {
      setDialog({
          isOpen: true,
          title,
          message,
          type: 'confirm',
          onConfirm: () => {
              setDialog(prev => ({ ...prev, isOpen: false }));
              if (onConfirm) onConfirm();
          },
          onCancel: () => {
              setDialog(prev => ({ ...prev, isOpen: false }));
              if (onCancel) onCancel();
          }
      });
  };
  
  // Quick Add State
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickAddData, setQuickAddData] = useState({ name: '', price: '', hsnCode: '' });
  const [savingProduct, setSavingProduct] = useState(false);

  // Grid State
  const getEmptyRow = () => ({ id: Date.now() + Math.random(), productId: null, itemName: '', hsnCode: '', meter: '', quantity: 1, rate: '', amount: 0, stockAmount: 0 });
  const [rows, setRows] = useState([getEmptyRow()]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(-1);

  // App State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bill, setBill] = useState(null);
  const [isSharingProcess, setIsSharingProcess] = useState(false);
  const [sharingBillNo, setSharingBillNo] = useState('');
  
  const autocompleteRef = useRef(null);

  useEffect(() => {
    loadProducts();
    // Load held bills
    const savedHeld = localStorage.getItem('erp_held_bills');
    if (savedHeld) {
        try {
            setHeldBills(JSON.parse(savedHeld));
        } catch(e) {}
    }
  }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const cachedBill = localStorage.getItem('erp_edit_bill_cache');
    if (cachedBill) {
      try {
        const parsed = JSON.parse(cachedBill);
        loadBillToEdit(parsed);
      } catch(e) {
        console.error("Failed to parse cached bill:", e);
      } finally {
        localStorage.removeItem('erp_edit_bill_cache');
      }
    }
  }, [products]);

  const holdCurrentBill = () => {
      // Feature 4: Hold Bill
      if (rows.length === 1 && !rows[0].itemName) return showCustomAlert("There are no valid items in the cart to hold.", "Empty Cart");
      const billData = {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          customerName: customerName || 'Walk-in',
          customerId, customerAddress, customerPhone, customerBalance,
          paymentMode, billType, discountAmount, discountType, billDate,
          rows
      };
      const updatedHeld = [...heldBills, billData];
      setHeldBills(updatedHeld);
      localStorage.setItem('erp_held_bills', JSON.stringify(updatedHeld));
      clearForm();
  };

  const resumeBill = (heldBill) => {
      setRows(heldBill.rows);
      setCustomerId(heldBill.customerId);
      setCustomerName(heldBill.customerName);
      setCustomerAddress(heldBill.customerAddress);
      setCustomerPhone(heldBill.customerPhone);
      setCustomerBalance(heldBill.customerBalance || 0);
      setPaymentMode(heldBill.paymentMode);
      setBillType(heldBill.billType);
      setDiscountAmount(heldBill.discountAmount);
      setDiscountType(heldBill.discountType);
      if (heldBill.billDate) setBillDate(heldBill.billDate);
      
      const updatedHeld = heldBills.filter(b => b.id !== heldBill.id);
      setHeldBills(updatedHeld);
      localStorage.setItem('erp_held_bills', JSON.stringify(updatedHeld));
  };

  const [showHeldDropdown, setShowHeldDropdown] = useState(false);

  const deleteHeldBill = (id, e) => {
      e.stopPropagation();
      showCustomConfirm(
          "Are you sure you want to permanently discard this held bill?",
          () => {
              const updatedHeld = heldBills.filter(b => b.id !== id);
              setHeldBills(updatedHeld);
              localStorage.setItem('erp_held_bills', JSON.stringify(updatedHeld));
              if (updatedHeld.length === 0) setShowHeldDropdown(false);
          },
          null,
          "Discard Held Bill"
      );
  };

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setActiveRowId(null);
      }
      if (!event.target.closest('.payment-dropdown-container')) {
        setShowPaymentDropdown(false);
      }
      if (!event.target.closest('.discount-dropdown-container')) {
        setShowDiscountDropdown(false);
      }
      if (!event.target.closest('.held-dropdown-container')) {
        setShowHeldDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [heldBills]);

  // Automatic Round Off Sync Hook
  useEffect(() => {
    if (!isRoundOffManual) {
      const taxAmountVal = discountedSubtotal * 0.05;
      const autoVal = Math.round(discountedSubtotal + taxAmountVal) - (discountedSubtotal + taxAmountVal);
      setCustomRoundOff(autoVal === 0 ? '0.00' : autoVal.toFixed(2));
    }
  }, [discountedSubtotal, isRoundOffManual]);

  // Customer logic
  useEffect(() => {
    if (searchTerm.length > 1 && showSuggestions) {
      const fetchC = async () => {
        try {
          const data = await searchCustomers(searchTerm);
          setSuggestions(data);
        } catch (e) { }
      };
      const timeout = setTimeout(fetchC, 300);
      return () => clearTimeout(timeout);
    } else {
      setSuggestions([]);
    }
  }, [searchTerm, showSuggestions]);

  const selectCustomer = (c) => {
    setCustomerId(c._id);
    setCustomerName(c.name);
    setCustomerAddress(c.address || '');
    if (c.phone) setCustomerPhone(c.phone);
    setCustomerBalance(c.balance || 0); // Feature 3
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchTerm('');
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setSavingCustomer(true);
    try {
      const created = await createCustomer(newCustomer);
      selectCustomer(created);
      setShowAddModal(false);
      setNewCustomer({ name: '', address: '', phone: '' });
    } catch (err) {
      showCustomAlert("Failed to save new customer. Please check input parameters.", "Error");
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleSaveQuickProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const pData = {
          name: quickAddData.name,
          nameEnglish: quickAddData.name,
          price: parseFloat(quickAddData.price),
          hsnCode: quickAddData.hsnCode,
          stockAmount: 100 // default stock
      };
      const created = await createProduct(pData);
      setProducts(prev => [...prev, created]);
      
      // Auto select it in the active row
      if (activeRowId) {
          handleProductSelect(activeRowId, created, document.querySelector(`.erp-table input[value="${quickAddData.name}"]`));
      }
      
      setShowQuickAddProduct(false);
      setQuickAddData({ name: '', price: '', hsnCode: '' });
    } catch (err) {
      showCustomAlert("Failed to save quick product details. Please check the price/HSN formats.", "Error");
    } finally {
      setSavingProduct(false);
    }
  };

  const clearCustomer = () => {
    setCustomerId(null);
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPhone('');
    setCustomerBalance(0);
  };

  // Grid Logic
  const handleRowChange = (id, field, value) => {
    if (field === 'itemName') {
      setActiveDropdownIndex(-1);
    }
    
    setRows(prevRows => {
      const newRows = [...prevRows];
      const rowIndex = newRows.findIndex(r => r.id === id);
      if (rowIndex === -1) return prevRows;
      
      const row = { ...newRows[rowIndex] };
      
      if (field === 'itemName') {
        row.itemName = value;
        row.productId = null;
        row.stockAmount = 0;
      } else if (field === 'quantity' || field === 'rate' || field === 'meter') {
        const val = parseFloat(value);
        row[field] = isNaN(val) ? '' : val;
        
        const qty = parseFloat(row.quantity) || 0;
        const rate = parseFloat(row.rate) || 0;
        const meter = row.meter === '' ? 1 : (parseFloat(row.meter) || 0); // Default multiplier is 1 if empty
        row.amount = Math.round(qty * rate * meter * 100) / 100;
      } else {
        row[field] = value;
      }
      
      newRows[rowIndex] = row;
      return newRows;
    });
  };

  const handleProductSelect = (rowId, product, inputElement) => {
    setRows(prevRows => {
      const newRows = [...prevRows];
      const rowIndex = newRows.findIndex(r => r.id === rowId);
      if (rowIndex === -1) return prevRows;
      
      const rate = parseFloat(product.price) || 0;
      const qty = parseFloat(newRows[rowIndex].quantity) || 1;
      
      newRows[rowIndex] = {
        ...newRows[rowIndex],
        productId: product._id,
        itemName: product.nameEnglish || product.name,
        hsnCode: product.hsnCode || '',
        rate: rate,
        quantity: qty,
        amount: Math.round(qty * rate * 100) / 100,
        stockAmount: product.stockAmount || product.currentStock || 0 // Feature 2
      };
      
      if (rowIndex === newRows.length - 1) {
        newRows.push(getEmptyRow());
      }
      
      return newRows;
    });
    setActiveRowId(null);
    setActiveDropdownIndex(-1);
    
    if (inputElement && !barcodeMode) {
        setTimeout(() => moveFocus(inputElement, 'RIGHT'), 10);
    }
  };

  const moveFocus = (currentElement, direction) => {
      if (!currentElement) return;
      
      const currentTd = currentElement.closest('td');
      const currentRow = currentElement.closest('tr');
      if (!currentTd || !currentRow) return;

      const allRows = Array.from(currentRow.parentNode.children);
      const rowIndex = allRows.indexOf(currentRow);
      const allCells = Array.from(currentRow.children);
      const colIndex = allCells.indexOf(currentTd);

      let targetInput = null;

      if (direction === 'UP' && rowIndex > 0) {
        const targetRow = allRows[rowIndex - 1];
        targetInput = targetRow.children[colIndex].querySelector('input:not([readOnly])');
      } else if (direction === 'DOWN' && rowIndex < allRows.length - 1) {
        const targetRow = allRows[rowIndex + 1];
        targetInput = targetRow.children[colIndex].querySelector('input:not([readOnly])');
      } else if (direction === 'LEFT') {
        const inputs = Array.from(document.querySelectorAll('.erp-table input:not([readOnly])'));
        const idx = inputs.indexOf(currentElement);
        if (idx > 0) targetInput = inputs[idx - 1];
      } else if (direction === 'RIGHT') {
        const inputs = Array.from(document.querySelectorAll('.erp-table input:not([readOnly])'));
        const idx = inputs.indexOf(currentElement);
        if (idx > -1 && idx < inputs.length - 1) targetInput = inputs[idx + 1];
      }

      if (targetInput) {
        targetInput.focus();
        if (targetInput.type === 'text' || targetInput.type === 'number') {
          setTimeout(() => targetInput.select(), 10);
        }
      }
  };

  const handleKeyDown = (e, rowId, field, rowIndex) => {
    const suggestionsList = getFilteredProducts(productSearchTerm);
    const isDropdownOpen = activeRowId === rowId && suggestionsList.length > 0;

    if (field === 'itemName') {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (isDropdownOpen) {
              if (activeDropdownIndex >= 0 && activeDropdownIndex < suggestionsList.length) {
                handleProductSelect(rowId, suggestionsList[activeDropdownIndex], e.target);
              } else if (suggestionsList.length > 0) {
                handleProductSelect(rowId, suggestionsList[0], e.target);
              }
              
              // Feature 5: Barcode Mode
              if (barcodeMode && suggestionsList.length > 0) {
                  setTimeout(() => {
                      const nextRowInputs = document.querySelectorAll('.erp-table tr');
                      if (nextRowInputs[rowIndex + 2]) { // +2 because header is index 0
                          const nextItemInput = nextRowInputs[rowIndex + 2].querySelector('input[placeholder*="Type"]');
                          if (nextItemInput) nextItemInput.focus();
                      }
                  }, 50);
              }
          } else {
             setTimeout(() => moveFocus(e.target, 'RIGHT'), 10);
          }
          return;
      }
      
      if (isDropdownOpen) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveDropdownIndex(prev => {
               const nextIdx = prev < suggestionsList.length - 1 ? prev + 1 : prev;
               setTimeout(() => {
                  const el = document.getElementById(`dropdown-item-${nextIdx}`);
                  if (el) el.scrollIntoView({ block: 'nearest' });
               }, 10);
               return nextIdx;
            });
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveDropdownIndex(prev => {
               const nextIdx = prev > 0 ? prev - 1 : 0;
               setTimeout(() => {
                  const el = document.getElementById(`dropdown-item-${nextIdx}`);
                  if (el) el.scrollIntoView({ block: 'nearest' });
               }, 10);
               return nextIdx;
            });
            return;
          }
      }
    }

    if (!isDropdownOpen) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus(e.target, 'UP');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveFocus(e.target, 'DOWN');
        return;
      }
      if (e.key === 'ArrowLeft') {
        if (e.target.type === 'number' || e.target.selectionStart === 0) {
           e.preventDefault();
           moveFocus(e.target, 'LEFT');
           return;
        }
      }
      if (e.key === 'ArrowRight') {
        if (e.target.type === 'number' || e.target.selectionEnd === e.target.value.length) {
           e.preventDefault();
           moveFocus(e.target, 'RIGHT');
           return;
        }
      }
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
       if (field === 'rate' && rowIndex === rows.length - 1) {
          if (rows[rowIndex].itemName || rows[rowIndex].amount > 0) {
             setRows(prev => {
                const newRows = [...prev, getEmptyRow()];
                setTimeout(() => moveFocus(e.target, 'RIGHT'), 50);
                return newRows;
             });
             if (e.key === 'Enter') e.preventDefault();
             return;
          }
       }
       
       if (e.key === 'Enter') {
         e.preventDefault();
         setTimeout(() => moveFocus(e.target, 'RIGHT'), 10);
       }
    }
    // Shortcut to save
    if (e.key === 'F2') {
       e.preventDefault();
       handleCheckout();
    }
  };

  const removeRow = (id) => {
    setRows(prev => {
        if (prev.length === 1) return [getEmptyRow()];
        return prev.filter(r => r.id !== id);
    });
  };

  // Calculations
  const calculateSubtotal = () => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  };
  
  const rawSubtotal = calculateSubtotal();
  let discountedSubtotal = rawSubtotal;
  
  // Apply Discount
  const dAmount = parseFloat(discountAmount) || 0;
  if (discountType === 'percentage') {
      discountedSubtotal = rawSubtotal - (rawSubtotal * (dAmount / 100));
  } else if (discountType === 'flat') {
      discountedSubtotal = rawSubtotal - dAmount;
  }
  if (discountedSubtotal < 0) discountedSubtotal = 0;

  const taxAmount = discountedSubtotal * 0.05; // 5% GST
  const autoRoundOff = Math.round(discountedSubtotal + taxAmount) - (discountedSubtotal + taxAmount);
  
  let roundOffVal = autoRoundOff;
  if (customRoundOff !== '' && !isNaN(customRoundOff)) {
      roundOffVal = parseFloat(customRoundOff) || 0;
  }
  const grandTotal = Math.round(discountedSubtotal + taxAmount + roundOffVal);

  const handleCheckout = async () => {
    if (!customerId && !customerName) {
        return showCustomAlert("Please select or add a customer before generating the bill.", "Customer Selection Required");
    }
    
    const validItems = rows.filter(r => r.itemName.trim() !== '' && (parseFloat(r.rate) > 0));
    
    if (validItems.length === 0) return showCustomAlert("Please add at least one valid item to the bill.", "Empty Invoice Items");
    
    try {
      setLoading(true);
      
      // Artificial delay to show the premium processing animation just like Smart Bill
      await new Promise(resolve => setTimeout(resolve, 3200));
      
      const billData = {
        items: validItems.map(r => ({ 
          product: r.productId || null,
          name: r.itemName, 
          price: parseFloat(r.rate) || 0, 
          hsnCode: r.hsnCode || '', 
          quantity: parseFloat(r.quantity) || 1,
          meter: r.meter ? parseFloat(r.meter) : undefined
        })),
        customerId,
        customerName: customerName || 'Cash Sale',
        customerAddress,
        customerPhone,
        paymentMode,
        discountAmount: dAmount,
        discountType,
        roundOff: customRoundOff !== '' ? parseFloat(customRoundOff) : undefined,
        billType,
        billDate
      };
      
      let res;
      if (editingBillId) {
          res = await updateManualBill(editingBillId, billData);
          setEditingBillId(null);
          setEditingBillSerial(null);
      } else {
          res = await generateManualBill(billData);
      }
      setBill(res);
      setLoading(false);
      
      // Update local stock for used items immediately to avoid waiting for reload
      if (res && res.items) {
         setProducts(prev => prev.map(p => {
             const soldItem = res.items.find(i => i.product === p._id);
             if (soldItem) {
                 const diff = billType === 'return' ? soldItem.quantity : -soldItem.quantity;
                 return { ...p, stockAmount: p.stockAmount + diff, currentStock: p.stockAmount + diff };
             }
             return p;
         }));
      }

    } catch (e) {
      setError(e.response?.data?.message || e.message);
      setLoading(false);
    }
  };

  const loadBillToEdit = (bill) => {
      // Set simple values
      setEditingBillId(bill._id);
      setEditingBillSerial(bill.serialNumber);
      
      // Populate customer
      setCustomerId(bill.customer || null);
      setCustomerName(bill.customerName || '');
      setCustomerAddress(bill.customerAddress || '');
      setCustomerPhone(bill.customerPhone || '');
      setCustomerBalance(0);
      
      // Populate values
      setPaymentMode(bill.paymentMode || 'cash');
      setBillType(bill.billType || 'sale');
      setDiscountAmount(bill.discountAmount || '');
      setDiscountType(bill.discountType || 'none');
      setCustomRoundOff(bill.roundOff !== undefined ? String(bill.roundOff) : '');
      setIsRoundOffManual(bill.roundOff !== undefined);
      if (bill.createdAt) {
          const d = new Date(bill.createdAt);
          setBillDate(d.toLocaleDateString('en-CA')); // YYYY-MM-DD format
      }
      
      // Populate rows
      const gridRows = bill.items.map(item => ({
          id: Date.now() + Math.random(),
          productId: item.product || null,
          itemName: item.name,
          hsnCode: item.hsnCode || '',
          meter: item.meter ? parseFloat(item.meter) : '',
          quantity: parseFloat(item.quantity) || 1,
          rate: parseFloat(item.price) || 0,
          amount: (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1) * (item.meter ? parseFloat(item.meter) : 1),
          stockAmount: 100
      }));
      
      setRows(gridRows);
      setShowEditSearchModal(false);
      showCustomAlert(`Loaded Invoice #${bill.serialNumber} for editing.`, "Invoice Loaded");
  };

  const loadRecentBillsForEdit = async () => {
      setLoadingRecent(true);
      try {
          const list = await fetchBills();
          setRecentBills(list || []);
      } catch(e) {
          showCustomAlert("Failed to load recent sales invoices.", "Error");
      } finally {
          setLoadingRecent(false);
      }
  };

  const cancelEditingBill = () => {
      setEditingBillId(null);
      setEditingBillSerial(null);
      clearForm();
      showCustomAlert("Invoice edit cancelled. Resetting POS grid to new invoice.", "Cancelled");
  };

  const clearForm = () => {
    setBill(null);
    setRows([getEmptyRow()]);
    clearCustomer();
    setPaymentMode('cash');
    setDiscountAmount('');
    setDiscountType('none');
    setCustomRoundOff('');
    setIsRoundOffManual(false);
    setBillType('sale');
    setBillDate(new Date().toLocaleDateString('en-CA'));
    setEditingBillId(null);
    setEditingBillSerial(null);
  };

  const handleWhatsApp = async (bill) => {
    if (!customerPhone) {
        alert("No phone number recorded for this customer.");
        return;
    }

    const invNumber = bill.serialNumber 
      ? String(((bill.serialNumber - 1) % 100) + 1).padStart(3, '0') 
      : bill._id.substring(bill._id.length - 4).toUpperCase();

    setSharingBillNo(invNumber);
    setIsSharingProcess(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const viewLink = `${getFrontendUrl()}/view-bill/${bill._id}`;
    const totalAmount = bill.actualTotal || 0;
    
    const text = `*SHREE HARI DRESSES & CUTPIECE*\n-----------------------------------------------------------\n\nDear *${bill.customerName || 'Customer'}*,\n\nThank you for shopping with us!\n\n*PURCHASE DETAILS*\n-----------------------------------------------------------\nDate : ${new Date(bill.createdAt).toLocaleDateString('en-IN')}\nBill No : ${invNumber}\nAmount : Rs.${totalAmount.toLocaleString('en-IN')}\n-----------------------------------------------------------\n\nView Your Invoice:\n${viewLink}\n\nVisit Us Again!\n-----------------------------------------------------------`;

    const waUrl = `https://wa.me/91${customerPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    
    setIsSharingProcess(false);
    setSharingBillNo('');
  };

  const getFilteredProducts = (searchTerm) => {
    if (!searchTerm) return products.slice(0, 50);
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      (p.nameEnglish && p.nameEnglish.toLowerCase().includes(term)) || 
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.hsnCode && p.hsnCode.toLowerCase().includes(term))
    ).slice(0, 50);
  };

  return (
    <div className="animate-fade-in animate-pos-wrapper" style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      padding: '16px',
      height: '100%',
      overflow: 'hidden',
      background: '#e2e8f0' 
    }}>
      <style>{`
        @keyframes slideDownFade {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dropdown-item-hover {
          transition: all 0.2s ease;
        }
        .dropdown-item-hover:hover {
          background: #f8fafc !important;
          transform: translateX(3px);
        }
        .premium-select-trigger {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .premium-select-trigger:hover {
          border-color: #cbd5e1 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.05) !important;
        }
        .premium-select-trigger:active {
          transform: translateY(0);
        }
        .premium-date-input {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .premium-date-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
        }
        .premium-date-input:hover {
          border-color: #cbd5e1 !important;
        }
        
        /* Premium Table Inputs */
        .erp-input {
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 6px 10px !important;
          font-size: 0.85rem !important;
          font-weight: 500 !important;
          color: #334155 !important;
          transition: all 0.15s ease-in-out !important;
          outline: none !important;
          background: transparent !important;
        }
        .erp-input:focus {
          border-color: #0ea5e9 !important;
          background: white !important;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15) !important;
        }
        .erp-input:hover:not(:focus) {
          border-color: #cbd5e1 !important;
          background: rgba(255, 255, 255, 0.5) !important;
        }
        .erp-input.right {
          font-family: 'Courier New', Courier, monospace !important;
          font-weight: 700 !important;
        }
        
        /* Premium Customer Search Input */
        .pos-erp-header input[type="text"] {
          border: 1px solid #cbd5e1 !important;
          border-radius: 8px !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
          transition: all 0.2s ease !important;
          outline: none !important;
        }
        .pos-erp-header input[type="text"]:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
        }
        
        /* Button Modernizations */
        .btn-primary, .btn-secondary {
          border-radius: 8px !important;
          font-weight: 600 !important;
          letter-spacing: 0.2px !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
        }
        .btn-primary:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25) !important;
        }
        .btn-primary:active {
          transform: translateY(0) !important;
        }
        .btn-secondary:hover {
          background: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
          transform: translateY(-1px) !important;
        }
        .btn-secondary:active {
          transform: translateY(0) !important;
        }
        .erp-pill-btn {
          border-radius: 8px !important;
          font-weight: 600 !important;
          transition: all 0.2s ease !important;
        }
        .erp-pill-btn:hover {
          transform: translateY(-1px) !important;
        }
      `}</style>
      {/* Premium Full-Screen Loading Overlay */}
      {loading && (
        <div className="premium-loader-overlay">
          <div className="receipt-scanner">
            <div className="receipt-lines">
              <div className="receipt-line" style={{ width: '60%' }}></div>
              <div className="receipt-line" style={{ width: '100%' }}></div>
              <div className="receipt-line" style={{ width: '80%' }}></div>
              <div className="receipt-line" style={{ width: '100%', marginTop: '8px' }}></div>
              <div className="receipt-line" style={{ width: '40%' }}></div>
            </div>
          </div>
          <h2 className="loader-title">Generating Bill...</h2>
          <p className="loader-subtitle">
            Processing items and calculating taxes.<br/>Please wait a moment.
          </p>
        </div>
      )}

      <div className="pos-erp-container">
        
        {/* Header Section */}
        <div className={`pos-erp-header ${billType === 'return' ? 'return-mode' : ''}`}>
          <div className="pos-erp-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: billType === 'return' ? '#991b1b' : '#0f172a' }}>
                {billType === 'return' ? <RefreshCcw size={18}/> : <Keyboard size={18}/>} 
                {billType === 'return' ? 'Sales Return POS' : 'Manual POS'} 
                <span style={{fontSize: '0.8rem', fontWeight: 'normal', color: billType === 'return' ? '#ef4444' : '#64748b'}}>(Press F2 to Save)</span>
              </h2>
            </div>
            
            <div className="pos-erp-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Feature 6 & 5 & 4 toggles */}
              {heldBills.length > 0 && (
                <div className="held-dropdown-container" style={{ position: 'relative', display: 'flex' }}>
                    <button 
                      onClick={() => setShowHeldDropdown(!showHeldDropdown)} 
                      className="erp-pill-btn bg-amber"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                       <PlayCircle size={14}/> Resume Hold ({heldBills.length})
                    </button>
                    
                    {showHeldDropdown && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          left: 0,
                          width: '320px',
                          background: 'rgba(255, 255, 255, 0.98)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(226, 232, 240, 0.9)',
                          borderRadius: '14px',
                          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                          padding: '12px',
                          zIndex: 150,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          animation: 'slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Held Bills Stack</span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{heldBills.length} active</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }} className="custom-scrollbar">
                          {heldBills.map((bill) => {
                            const sub = bill.rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                            let discSub = sub;
                            const dAmt = parseFloat(bill.discountAmount) || 0;
                            if (bill.discountType === 'percentage') {
                                discSub = sub - (sub * (dAmt / 100));
                            } else if (bill.discountType === 'flat') {
                                discSub = sub - dAmt;
                            }
                            if (discSub < 0) discSub = 0;
                            const total = Math.round(discSub + (discSub * 0.05));
                            const validRowsCount = bill.rows.filter(r => r.itemName.trim() !== '').length;
                            
                            return (
                              <div 
                                key={bill.id}
                                onClick={() => { resumeBill(bill); setShowHeldDropdown(false); }}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '8px 10px',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                className="dropdown-item-hover"
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, marginRight: '8px' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                                    {bill.customerName}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '8px' }}>
                                    <span>{validRowsCount} items</span>
                                    <span>•</span>
                                    <span>{bill.time || 'Held'}</span>
                                  </div>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d97706', fontFamily: 'monospace' }}>
                                    Rs.{total.toLocaleString('en-IN')}
                                  </span>
                                  <button
                                    onClick={(e) => deleteHeldBill(bill.id, e)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#94a3b8',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                                    title="Discard Bill"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              )}

              <button 
                onClick={() => {
                    loadRecentBillsForEdit();
                    setShowEditSearchModal(true);
                }} 
                className="erp-pill-btn"
                style={{ background: '#0284c7', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit3 size={14}/> Edit Bill
              </button>

              <button 
                onClick={() => setBarcodeMode(!barcodeMode)} 
                className={`erp-pill-btn ${barcodeMode ? 'bg-indigo' : 'bg-gray'}`}
              >
                <ScanLine size={14}/> Barcode Mode {barcodeMode ? 'ON' : 'OFF'}
              </button>

              <button 
                onClick={() => setBillType(prev => prev === 'sale' ? 'return' : 'sale')} 
                className={`erp-pill-btn ${billType === 'return' ? 'bg-red' : 'bg-blue'}`}
              >
                <RefreshCcw size={14}/> {billType === 'return' ? 'Return Mode' : 'Sales Mode'}
              </button>

              <div className="pos-action-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px', borderLeft: '1px solid #cbd5e1', paddingLeft: '16px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Date:</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: '10px', color: '#64748b', pointerEvents: 'none' }} />
                  <input 
                    type="date"
                    style={{ 
                      padding: '6px 10px 6px 30px', 
                      borderRadius: '8px', 
                      border: '1px solid #cbd5e1', 
                      fontSize: '0.85rem', 
                      outline: 'none',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease',
                      width: '140px'
                    }} 
                    className="premium-date-input"
                    value={billDate} 
                    onChange={(e) => setBillDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="pos-action-input payment-dropdown-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px', borderLeft: '1px solid #cbd5e1', paddingLeft: '16px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Payment:</label>
                <div style={{ position: 'relative' }}>
                  <button 
                    type="button"
                    onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: '#334155',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      minWidth: '150px',
                      justifyContent: 'space-between'
                    }}
                    className="premium-select-trigger"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {paymentMode === 'cash' && <Coins size={14} style={{ color: '#10b981' }} />}
                      {paymentMode === 'online' && <Smartphone size={14} style={{ color: '#6366f1' }} />}
                      {paymentMode === 'credit' && <CreditCard size={14} style={{ color: '#ef4444' }} />}
                      <span>
                        {paymentMode === 'cash' ? 'Cash' : 
                         paymentMode === 'online' ? 'Online / UPI' : 'Credit (Udhaar)'}
                      </span>
                    </div>
                    <ChevronDown size={14} style={{ opacity: 0.7, transform: showPaymentDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </button>
                  
                  {showPaymentDropdown && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        width: '180px',
                        background: 'rgba(255, 255, 255, 0.98)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(226, 232, 240, 0.9)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                        padding: '6px',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        animation: 'slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => { setPaymentMode('cash'); setShowPaymentDropdown(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          background: paymentMode === 'cash' ? '#f0fdf4' : 'transparent',
                          color: paymentMode === 'cash' ? '#166534' : '#475569',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                        className="dropdown-item-hover"
                      >
                        <Coins size={14} style={{ color: '#10b981' }} />
                        <span>Cash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMode('online'); setShowPaymentDropdown(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          background: paymentMode === 'online' ? '#e0e7ff' : 'transparent',
                          color: paymentMode === 'online' ? '#3730a3' : '#475569',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                        className="dropdown-item-hover"
                      >
                        <Smartphone size={14} style={{ color: '#6366f1' }} />
                        <span>Online / UPI</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMode('credit'); setShowPaymentDropdown(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          background: paymentMode === 'credit' ? '#fef2f2' : 'transparent',
                          color: paymentMode === 'credit' ? '#991b1b' : '#475569',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                        className="dropdown-item-hover"
                      >
                        <CreditCard size={14} style={{ color: '#ef4444' }} />
                        <span>Credit (Udhaar)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {editingBillId && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '10px 16px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              animation: 'fadeIn 0.25s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontWeight: 600, fontSize: '0.88rem' }}>
                <Edit3 size={16} />
                <span>EDITING SALES BILL / INVOICE #{editingBillSerial} ({customerName})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Saving this POS workspace will overwrite Invoice #{editingBillSerial}.</span>
                <button 
                  onClick={cancelEditingBill}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                  }}
                >
                  Cancel Edit
                </button>
              </div>
            </div>
          )}

          {/* Customer Details Row */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {customerId || customerName ? (
              <div style={{ 
                flex: 1, 
                background: '#f1f5f9', 
                border: '1px solid #cbd5e1', 
                borderRadius: '6px', 
                padding: '10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}><User size={14} style={{ display: 'inline', marginBottom: '-2px' }}/> {customerName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '16px', marginTop: '4px' }}>
                    {customerPhone && <span><Phone size={12}/> {customerPhone}</span>}
                    {customerAddress && <span><MapPin size={12}/> {customerAddress}</span>}
                    {/* Feature 3: Balance Display */}
                    {customerBalance !== 0 && (
                        <span style={{ color: customerBalance > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                            Udhaar: Rs. {Math.abs(customerBalance).toLocaleString('en-IN')} {customerBalance > 0 ? 'Dr' : 'Cr'}
                        </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={clearCustomer}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  title="Clear Customer"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder="Search customer by name or phone..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                      setActiveCustomerIndex(-1);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (showSuggestions && suggestions.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setActiveCustomerIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setActiveCustomerIndex(prev => (prev > 0 ? prev - 1 : 0));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (activeCustomerIndex >= 0 && activeCustomerIndex < suggestions.length) {
                            selectCustomer(suggestions[activeCustomerIndex]);
                          } else if (suggestions.length > 0) {
                            selectCustomer(suggestions[0]);
                          }
                        }
                      }
                    }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <ul style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                      border: '1px solid #cbd5e1', zIndex: 50, listStyle: 'none', padding: 0, margin: '4px 0 0 0',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto'
                    }}>
                      {suggestions.map((c, i) => (
                        <li key={c._id} 
                            onClick={() => selectCustomer(c)} 
                            onMouseEnter={() => setActiveCustomerIndex(i)}
                            style={{ 
                              padding: '10px 12px', 
                              borderBottom: '1px solid #f1f5f9', 
                              cursor: 'pointer',
                              background: i === activeCustomerIndex ? '#f0f9ff' : 'transparent'
                            }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: i === activeCustomerIndex ? '#0369a1' : '#0f172a' }}>{c.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.phone} {c.address}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button 
                  onClick={() => setShowAddModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <UserPlus size={16} /> New
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Data Grid Section */}
        <div className="erp-table-wrapper custom-scrollbar">
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: '40px', minWidth: '40px', textAlign: 'center' }}>#</th>
                <th style={{ minWidth: '180px' }}>Item Name</th>
                <th style={{ width: '100px', minWidth: '90px' }}>HSN Code</th>
                <th style={{ width: '80px', minWidth: '70px', textAlign: 'right' }}>Meter</th>
                <th style={{ width: '80px', minWidth: '70px', textAlign: 'right' }}>Qty</th>
                <th style={{ width: '100px', minWidth: '90px', textAlign: 'right' }}>Rate (Rs)</th>
                <th style={{ width: '120px', minWidth: '100px', textAlign: 'right' }}>Amount</th>
                <th style={{ width: '50px', minWidth: '50px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                // Feature 2: Stock warning logic
                const isOverStock = billType === 'sale' && row.productId && row.stockAmount !== undefined && row.quantity > row.stockAmount;
                
                return (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>{index + 1}</td>
                  <td style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      className="erp-input"
                      value={row.itemName}
                      onChange={(e) => {
                        handleRowChange(row.id, 'itemName', e.target.value);
                        setActiveRowId(row.id);
                        setProductSearchTerm(e.target.value);
                      }}
                      onFocus={() => {
                        setActiveRowId(row.id);
                        setProductSearchTerm(row.itemName);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, row.id, 'itemName', index)}
                      placeholder={barcodeMode ? "Scan or Type..." : "Type product name..."}
                      style={{ background: barcodeMode ? '#f5f3ff' : 'transparent' }}
                    />
                    
                    {/* Autocomplete Dropdown */}
                    {activeRowId === row.id && (
                      <div className="erp-autocomplete-dropdown custom-scrollbar" ref={autocompleteRef}>
                        {getFilteredProducts(productSearchTerm).length > 0 ? (
                            getFilteredProducts(productSearchTerm).map((p, i) => (
                              <div 
                                key={p._id} 
                                id={`dropdown-item-${i}`}
                                className={`erp-autocomplete-item ${i === activeDropdownIndex ? 'active' : ''}`}
                                onClick={() => handleProductSelect(row.id, p, null)}
                                onMouseEnter={() => setActiveDropdownIndex(i)}
                              >
                                <div style={{ 
                                  fontWeight: 700, 
                                  fontSize: '0.88rem', 
                                  color: i === activeDropdownIndex ? '#0284c7' : '#1e293b',
                                  transition: 'color 0.15s ease'
                                }}>
                                  {p.nameEnglish || p.name}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '4px' }}>
                                  <span style={{ 
                                    color: (p.currentStock || p.stockAmount || 0) <= 0 ? '#ef4444' : '#64748b', 
                                    fontWeight: (p.currentStock || p.stockAmount || 0) <= 0 ? 700 : 500 
                                  }}>
                                    Stock: {p.currentStock || p.stockAmount || 0}
                                  </span>
                                  <span style={{ 
                                    color: '#059669', 
                                    fontWeight: 800,
                                    background: '#ecfdf5',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.76rem',
                                    border: '1px solid #d1fae5',
                                    fontFamily: 'monospace'
                                  }}>
                                    Rs.{(p.price || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            ))
                        ) : (
                            // Feature 7: Quick Add
                            productSearchTerm.trim().length > 1 && (
                                <div 
                                    className="erp-autocomplete-item active" 
                                    onClick={() => {
                                        setQuickAddData({ name: productSearchTerm, price: '', hsnCode: '' });
                                        setShowQuickAddProduct(true);
                                        setActiveRowId(null);
                                    }}
                                    style={{ color: '#0ea5e9', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                   <Plus size={14}/> Add "{productSearchTerm}" to Inventory
                                </div>
                            )
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <input 
                      type="text" 
                      className="erp-input" 
                      value={row.hsnCode} 
                      onChange={(e) => handleRowChange(row.id, 'hsnCode', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, row.id, 'hsnCode', index)}
                      placeholder="HSN"
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      className="erp-input right" 
                      value={row.meter} 
                      onChange={(e) => handleRowChange(row.id, 'meter', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, row.id, 'meter', index)}
                      onWheel={(e) => e.target.blur()}
                      min="0.01" step="0.01"
                      placeholder="1"
                    />
                  </td>
                  <td style={{ position: 'relative' }}>
                    <input 
                      type="number" 
                      className={`erp-input right ${isOverStock ? 'overstock-warn' : ''}`} 
                      value={row.quantity} 
                      onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, row.id, 'quantity', index)}
                      onWheel={(e) => e.target.blur()}
                      min="1"
                    />
                    {isOverStock && <div className="stock-tooltip">Low Stock! (Avail: {row.stockAmount})</div>}
                  </td>
                  <td>
                    <input 
                      type="number" 
                      className="erp-input right" 
                      value={row.rate} 
                      onChange={(e) => handleRowChange(row.id, 'rate', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, row.id, 'rate', index)}
                      onWheel={(e) => e.target.blur()}
                      min="0" step="0.01"
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      className="erp-input right" 
                      value={(billType === 'return' ? '-' : '') + row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} 
                      readOnly
                      onKeyDown={(e) => handleKeyDown(e, row.id, 'amount', index)}
                      style={{ background: '#f8fafc', color: '#334155', fontWeight: 600 }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => removeRow(row.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}
                      title="Remove Row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Footer Section */}
        <div className="erp-footer">
          <div className="erp-footer-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              className="btn btn-primary" 
              style={{ background: billType === 'return' ? '#ef4444' : '#0ea5e9', border: 'none', padding: '10px 24px' }}
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? 'Processing...' : <><Save size={18}/> {billType === 'return' ? 'Process Return (F2)' : 'Save Bill (F2)'}</>}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={clearForm}
              style={{ padding: '10px 16px' }}
            >
              Clear
            </button>
            <button 
              className="btn"
              onClick={holdCurrentBill}
              style={{ padding: '10px 16px', background: '#f59e0b', color: 'white', border: 'none', display: 'flex', gap: '6px' }}
            >
              <PauseCircle size={16}/> Hold
            </button>
          </div>
          
          <div className="erp-totals">
            {/* Feature 1: Global Discount UI */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={16}/> Discount</span>
                
                <div className="discount-dropdown-container" style={{ position: 'relative' }}>
                  <button 
                    type="button"
                    onClick={() => setShowDiscountDropdown(!showDiscountDropdown)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: '#334155',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      minWidth: '130px',
                      justifyContent: 'space-between'
                    }}
                    className="premium-select-trigger"
                  >
                    <span>
                      {discountType === 'none' ? 'None' : 
                       discountType === 'percentage' ? '% Percent' : '₹ Flat Amt'}
                    </span>
                    <ChevronDown size={14} style={{ opacity: 0.7, transform: showDiscountDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </button>
                  
                  {showDiscountDropdown && (
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 6px)',
                        left: 0,
                        width: '150px',
                        background: 'rgba(255, 255, 255, 0.98)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(226, 232, 240, 0.9)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                        padding: '6px',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        animation: 'slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => { setDiscountType('none'); setDiscountAmount(''); setShowDiscountDropdown(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          background: discountType === 'none' ? '#f1f5f9' : 'transparent',
                          color: '#475569',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                        className="dropdown-item-hover"
                      >
                        None
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDiscountType('percentage'); setShowDiscountDropdown(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          background: discountType === 'percentage' ? '#e0f2fe' : 'transparent',
                          color: '#0369a1',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                        className="dropdown-item-hover"
                      >
                        % Percent
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDiscountType('flat'); setShowDiscountDropdown(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          background: discountType === 'flat' ? '#f0fdf4' : 'transparent',
                          color: '#166534',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                        className="dropdown-item-hover"
                      >
                        ₹ Flat Amt
                      </button>
                    </div>
                  )}
                </div>

                {discountType !== 'none' && (
                    <input 
                        type="number" 
                        placeholder="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        style={{ 
                            width: '90px', 
                            padding: '8px 12px', 
                            border: '1px solid #cbd5e1', 
                            borderRadius: '6px',
                            background: 'white', 
                            textAlign: 'right', 
                            fontSize: '0.9rem', 
                            color: '#0f172a', 
                            fontWeight: 600, 
                            outline: 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    />
                )}
            </div>

            <span style={{ color: '#64748b', textAlign: 'right' }}>Subtotal:</span>
            <span style={{ textAlign: 'right', fontWeight: 600 }}>Rs. {rawSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            
            {discountType !== 'none' && dAmount > 0 && (
               <>
                 <span style={{ color: '#10b981', textAlign: 'right' }}>Discount ({discountType === 'percentage' ? `${dAmount}%` : 'Flat'}):</span>
                 <span style={{ color: '#10b981', textAlign: 'right', fontWeight: 600 }}>- Rs. {(rawSubtotal - discountedSubtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
               </>
            )}

            <span style={{ color: '#64748b', textAlign: 'right' }}>GST (5%):</span>
            <span style={{ textAlign: 'right', fontWeight: 600 }}>Rs. {taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>

            <span style={{ color: '#64748b', textAlign: 'right' }}>Total (with GST):</span>
            <span style={{ textAlign: 'right', fontWeight: 600 }}>Rs. {(discountedSubtotal + taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>

            <span style={{ color: '#64748b', textAlign: 'right', alignSelf: 'center' }}>Round Off:</span>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <input 
                type="text" 
                inputMode="decimal"
                value={customRoundOff}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomRoundOff(val);
                  if (val === '') {
                    setIsRoundOffManual(false);
                  } else {
                    setIsRoundOffManual(true);
                  }
                }}
                style={{
                  width: '80px',
                  padding: '4px 8px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  textAlign: 'right', 
                  fontSize: '0.85rem', 
                  color: '#0f172a', 
                  fontWeight: 600, 
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
            </div>
            
            <span style={{ color: '#0f172a', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem' }}>Final Amount:</span>
            <span style={{ color: billType === 'return' ? '#ef4444' : '#0369a1', textAlign: 'right', fontWeight: 800, fontSize: '1.2rem' }}>
              {billType === 'return' ? '-' : ''}Rs. {grandTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ zIndex: 9000 }}>
          <div className="modal-content" style={{ width: '400px' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18}/></button>
            </div>
            <form onSubmit={handleSaveCustomer} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Customer Name *</label>
                <input required type="text" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Phone Number</label>
                <input type="text" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Address</label>
                <textarea rows="2" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={savingCustomer} style={{ padding: '8px 16px', border: 'none', background: '#0ea5e9', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
                  {savingCustomer ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {showQuickAddProduct && (
        <div className="modal-overlay" style={{ zIndex: 9000 }}>
          <div className="modal-content" style={{ width: '400px' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Quick Add to Inventory</h3>
              <button onClick={() => setShowQuickAddProduct(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18}/></button>
            </div>
            <form onSubmit={handleSaveQuickProduct} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Item Name</label>
                <input required type="text" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f1f5f9' }} value={quickAddData.name} readOnly />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Sale Price (Rs) *</label>
                <input required type="number" step="0.01" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={quickAddData.price} onChange={e => setQuickAddData({...quickAddData, price: e.target.value})} autoFocus />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>HSN Code</label>
                <input type="text" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={quickAddData.hsnCode} onChange={e => setQuickAddData({...quickAddData, hsnCode: e.target.value})} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowQuickAddProduct(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={savingProduct} style={{ padding: '8px 16px', border: 'none', background: '#0ea5e9', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
                  {savingProduct ? 'Saving...' : 'Save Item & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill View Overlay */}
      {bill && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', zIndex: 9999, 
          display: 'flex', flexDirection: 'column', alignItems: 'center', 
          padding: '40px 20px', overflowY: 'auto',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button 
              onClick={() => handleWhatsApp(bill)} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                background: 'transparent',
                border: '1px solid #22c55e',
                color: '#22c55e',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
              className="action-btn-hover"
            >
              <MessageCircle size={16} />
              <span>WhatsApp</span>
            </button>
            
            <button 
              onClick={() => window.print()} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                background: '#0284c7',
                border: 'none',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)'
              }}
              className="action-btn-hover"
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
            
            <button 
              onClick={clearForm} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                background: 'white',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              className="action-btn-hover"
            >
              <X size={16} />
              <span>Close</span>
            </button>
          </div>
          <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}>
            <PrintableBill bill={bill} />
          </div>
        </div>
      )}

      {error && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '16px', borderRadius: '8px', zIndex: 10000, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><X size={16}/></button>
          </div>
        </div>
      )}

      <style>{`
        /* Minimal inline styles for grid to ensure portability */
        .pos-erp-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .pos-erp-header {
          padding: 16px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          transition: background 0.3s;
        }
        .pos-erp-header.return-mode {
          background: #fef2f2;
          border-bottom: 1px solid #fecaca;
        }
        .erp-pill-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .erp-pill-btn:hover { 
          opacity: 0.9; 
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .erp-pill-btn:active {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .bg-indigo { background: #6366f1; }
        .bg-gray { background: #94a3b8; }
        .bg-red { background: #ef4444; }
        .bg-blue { background: #0ea5e9; }
        .bg-amber { background: #f59e0b; }

        .erp-table-wrapper {
          flex: 1;
          overflow: auto;
          background: white;
        }
        .erp-table {
          width: 100%;
          border-collapse: collapse;
        }
        .erp-table th {
          color: #475569;
          padding: 12px 16px;
          text-align: left;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          position: sticky;
          top: 0;
          z-index: 10;
          background: #f1f5f9;
          border-bottom: 2px solid #e2e8f0;
        }
        .return-mode .erp-table th {
          background: #fee2e2;
        }
        .erp-table td {
          padding: 0;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
        }
        .erp-table td:last-child {
          border-right: none;
        }
        .erp-table tr:hover td {
          background: #f8fafc;
        }
        .erp-input {
          width: 100%;
          min-width: 0;
          border: none;
          padding: 12px 16px;
          font-family: inherit;
          font-size: 0.95rem;
          background: transparent;
          outline: none;
          color: #0f172a;
        }
        .erp-input:focus {
          background: #f0f9ff;
          box-shadow: inset 0 0 0 2px #0ea5e9;
        }
        .erp-input.right {
          text-align: right;
        }
        .erp-input.overstock-warn {
            background: #fee2e2;
            color: #b91c1c;
            font-weight: 600;
        }
        .stock-tooltip {
            position: absolute;
            bottom: -15px;
            right: 5px;
            font-size: 0.7rem;
            color: #ef4444;
            font-weight: 700;
            pointer-events: none;
        }
        
        /* Remove default number input spin buttons */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }

        .erp-input::placeholder {
          color: #94a3b8;
          font-size: 0.85rem;
        }
        .erp-autocomplete-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          width: 380px;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 12px;
          box-shadow: 0 12px 30px -6px rgba(15, 23, 42, 0.15), 0 8px 12px -8px rgba(15, 23, 42, 0.08);
          z-index: 200;
          max-height: 265px;
          overflow-y: auto;
          padding: 6px;
          animation: slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top left;
        }
        .erp-autocomplete-item {
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          border-bottom: 1px solid rgba(241, 245, 249, 0.6);
          margin-bottom: 2px;
        }
        .erp-autocomplete-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .erp-autocomplete-item:hover, .erp-autocomplete-item.active {
          background: linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 100%) !important;
          transform: translateX(4px);
        }
        
        @keyframes slideDownFade {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .erp-footer {
          padding: 16px 24px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .erp-totals {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 6px 24px;
          align-items: center;
        }
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5); display: flex; justify-content: center; alignItems: center;
        }
        .modal-content {
          background: white; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden;
        }
             /* Mobile Responsiveness & Screen Space Optimization */
        @media (max-width: 768px) {
          .animate-pos-wrapper {
            height: auto !important;
            overflow: visible !important;
            padding: 4px !important;
          }
          .pos-erp-container {
            height: auto !important;
            overflow: visible !important;
            padding: 6px !important;
            margin: 0 !important;
            border-radius: 8px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
          }
          .pos-erp-header {
            padding: 8px !important;
            margin-bottom: 4px !important;
            border-radius: 6px !important;
          }
          .pos-erp-header-top {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 6px !important;
            margin-bottom: 4px !important;
          }
          .pos-erp-header-top h2 {
            font-size: 0.95rem !important;
            margin-bottom: 2px !important;
          }
          .pos-erp-actions {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 4px !important;
            width: 100% !important;
            border-bottom: 1px solid #cbd5e1 !important;
            padding-bottom: 6px !important;
          }
          .erp-pill-btn {
            font-size: 0.72rem !important;
            padding: 4px 8px !important;
            border-radius: 6px !important;
          }
          .pos-action-input {
            margin-left: 0 !important;
            border-left: none !important;
            padding-left: 0 !important;
            flex: 1 1 calc(50% - 4px) !important;
            margin-top: 2px !important;
          }
          .pos-action-input div {
            width: 100% !important;
          }
          .premium-date-input, .premium-select-trigger {
            width: 100% !important;
            padding: 4px 8px !important;
            font-size: 0.78rem !important;
            height: 32px !important;
          }
          .premium-date-input {
            padding-left: 26px !important;
          }
          
          /* Tighten Customer selection */
          .pos-erp-header + div {
            margin: 2px 0 !important;
          }
          .pos-erp-header + div > div {
            padding: 6px 10px !important;
            border-radius: 6px !important;
          }
          .pos-erp-header + div > div font-size {
            font-size: 0.78rem !important;
          }
          
          /* Table Grid Compactness & Height Expansion */
          .erp-table-wrapper {
            min-height: 280px !important;
            max-height: 48vh !important;
            overflow-x: auto !important;
            border-radius: 6px !important;
            border: 1px solid #cbd5e1 !important;
            background: white !important;
          }
          .erp-table th, .erp-table td {
            padding: 4px 6px !important;
            font-size: 0.78rem !important;
            white-space: nowrap !important;
          }
          .erp-input {
            padding: 4px 6px !important;
            font-size: 0.78rem !important;
            height: 28px !important;
            border-radius: 4px !important;
          }
          
          /* Footer & Totals Section at Bottom */
          .erp-footer {
            flex-direction: column-reverse !important;
            gap: 8px !important;
            align-items: stretch !important;
            padding: 8px 10px !important;
            border-radius: 6px !important;
            background: #f8fafc !important;
            margin-top: 4px !important;
          }
          .erp-footer-actions {
            flex-direction: row !important;
            width: 100% !important;
            gap: 6px !important;
            display: flex !important;
          }
          .erp-footer-actions button, .erp-footer-actions .btn {
            flex: 1 !important;
            width: auto !important;
            justify-content: center !important;
            padding: 8px 2px !important;
            display: flex !important;
            align-items: center !important;
            font-size: 0.75rem !important;
            white-space: nowrap !important;
            gap: 4px !important;
            height: 34px !important;
          }
          .erp-totals {
            width: 100% !important;
            border-left: none !important;
            padding-left: 0 !important;
            padding-top: 6px !important;
            border-top: 1px solid #cbd5e1 !important;
            grid-template-columns: 1fr auto !important;
            gap: 2px 16px !important;
            font-size: 0.78rem !important;
          }
          .erp-totals span[style*="font-size: 1.1rem"] {
            font-size: 0.95rem !important;
          }
          .erp-totals span[style*="font-size: 1.2rem"] {
            font-size: 1rem !important;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.9) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Custom Premium Alert & Confirm Dialog Modal */}
      {dialog.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out forwards'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
            width: 'calc(100% - 32px)',
            maxWidth: '380px',
            overflow: 'hidden',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          }}>
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              {/* Icon Container */}
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: dialog.type === 'confirm' ? '#fef3c7' : '#fee2e2',
                color: dialog.type === 'confirm' ? '#d97706' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                {dialog.type === 'confirm' ? <AlertCircle size={26} /> : <AlertTriangle size={26} />}
              </div>
              
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
                {dialog.title}
              </h3>
              
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                {dialog.message}
              </p>
            </div>
            
            <div style={{
              background: '#f8fafc',
              padding: '12px 16px',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              borderTop: '1px solid #cbd5e1'
            }}>
              {dialog.type === 'confirm' && (
                <button
                  onClick={() => {
                    if (dialog.onCancel) dialog.onCancel();
                    setDialog(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                }}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: dialog.type === 'confirm' ? '#d97706' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                {dialog.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search/Picker Modal for Editing Bills */}
      {showEditSearchModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
            width: 'calc(100% - 32px)',
            maxWidth: '520px',
            overflow: 'hidden',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} style={{ color: '#0ea5e9' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Edit Existing Sales Invoice
                </h3>
              </div>
              <button 
                onClick={() => setShowEditSearchModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Search input to type Serial or Invoice Number */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text"
                  placeholder="Search by customer name or invoice serial..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                  value={editSearchTerm}
                  onChange={(e) => setEditSearchTerm(e.target.value)}
                />
              </div>
              
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px' }}>
                Recent Invoices ({recentBills.length})
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                maxHeight: '260px', 
                overflowY: 'auto',
                paddingRight: '4px'
              }} className="custom-scrollbar">
                {loadingRecent ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Loading recent invoices...
                  </div>
                ) : recentBills.filter(b => {
                  if (!editSearchTerm.trim()) return true;
                  const term = editSearchTerm.toLowerCase();
                  return (
                    String(b.serialNumber).includes(term) ||
                    (b.customerName && b.customerName.toLowerCase().includes(term)) ||
                    (b.uniqueInvoiceId && b.uniqueInvoiceId.toLowerCase().includes(term))
                  );
                }).length > 0 ? (
                  recentBills.filter(b => {
                    if (!editSearchTerm.trim()) return true;
                    const term = editSearchTerm.toLowerCase();
                    return (
                      String(b.serialNumber).includes(term) ||
                      (b.customerName && b.customerName.toLowerCase().includes(term)) ||
                      (b.uniqueInvoiceId && b.uniqueInvoiceId.toLowerCase().includes(term))
                    );
                  }).map((b) => (
                    <div 
                      key={b._id}
                      onClick={() => loadBillToEdit(b)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="dropdown-item-hover"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                          #{b.serialNumber} — {b.customerName || 'Cash Sale'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {b.uniqueInvoiceId || 'Invoice ID'} • {new Date(b.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0ea5e9', fontFamily: 'monospace' }}>
                        Rs.{b.actualTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No matching invoices found.
                  </div>
                )}
              </div>
            </div>
            
            <div style={{
              background: '#f8fafc',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'flex-end',
              borderTop: '1px solid #cbd5e1'
            }}>
              <button 
                onClick={() => setShowEditSearchModal(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualPos;
