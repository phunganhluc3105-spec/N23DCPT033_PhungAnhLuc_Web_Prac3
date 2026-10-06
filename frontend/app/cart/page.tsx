'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface CartItem {
  productId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    category?: string;
    image?: string;
  };
}

interface CartResponse {
  items: CartItem[];
  total: number;
  totalCount: number;
}

export default function CartPage() {
  const [cartData, setCartData] = useState<CartResponse>({ items: [], total: 0, totalCount: 0 });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Tải danh sách giỏ hàng (GET /api/cart)
  const fetchCart = async () => {
    try {
      const res = await api.get<CartResponse>('/api/cart');
      setCartData(res.data);
      // Mặc định chọn tất cả
      setSelectedIds(res.data.items.map((i) => i.productId));
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải giỏ hàng!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // 2. Tăng / Giảm số lượng (PUT /api/cart/:productId)
  const handleUpdateQuantity = async (productId: number, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      handleDeleteItem(productId);
      return;
    }

    // Optimistic update
    setCartData((prev) => {
      const updated = prev.items.map((item) =>
        item.productId === productId ? { ...item, quantity: newQty } : item
      );
      const total = updated.reduce((s, i) => s + i.product.price * i.quantity, 0);
      const totalCount = updated.reduce((s, i) => s + i.quantity, 0);
      return { items: updated, total, totalCount };
    });

    try {
      await api.put(`/api/cart/${productId}`, { quantity: newQty });
    } catch (err) {
      toast.error('Lỗi cập nhật số lượng!');
      fetchCart();
    }
  };

  // 3. Xoá sản phẩm khỏi giỏ (DELETE /api/cart/:productId)
  const handleDeleteItem = async (productId: number) => {
    // Optimistic update
    const previous = { ...cartData };
    setCartData((prev) => {
      const filtered = prev.items.filter((i) => i.productId !== productId);
      const total = filtered.reduce((s, i) => s + i.product.price * i.quantity, 0);
      const totalCount = filtered.reduce((s, i) => s + i.quantity, 0);
      return { items: filtered, total, totalCount };
    });
    setSelectedIds((prev) => prev.filter((id) => id !== productId));

    try {
      await api.delete(`/api/cart/${productId}`);
      toast.success('Đã xoá khỏi giỏ hàng', { icon: '🗑️' });
    } catch (err) {
      toast.error('Xoá thất bại!');
      setCartData(previous);
    }
  };

  // Toggle chọn sản phẩm để thanh toán
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === cartData.items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartData.items.map((i) => i.productId));
    }
  };

  // Tính tổng tiền cho các món được tick chọn
  const checkoutTotal = cartData.items
    .filter((i) => selectedIds.includes(i.productId))
    .reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const checkoutCount = cartData.items
    .filter((i) => selectedIds.includes(i.productId))
    .reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-32 font-sans antialiased">
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* 1. Header chuẩn Cart.png */}
        <header className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition"
          >
            <svg className="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-xl font-black text-slate-900">Cart</h1>
          <button className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-800">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </header>

        {/* 2. Banner Voucher Giảm giá xanh lá */}
        <div className="bg-[#EBF9F1] text-[#1E7E34] px-4 py-3 rounded-2xl flex items-center gap-3 mb-6">
          <div className="w-6 h-6 shrink-0 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#28A745]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <p className="text-xs font-semibold leading-relaxed">
            Yuhuu, {cartData.items.length} món trong giỏ của bạn nhận ưu đãi giảm đến 45%
          </p>
        </div>

        {/* 3. Tiêu đề Your Order & Select All */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Your Order ({cartData.totalCount})
          </h2>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              checked={cartData.items.length > 0 && selectedIds.length === cartData.items.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded text-blue-600 accent-[#1877F2]"
            />
            Select All
          </label>
        </div>

        {/* 4. Danh sách Cart Items */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : cartData.items.length === 0 ? (
          <div className="text-center py-16 bg-[#F8F9FA] rounded-3xl p-6">
            <p className="text-slate-400 text-sm font-medium mb-3">Giỏ hàng của bạn đang trống!</p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-[#1877F2] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cartData.items.map((item) => {
              const isChecked = selectedIds.includes(item.productId);
              return (
                <div key={item.productId} className="flex items-center gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(item.productId)}
                    className="w-4 h-4 rounded text-blue-600 accent-[#1877F2] shrink-0"
                  />

                  {/* Card Sản phẩm */}
                  <div className="flex-1 bg-white border border-slate-100 shadow-xs rounded-2xl p-3 flex gap-3.5">
                    {/* Ảnh sản phẩm */}
                    <div className="w-20 h-20 bg-[#F8F9FA] rounded-xl flex items-center justify-center p-1.5 shrink-0">
                      <img
                        src={item.product.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80'}
                        alt={item.product.name}
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    </div>

                    {/* Nội dung chi tiết */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {item.product.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.product.category || 'Clothes'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Giá */}
                        <span className="text-sm font-black text-[#1877F2]">
                          {item.product.price > 1000
                            ? `${(item.product.price / 1000).toLocaleString('vi-VN')}k`
                            : `$${item.product.price}`}
                        </span>

                        {/* Bộ tăng giảm và nút xoá */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-xs">
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity, -1)}
                              className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold"
                            >
                              −
                            </button>
                            <span className="px-2.5 py-1 font-bold text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity, 1)}
                              className="px-2 py-1 text-slate-500 hover:bg-slate-100 font-bold"
                            >
                              +
                            </button>
                          </div>

                          {/* Thùng rác xoá món */}
                          <button
                            onClick={() => handleDeleteItem(item.productId)}
                            className="p-1 text-red-500 hover:text-red-700 transition"
                            title="Xoá món này"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. Áp dụng Voucher */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between cursor-pointer hover:opacity-80 transition">
          <div className="flex items-center gap-2.5 text-slate-800 font-bold text-xs">
            <svg className="w-5 h-5 text-[#1877F2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>Voucher</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <span>Click to Apply Voucher</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* 6. Bottom Sticky Checkout Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-xl z-40">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Total Price</p>
              <p className="text-xl font-black text-[#1877F2]">
                {checkoutTotal > 1000
                  ? `${(checkoutTotal / 1000).toLocaleString('vi-VN')}k`
                  : `$${checkoutTotal}`}
              </p>
            </div>

            <button
              onClick={() => {
                if (checkoutCount === 0) {
                  toast.error('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán!');
                  return;
                }
                toast.success(`Đặt hàng thành công ${checkoutCount} món đồ!`, { icon: '🎉' });
              }}
              className="flex-1 py-3.5 bg-[#1877F2] hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center"
            >
              Checkout ({checkoutCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
