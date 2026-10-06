import axios from 'axios';

// Sử dụng baseURL tương đối hoặc http://localhost:5000 (đã có rewrite proxy và cors)
const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

export default api;
