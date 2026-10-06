const express = require('express');
const cors = require('cors');

const app = express();

// 1. Cấu hình CORS
app.use(cors({
  origin: 'http://localhost:3000', // chỉ cho phép NextJS
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// 2. Parser JSON body
app.use(express.json());

// 3. Mock Database (in-memory)
let products = [
  { id: 1, name: 'Áo thun basic', price: 150000 },
  { id: 2, name: 'Quần jeans slim', price: 450000 },
];

// 4. Route GET - Lấy danh sách sản phẩm
app.get('/api/products', (req, res) => {
  res.json(products);
});

// 5. Route POST - Thêm sản phẩm mới (Tiết 2)
app.post('/api/products', (req, res) => {
  const { name, price } = req.body;

  // Validation đơn giản
  if (!name || !price) {
    return res.status(400).json({ error: 'Thiếu dữ liệu (name hoặc price)' });
  }

  const newProduct = {
    id: Date.now(),
    name,
    price: Number(price)
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

// 6. Route DELETE - Xoá sản phẩm theo ID (Tiết 4)
app.delete('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = products.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }

  products.splice(index, 1);
  res.json({ message: 'Đã xoá thành công' });
});

// 7. Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend chạy tại port :${PORT}`);
});
