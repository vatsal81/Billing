import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
});

export const getBackendUrl = () => {
  return API.defaults.baseURL.replace('/api', '');
};

export const getFrontendUrl = () => {
  return window.location.origin;
};

// Add token to every request
API.interceptors.request.use((req) => {
  const userInfo = localStorage.getItem('userInfo');
  const token = userInfo ? JSON.parse(userInfo).token : null;
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Auth
export const login = async (credentials) => {
  const { data } = await API.post('/auth/login', credentials);
  return data;
};

// Items/Products
export const fetchProducts = async () => {
  const { data } = await API.get('/items');
  return data;
};

export const createProduct = async (productData) => {
  const { data } = await API.post('/items', productData);
  return data;
};

export const deleteProduct = async (id) => {
  const { data } = await API.delete(`/items/${id}`);
  return data;
};

export const updateProduct = async (id, productData) => {
  const { data } = await API.put(`/items/${id}`, productData);
  return data;
};

// Bills
export const fetchBills = async () => {
  const { data } = await API.get('/bills');
  return data;
};

export const fetchBillById = async (id) => {
  const { data } = await API.get(`/bills/${id}`);
  return data;
};

export const generateBill = async (billData) => {
  const { data } = await API.post('/bills', billData);
  return data;
};

export const generateManualBill = async (billData) => {
  const { data } = await API.post('/bills/manual', billData);
  return data;
};

export const updateManualBill = async (id, billData) => {
  const { data } = await API.put(`/bills/${id}`, billData);
  return data;
};

export const voidBill = async (id) => {
  const { data } = await API.put(`/bills/${id}/void`);
  return data;
};

export const deleteBill = async (id) => {
  const { data } = await API.delete(`/bills/${id}`);
  return data;
};


// Settings
export const fetchSettings = async () => {
  const { data } = await API.get('/settings');
  return data;
};

export const transliterateText = async (text) => {
  if (!text || text.trim() === '') return '';
  try {
    const url = `https://www.google.com/inputtools/request?text=${encodeURIComponent(text)}&ime=transliteration_en_gu&num=1`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
      return data[1][0][1][0];
    }
  } catch (error) {
    console.error('Transliteration failed:', error);
  }
  return text; // Fallback to original text if fails
};

export const updateSettings = async (settingsData) => {
  const { data } = await API.put('/settings', settingsData);
  return data;
};

// Customers
export const fetchCustomers = async () => {
  const { data } = await API.get('/customers');
  return data;
};

export const searchCustomers = async (name) => {
  const { data } = await API.get(`/customers/search?name=${name}`);
  return data;
};

export const createCustomer = async (customerData) => {
  const { data } = await API.post('/customers', customerData);
  return data;
};

export const updateCustomer = async (id, customerData) => {
  const { data } = await API.put(`/customers/${id}`, customerData);
  return data;
};

export const deleteCustomer = async (id) => {
  const { data } = await API.delete(`/customers/${id}`);
  return data;
};

// Expenses
export const fetchExpenses = async () => {
  const { data } = await API.get('/expenses');
  return data;
};

export const createExpense = async (expenseData) => {
  const { data } = await API.post('/expenses', expenseData);
  return data;
};

export const deleteExpense = async (id) => {
  const { data } = await API.delete(`/expenses/${id}`);
  return data;
};

// Purchase
export const fetchPurchaseBills = async () => {
  const { data } = await API.get('/purchase');
  return data;
};

export const createPurchaseBill = async (billData) => {
  const { data } = await API.post('/purchase', billData);
  return data;
};

export const updatePurchaseBill = async (id, billData) => {
  const { data } = await API.put(`/purchase/${id}`, billData);
  return data;
};

export const fetchPurchaseBill = async (id) => {
  const { data } = await API.get(`/purchase/details/${id}`);
  return data;
};

export const downloadPurchaseReport = async (month, year) => {
  const response = await API.get(`/purchase/monthly-pdf?month=${month}&year=${year}`, {
    responseType: 'blob'
  });
  return response.data;
};

export const downloadSinglePurchaseBillPdf = async (id) => {
  const response = await API.get(`/purchase/${id}/pdf`, {
    responseType: 'blob'
  });
  return response.data;
};

export const deletePurchaseBill = async (id) => {
  const { data } = await API.delete(`/purchase/${id}`);
  return data;
};

// Suppliers
export const fetchSuppliers = async () => {
  const { data } = await API.get('/suppliers');
  return data;
};

export const createSupplier = async (supplierData) => {
  const { data } = await API.post('/suppliers', supplierData);
  return data;
};

export const updateSupplier = async (id, supplierData) => {
  const { data } = await API.put(`/suppliers/${id}`, supplierData);
  return data;
};

export const deleteSupplier = async (id) => {
  const { data } = await API.delete(`/suppliers/${id}`);
  return data;
};

// Analytics
export const fetchAnalyticsStats = async (period = '30d') => {
  const { data } = await API.get(`/analytics/stats?period=${period}`);
  return data;
};

// Ledger
export const fetchLedgerEntries = async (partyId) => {
  const { data } = await API.get(`/ledger/${partyId}?cb=${Date.now()}`);
  return data;
};

export const createLedgerEntry = async (entryData) => {
  const { data } = await API.post('/ledger', entryData);
  return data;
};

export default API;



