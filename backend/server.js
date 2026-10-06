const express = require('express');
const cors = require('cors');

const app = express();

// app.use(cors({
//   origin: 'http://localhost:3000', // chỉ cho phép NextJS
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type']
// }));

app.use(express.json());

let products = [
  { id: 1, name: 'Áo thun basic', price: 150000 },
  { id: 2, name: 'Quần jeans slim', price: 450000 },
];

app.get('/api/products', (req, res) => {
  res.json(products);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend chạy tại port :${PORT}`);
});
