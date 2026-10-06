'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/products');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setProducts(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      console.error('Lỗi khi fetch sản phẩm:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-8 text-zinc-900 font-sans">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-md border border-zinc-200">
        <h1 className="text-2xl font-bold mb-2">Lab 3: Kiểm tra kết nối Frontend & Backend</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Gọi API qua NextJS Proxy: <code className="bg-zinc-100 px-2 py-0.5 rounded text-blue-600">/api/products</code>
        </p>

        <div className="flex gap-3 mb-6">
          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Gọi lại API (Refetch)
          </button>
        </div>

        {loading && <p className="text-zinc-600 animate-pulse">Đang gửi request sang backend...</p>}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
            <p className="font-semibold">⚠️ Không thể lấy dữ liệu!</p>
            <p className="text-sm font-mono mt-1">{error}</p>
            <p className="text-xs text-red-500 mt-2">
              (Hãy mở <strong>DevTools → tab Console</strong> để xem chi tiết lỗi CORS chặn bởi trình duyệt)
            </p>
          </div>
        )}

        {products.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Danh sách sản phẩm nhận được:</h2>
            <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg">
              {products.map((p) => (
                <li key={p.id} className="p-3 flex justify-between items-center">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-blue-600 font-semibold">{p.price.toLocaleString()}đ</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
