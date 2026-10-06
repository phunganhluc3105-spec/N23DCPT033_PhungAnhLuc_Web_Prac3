# LAB 3 – Thực hành Tổng hợp Fullstack Integration: NextJS + Express

## 👨‍🎓 Thông tin sinh viên

| Thông tin     | Nội dung      |
| ------------- | ------------- |
| **Họ và tên** | Phùng Anh Lực |
| **MSSV**      | N23DCPT033    |
| **Lớp**       | D23CQPTUD01-N |
| **Môn học**   | Lập trình Web |

---

## ✨ Tính năng chính (Key Features)

### 1. **Danh mục sản phẩm (Products)**

* Hiển thị dạng lưới 2 cột chuẩn thiết kế tối giản LOKO.
* Tìm kiếm theo từ khóa và lọc danh mục thời gian thực (*All, Jacket, Shirt, Jeans*).
* **CRUD đầy đủ:** Thêm mới (POST), Chỉnh sửa thông tin (PUT qua modal), Xóa sản phẩm (DELETE với Optimistic Update).

### 2. **Quản lý Giỏ hàng (Cart Module)**

* Badge số lượng giỏ hàng nhảy số thời gian thực trên Header và Navigation.
* Tăng / Giảm số lượng, xóa từng món, tick chọn sản phẩm thanh toán.
* Tự động tính tổng tiền (*Total Price*) tức thì.

### 3. **Hiệu năng & Trải nghiệm (UX)**

* Quản lý Server-State tự động với **TanStack React Query** (auto-cache ngầm, `invalidateQueries`).
* Thông báo phản hồi trực quan với **React Hot Toast**.
* Dữ liệu không bị mất khi restart server nhờ cơ chế lưu trữ bền vững `data.json`.

---

## 🛠️ Hướng dẫn cài đặt & Khởi chạy (Local Development)

### 1. Khởi động Backend (Port 5000)

```bash
cd backend

npm install

npm run dev

# Backend chạy tại: http://localhost:5000
```

### 2. Khởi động Frontend (Port 3000)

Mở một tab terminal mới:

```bash
cd frontend

npm install

npm run dev

# Truy cập giao diện tại: http://localhost:3000
```

---

## 📡 Danh sách REST API Endpoints

| Method   | Endpoint               | Mô tả                                   |
| :------- | :--------------------- | :-------------------------------------- |
| `GET`    | `/api/products`        | Lấy danh sách toàn bộ sản phẩm          |
| `POST`   | `/api/products`        | Thêm sản phẩm mới                       |
| `PUT`    | `/api/products/:id`    | Cập nhật thông tin sản phẩm             |
| `DELETE` | `/api/products/:id`    | Xóa sản phẩm theo ID                    |
| `GET`    | `/api/cart`            | Lấy giỏ hàng & tính tổng tiền           |
| `POST`   | `/api/cart`            | Thêm sản phẩm vào giỏ hàng              |
| `PUT`    | `/api/cart/:productId` | Tăng / giảm số lượng sản phẩm trong giỏ |
| `DELETE` | `/api/cart/:productId` | Xóa sản phẩm khỏi giỏ hàng              |

---
