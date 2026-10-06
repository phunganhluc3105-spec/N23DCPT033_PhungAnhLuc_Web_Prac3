import axios from 'axios';

// baseURL ưu tiên đọc từ biến môi trường NEXT_PUBLIC_API_URL khi deploy production
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const baseURL = rawBaseUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
