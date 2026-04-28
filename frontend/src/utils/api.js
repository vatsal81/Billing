import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

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

export const generateBill = async (billData) => {
  const { data } = await API.post('/bills', billData);
  return data;
};

export const generateManualBill = async (billData) => {
  const { data } = await API.post('/bills/manual', billData);
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

export const updateSettings = async (settings) => {
  const { data } = await API.post('/settings', settings);
  return data;
};

// Customers
export const searchCustomers = async (name) => {
  const { data } = await API.get(`/customers/search?name=${name}`);
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

export default API;
