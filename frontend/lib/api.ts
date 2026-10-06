import axios from 'axios';

// baseURL ưu tiên đọc từ biến môi trường NEXT_PUBLIC_API_URL khi deploy production
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

export default api;
