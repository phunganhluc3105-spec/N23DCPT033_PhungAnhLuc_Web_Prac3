'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  price: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 1. Tải danh sách sản phẩm (GET)
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get<Product[]>('/api/products');
      setProducts(res.data);
    } catch (err: unknown) {
      console.error('Lỗi tải sản phẩm:', err);
      toast.error('Không thể kết nối đến backend server!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 2. Thêm sản phẩm mới (POST)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      toast.error('Vui lòng nhập đầy đủ tên và giá!');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/products', {
        name: name.trim(),
        price: Number(price),
      });

      setName('');
      setPrice('');
      toast.success('Thêm sản phẩm thành công!');
      fetchProducts(); // Làm mới danh sách
    } catch (err: any) {
      const message = err.response?.data?.error || 'Lỗi khi thêm sản phẩm';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Xoá sản phẩm (DELETE) với Optimistic Update
  const handleDelete = async (id: number) => {
    // Xác nhận từ người dùng
    if (!confirm('Bạn có chắc chắn muốn xoá sản phẩm này?')) return;

    // A. Optimistic update: Xoá khỏi UI ngay tức khắc
    const previousProducts = [...products];
    setProducts((prev) => prev.filter((p) => p.id !== id));

    try {
      // B. Gửi yêu cầu DELETE ngầm đến server
      await api.delete(`/api/products/${id}`);
      toast.success('Đã xoá sản phẩm', { icon: '🗑️' });
    } catch (err) {
      // C. Rollback: Khôi phục lại nếu server gặp lỗi
      console.error('Lỗi khi xoá:', err);
      toast.error('Xoá thất bại, đang đồng bộ lại dữ liệu!');
      setProducts(previousProducts);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Sản phẩm (Lab 3)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tích hợp Axios + Hot-Toast + Optimistic UI Update
          </p>
        </div>

        {/* Form thêm sản phẩm */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Thêm sản phẩm mới</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Tên sản phẩm
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Áo hoodie form rộng"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Giá (VNĐ)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ví dụ: 350000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="1000"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg text-sm transition disabled:opacity-50"
            >
              {submitting ? 'Đang thêm...' : 'Thêm sản phẩm'}
            </button>
          </form>
        </div>

        {/* Danh sách sản phẩm */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-700">Danh sách sản phẩm</h2>
            <button
              onClick={fetchProducts}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Làm mới
            </button>
          </div>

          {loading && products.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center animate-pulse">
              Đang tải danh sách...
            </p>
          ) : products.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">
              Chưa có sản phẩm nào. Hãy thêm sản phẩm ở trên!
            </p>
          ) : (
            <div className="space-y-2.5">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition"
                >
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                    <p className="text-xs font-semibold text-blue-600">
                      {p.price.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                  >
                    Xoá
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
