'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Product {
  id: number;
  name: string;
  price: number;
  category?: string;
  rating?: number;
  image?: string;
}

const CATEGORIES = ['All', 'Jacket', 'Shirt', 'Jeans', 'Clothes'];

export default function LokoStorePage() {
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // State Phân trang (Pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4); // 4 sản phẩm mỗi trang (lưới 2x2 đẹp chuẩn mobile)

  // State Modal thêm sản phẩm
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Jacket');
  const [image, setImage] = useState('');

  // State Modal chỉnh sửa sản phẩm (Nâng cao 1 - PUT)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('Jacket');
  const [editImage, setEditImage] = useState('');

  // ==================== REACT QUERY (NÂNG CAO 2) ====================

  // 1. Fetch danh sách sản phẩm với useQuery (Tương thích cả Array và Object phân trang)
  const { data: rawProductData = [], isLoading: loading } = useQuery<Product[] | { products: Product[] }>({
    queryKey: ['products'],
    queryFn: () => api.get('/api/products').then((res) => res.data),
  });

  const products: Product[] = useMemo(() => {
    if (!rawProductData) return [];
    if (Array.isArray(rawProductData)) return rawProductData;
    if (Array.isArray((rawProductData as any).products)) return (rawProductData as any).products;
    return [];
  }, [rawProductData]);

  // 2. Fetch thông tin giỏ hàng để cập nhật Badge realtime
  const { data: cartData } = useQuery<{ totalCount: number }>({
    queryKey: ['cart'],
    queryFn: () => api.get<{ totalCount: number }>('/api/cart').then((res) => res.data),
  });
  const cartCount = cartData?.totalCount || 0;

  // 3. Mutation Thêm sản phẩm (POST)
  const addProductMutation = useMutation({
    mutationFn: (newProd: { name: string; price: number; category: string; image: string }) =>
      api.post('/api/products', newProd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      setName('');
      setPrice('');
      setImage('');
      toast.success('Thêm sản phẩm thành công!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra khi thêm!');
    },
  });

  // 4. Mutation Cập nhật sản phẩm (PUT)
  const updateProductMutation = useMutation({
    mutationFn: (updated: { id: number; data: Partial<Product> }) =>
      api.put(`/api/products/${updated.id}`, updated.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
      toast.success('Cập nhật sản phẩm thành công!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Lỗi cập nhật sản phẩm!');
    },
  });

  // 5. Mutation Xoá sản phẩm (DELETE)
  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Đã xoá sản phẩm', { icon: '🗑️' });
    },
    onError: () => {
      toast.error('Xoá thất bại, thử lại!');
    },
  });

  // 6. Mutation Thêm vào giỏ hàng (POST /api/cart)
  const addToCartMutation = useMutation({
    mutationFn: (productId: number) => api.post('/api/cart', { productId, quantity: 1 }),
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      const item = products.find((p) => p.id === productId);
      toast.success(`Đã thêm "${item?.name || 'món đồ'}" vào giỏ!`, { icon: '🛍️' });
    },
    onError: () => {
      toast.error('Không thể thêm vào giỏ hàng!');
    },
  });

  // ==================== HANDLERS ====================

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      toast.error('Vui lòng nhập tên và giá sản phẩm!');
      return;
    }

    addProductMutation.mutate({
      name: name.trim(),
      price: Number(price),
      category,
      image:
        image.trim() ||
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
    });
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setEditCategory(p.category || 'Jacket');
    setEditImage(p.image || '');
  };

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim() || !editPrice) {
      toast.error('Vui lòng nhập đầy đủ tên và giá!');
      return;
    }

    updateProductMutation.mutate({
      id: editingProduct.id,
      data: {
        name: editName.trim(),
        price: Number(editPrice),
        category: editCategory,
        image: editImage.trim() || editingProduct.image,
      },
    });
  };

  const handleDelete = (id: number, productName: string) => {
    if (!confirm(`Bạn chắc chắn muốn xoá "${productName}"?`)) return;
    deleteProductMutation.mutate(id);
  };

  // Lọc sản phẩm theo danh mục và tìm kiếm
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Tự động quay về trang 1 khi thay đổi danh mục, tìm kiếm hoặc số lượng trên mỗi trang
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, itemsPerPage]);

  // Tính toán các chỉ số phân trang
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // Danh sách sản phẩm hiển thị trên trang hiện tại
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, startIndex, endIndex]);

  // Xử lý chuyển trang & cuộn mượt lên đầu danh mục
  const handlePageChange = (newPage: number) => {
    const valid = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(valid);
    const section = document.getElementById('products-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Tạo danh sách số trang thông minh (rút gọn dấu ... nếu quá nhiều trang)
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (safeCurrentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (safeCurrentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-28 font-sans antialiased">
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* 1. Header LOKO */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-black text-xl tracking-tighter">
              l•
            </div>
            <span className="text-2xl font-black tracking-wider text-black">LOKO</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="relative p-2 rounded-full hover:bg-slate-100 transition"
              title="Giỏ hàng"
            >
              <svg className="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => toast.success('Bạn có 0 thông báo mới')}
              className="p-2 rounded-full hover:bg-slate-100 transition"
              title="Thông báo"
            >
              <svg className="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </header>

        {/* 2. Thanh Tìm kiếm & Nút Thêm sản phẩm (+) */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <svg
              className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-[#F8F9FA] rounded-2xl py-3 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 border border-transparent focus:bg-white transition"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-12 h-12 bg-[#1877F2] hover:bg-[#166fe5] active:scale-95 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20 transition shrink-0"
            title="Thêm sản phẩm mới"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* 3. Category Tabs (All, Jacket, Shirt, Jeans, Clothes) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isActive
                    ? 'text-slate-900 font-bold bg-slate-100'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#1877F2]" />}
                {cat}
              </button>
            );
          })}
        </div>

        {/* 4. Thanh trạng thái & Tùy chọn số lượng sản phẩm mỗi trang */}
        <div id="products-section" className="flex items-center justify-between mb-3.5 px-0.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
            <span>Hiển thị</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-md">
              {totalItems > 0 ? `${startIndex + 1}–${endIndex}` : '0'}
            </span>
            <span>/</span>
            <span className="font-bold text-slate-900">{totalItems}</span>
            <span>món</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Mỗi trang:</span>
            <div className="flex items-center bg-[#F8F9FA] p-0.5 rounded-lg border border-slate-100">
              {[4, 6, 8].map((size) => (
                <button
                  key={size}
                  onClick={() => setItemsPerPage(size)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition ${
                    itemsPerPage === size
                      ? 'bg-white text-[#1877F2] shadow-2xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title={`${size} sản phẩm mỗi trang`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Product Grid (2 Cột chuẩn thiết kế LOKO với Phân trang) */}
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-[#F8F9FA] rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-[#F8F9FA] rounded-3xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-200/70 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-slate-700 font-bold text-sm">Không tìm thấy sản phẩm nào</p>
            <p className="text-slate-400 text-xs mt-1">Thử đổi danh mục hoặc tìm từ khóa khác</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {(searchQuery || selectedCategory !== 'All') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  Xoá bộ lọc
                </button>
              )}
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#1877F2] rounded-xl hover:bg-blue-600 transition"
              >
                + Thêm sản phẩm
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-3.5">
              {paginatedProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#F8F9FA] rounded-3xl p-3 flex flex-col justify-between group hover:shadow-sm transition relative"
                >
                  {/* Nút Sửa & Xoá ở góc trên bên phải */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="w-7 h-7 rounded-full bg-white/90 hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition shadow-xs"
                      title="Chỉnh sửa sản phẩm"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="w-7 h-7 rounded-full bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition shadow-xs"
                      title="Xoá sản phẩm"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Ảnh sản phẩm */}
                  <div className="w-full h-36 flex items-center justify-center p-2 mb-2 overflow-hidden">
                    <img
                      src={p.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80'}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain rounded-xl group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>

                  {/* Thông tin sản phẩm */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {p.category || 'Clothes'}
                    </p>

                    {/* Giá, Đánh giá sao & Nút Thêm giỏ hàng */}
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-sm font-bold text-[#1877F2]">
                        {p.price > 1000 ? `${(p.price / 1000).toLocaleString('vi-VN')}k` : `$${p.price}`}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5 text-[11px] font-bold text-slate-700">
                          <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span>{p.rating || 4.5}</span>
                        </div>

                        {/* Nút Thêm vào giỏ (+) */}
                        <button
                          onClick={() => addToCartMutation.mutate(p.id)}
                          disabled={addToCartMutation.isPending}
                          className="w-6 h-6 bg-[#1877F2] hover:bg-blue-700 active:scale-95 text-white rounded-lg flex items-center justify-center shadow-xs transition disabled:opacity-50"
                          title="Thêm vào giỏ"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Thanh điều hướng Phân trang (Pagination Controls) */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-2.5">
                <div className="flex items-center gap-1.5 bg-[#F8F9FA] p-1.5 rounded-2xl border border-slate-100">
                  {/* Nút Trang trước */}
                  <button
                    onClick={() => handlePageChange(safeCurrentPage - 1)}
                    disabled={safeCurrentPage <= 1}
                    aria-label="Trang trước"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Trước</span>
                  </button>

                  {/* Danh sách các số trang */}
                  <div className="flex items-center gap-1 px-1">
                    {getPageNumbers().map((item, idx) => {
                      if (item === '...') {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-400"
                          >
                            •••
                          </span>
                        );
                      }

                      const pageNum = item as number;
                      const isActive = pageNum === safeCurrentPage;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          aria-current={isActive ? 'page' : undefined}
                          className={`w-8 h-8 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
                            isActive
                              ? 'bg-[#1877F2] text-white shadow-md shadow-blue-500/25 scale-105'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Nút Trang sau */}
                  <button
                    onClick={() => handlePageChange(safeCurrentPage + 1)}
                    disabled={safeCurrentPage >= totalPages}
                    aria-label="Trang sau"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition shadow-2xs"
                  >
                    <span className="hidden sm:inline">Sau</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Thông tin số trang hiện tại */}
                <p className="text-[11px] font-medium text-slate-400">
                  Trang <span className="font-bold text-slate-700">{safeCurrentPage}</span> / <span className="font-bold text-slate-700">{totalPages}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5A. Modal Thêm sản phẩm */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">Thêm sản phẩm mới</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Tên sản phẩm *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Loko Cool Jacket"
                  required
                  className="w-full bg-[#F8F9FA] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Giá tiền *
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="750000"
                    required
                    className="w-full bg-[#F8F9FA] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Danh mục
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F8F9FA] rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Jacket">Jacket</option>
                    <option value="Shirt">Shirt</option>
                    <option value="Jeans">Jeans</option>
                    <option value="Clothes">Clothes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  URL Ảnh (Tùy chọn)
                </label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-[#F8F9FA] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addProductMutation.isPending}
                  className="flex-1 py-3 text-xs font-bold text-white bg-[#1877F2] hover:bg-blue-700 rounded-xl transition shadow-md shadow-blue-500/25 disabled:opacity-50"
                >
                  {addProductMutation.isPending ? 'Đang thêm...' : 'Lưu sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5B. Modal Chỉnh sửa sản phẩm (Nâng cao 1 - PUT) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900">Sửa sản phẩm</h3>
                <p className="text-[11px] text-slate-400 font-medium">ID: {editingProduct.id}</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Tên sản phẩm *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-[#F8F9FA] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Giá tiền *
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    required
                    className="w-full bg-[#F8F9FA] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Danh mục
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-[#F8F9FA] rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Jacket">Jacket</option>
                    <option value="Shirt">Shirt</option>
                    <option value="Jeans">Jeans</option>
                    <option value="Clothes">Clothes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  URL Ảnh
                </label>
                <input
                  type="url"
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#F8F9FA] rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updateProductMutation.isPending}
                  className="flex-1 py-3 text-xs font-bold text-white bg-[#1877F2] hover:bg-blue-700 rounded-xl transition shadow-md shadow-blue-500/25 disabled:opacity-50"
                >
                  {updateProductMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Floating Bottom Navigation Bar (Đúng như ảnh mẫu Home.png) */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-xs w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-2 flex items-center justify-around z-40">
        <button className="w-10 h-10 bg-[#1877F2] text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>

        <Link
          href="/cart"
          className="relative p-2 text-slate-400 hover:text-slate-800 transition"
          title="Giỏ hàng"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>

        <button
          onClick={() => toast('Hỗ trợ trực tuyến')}
          className="p-2 text-slate-400 hover:text-slate-800 transition"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        <button
          onClick={() => toast('Tài khoản người dùng')}
          className="p-2 text-slate-400 hover:text-slate-800 transition"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </nav>
    </div>
  );
}
