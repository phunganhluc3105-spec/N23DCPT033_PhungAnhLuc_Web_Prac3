require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const DEFAULT_DATA_PATH = path.join(__dirname, 'data.json');
const DATA_PATH = process.env.DATA_PATH || DEFAULT_DATA_PATH;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// 1. Cấu hình CORS linh hoạt (Localhost + Vercel + Biến môi trường FRONTEND_URL)
app.use(cors({
  origin: (origin, callback) => {
    // Cho phép các request không có origin (curl, Postman, SSR server-to-server)
    if (!origin) return callback(null, true);

    const isAllowed = 
      origin.includes('localhost') ||
      origin.endsWith('.vercel.app') ||
      (FRONTEND_URL && origin === FRONTEND_URL);

    if (isAllowed) {
      return callback(null, true);
    }

    // Mặc định cho phép để tránh chặn nhầm khi người dùng test trên domain preview khác
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Chuẩn hoá đường dẫn URL (tự động loại bỏ dấu gạch chéo kép //api/...)
app.use((req, res, next) => {
  req.url = req.url.replace(/\/{2,}/g, '/');
  next();
});

// 3. Parser JSON body
app.use(express.json());

// 3. Helper khởi tạo & đọc/ghi dữ liệu bền vững (Nâng cao 3 - data.json & Fly Volume)
async function initData() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    try {
      console.log(`Chưa tìm thấy ${DATA_PATH}, khởi tạo dữ liệu mẫu từ ${DEFAULT_DATA_PATH}...`);
      await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
      const defaultContent = await fs.readFile(DEFAULT_DATA_PATH, 'utf-8');
      await fs.writeFile(DATA_PATH, defaultContent, 'utf-8');
      console.log(`Đã khởi tạo file dữ liệu thành công tại ${DATA_PATH}`);
    } catch (err) {
      console.error('Lỗi khi khởi tạo file dữ liệu ban đầu:', err.message);
    }
  }
}

async function readData() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Lỗi đọc ${DATA_PATH}, thử khôi phục từ mẫu mặc định:`, error.message);
    try {
      await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
      const defaultRaw = await fs.readFile(DEFAULT_DATA_PATH, 'utf-8');
      const defaultData = JSON.parse(defaultRaw);
      await fs.writeFile(DATA_PATH, defaultRaw, 'utf-8');
      return defaultData;
    } catch (fallbackErr) {
      console.error('Lỗi khởi tạo dữ liệu mặc định:', fallbackErr.message);
      return { products: [], cart: [] };
    }
  }
}

async function writeData(data) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ==================== CÁC ROUTE PRODUCTS ====================

// GET /api/products - Lấy danh sách sản phẩm (hỗ trợ phân trang: page, limit, category, search)
app.get('/api/products', async (req, res) => {
  try {
    const data = await readData();
    let products = data.products || [];

    const { category, search, page, limit } = req.query;

    // Lọc theo danh mục nếu có
    if (category && category !== 'All') {
      products = products.filter(
        (p) => p.category && p.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Lọc theo từ khoá tìm kiếm nếu có
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) => p.name && p.name.toLowerCase().includes(q)
      );
    }

    // Nếu có tham số page hoặc limit -> Trả về dữ liệu phân trang
    if (page !== undefined || limit !== undefined) {
      const currentPage = Math.max(1, parseInt(page, 10) || 1);
      const perPage = Math.max(1, parseInt(limit, 10) || 4);
      const total = products.length;
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      const startIndex = (currentPage - 1) * perPage;
      const paginatedProducts = products.slice(startIndex, startIndex + perPage);

      return res.json({
        products: paginatedProducts,
        pagination: {
          total,
          page: currentPage,
          limit: perPage,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        },
      });
    }

    // Mặc định trả về toàn bộ mảng để tương thích ngược hoàn toàn với code cũ
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// POST /api/products - Thêm sản phẩm mới (Tiết 2)
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, category, image } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Thiếu dữ liệu (name hoặc price)' });
    }

    const data = await readData();
    const newProduct = {
      id: Date.now(),
      name: name.trim(),
      category: category?.trim() || 'Clothes',
      price: Number(price),
      rating: 4.5,
      image: image?.trim() || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80'
    };

    data.products = data.products || [];
    data.products.push(newProduct);
    await writeData(data);

    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi thêm sản phẩm' });
  }
});

// PUT /api/products/:id - Sửa thông tin sản phẩm (Nâng cao 1 - BONUS)
app.put('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readData();
    data.products = data.products || [];
    const index = data.products.findIndex((p) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    data.products[index] = { ...data.products[index], ...req.body };
    await writeData(data);

    res.json(data.products[index]);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật sản phẩm' });
  }
});

// DELETE /api/products/:id - Xoá sản phẩm theo ID (Tiết 4)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readData();
    data.products = data.products || [];
    const index = data.products.findIndex((p) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    data.products.splice(index, 1);
    // Xóa sản phẩm khỏi giỏ nếu có
    if (data.cart) {
      data.cart = data.cart.filter((item) => item.productId !== id);
    }
    await writeData(data);

    res.json({ message: 'Đã xoá thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xoá sản phẩm' });
  }
});

// ==================== CÁC ROUTE CART (NÂNG CAO 4) ====================

// GET /api/cart - Lấy danh sách giỏ hàng kèm chi tiết sản phẩm và tổng tiền
app.get('/api/cart', async (req, res) => {
  try {
    const data = await readData();
    const products = data.products || [];
    const cart = data.cart || [];

    const items = cart.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        quantity: item.quantity,
        product: product || {
          id: item.productId,
          name: 'Sản phẩm không xác định',
          price: 0,
          image: ''
        }
      };
    });

    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ items, total, totalCount });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải giỏ hàng' });
  }
});

// POST /api/cart - Thêm sản phẩm vào giỏ
app.post('/api/cart', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const pid = Number(productId);
    const data = await readData();
    data.products = data.products || [];
    data.cart = data.cart || [];

    const product = data.products.find((p) => p.id === pid);
    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm để thêm vào giỏ' });
    }

    const existing = data.cart.find((i) => i.productId === pid);
    if (existing) {
      existing.quantity += Number(quantity);
    } else {
      data.cart.push({ productId: pid, quantity: Number(quantity) });
    }

    await writeData(data);
    res.status(201).json({ message: 'Đã thêm vào giỏ hàng', cart: data.cart });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi thêm vào giỏ hàng' });
  }
});

// PUT /api/cart/:productId - Tăng / Giảm số lượng trong giỏ
app.put('/api/cart/:productId', async (req, res) => {
  try {
    const pid = Number(req.params.productId);
    const { quantity } = req.body;
    const data = await readData();
    data.cart = data.cart || [];

    const item = data.cart.find((i) => i.productId === pid);
    if (!item) {
      return res.status(404).json({ error: 'Sản phẩm không có trong giỏ hàng' });
    }

    const newQty = Number(quantity);
    if (newQty <= 0) {
      data.cart = data.cart.filter((i) => i.productId !== pid);
    } else {
      item.quantity = newQty;
    }

    await writeData(data);
    res.json({ message: 'Đã cập nhật số lượng' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật giỏ hàng' });
  }
});

// DELETE /api/cart/:productId - Xoá sản phẩm khỏi giỏ
app.delete('/api/cart/:productId', async (req, res) => {
  try {
    const pid = Number(req.params.productId);
    const data = await readData();
    data.cart = data.cart || [];

    const index = data.cart.findIndex((i) => i.productId === pid);
    if (index === -1) {
      return res.status(404).json({ error: 'Sản phẩm không có trong giỏ hàng' });
    }

    data.cart.splice(index, 1);
    await writeData(data);

    res.json({ message: 'Đã xoá sản phẩm khỏi giỏ hàng' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xoá sản phẩm khỏi giỏ' });
  }
});

// 4. Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await initData();
  console.log(`Backend chạy tại port :${PORT} (Lưu trữ: ${DATA_PATH})`);
});
