# HƯỚNG DẪN DEPLOY FULLSTACK SHOP: FLY.IO (BACKEND) & VERCEL (FRONTEND)

Tài liệu này hướng dẫn chi tiết từng bước đưa ứng dụng Fullstack (Express REST API + Next.js App Router) lên môi trường Production thực tế.

---

## KIẾN TRÚC TRIỂN KHAI PRODUCTION

```
[ Người dùng (Browser) ]
         │
         ├── 1. Truy cập Domain Web: https://loko-shop.vercel.app (Hosted on VERCEL)
         │
         └── 2. Gọi REST API: https://loko-backend.fly.dev/api/... (Hosted on FLY.IO)
                     │
                     └── Ghi dữ liệu bền vững vào data.json
```

---

## PHẦN 1: DEPLOY BACKEND EXPRESS LÊN FLY.IO

Fly.io là nền tảng máy chủ biên (edge cloud) hiện đại, hỗ trợ chạy Docker container gần người dùng nhất và có gói miễn phí/rẻ cho lập trình viên.

### Bước 1: Cài đặt công cụ Flyctl (CLI)
Mở PowerShell (chạy với quyền Administrator):
```powershell
# Cài đặt flyctl qua PowerShell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```
*(Sau khi cài đặt xong, bạn tắt mở lại terminal để nhận diện lệnh `fly`).*

### Bước 2: Đăng nhập tài khoản Fly.io
```powershell
fly auth login
```
Trình duyệt sẽ mở ra để bạn xác thực tài khoản (hoặc đăng nhập bằng GitHub).

### Bước 3: Khởi tạo ứng dụng trên Fly.io
Di chuyển vào thư mục `backend`:
```powershell
cd backend
fly launch --no-deploy
```
* CLI sẽ hỏi tên app (ví dụ: `loko-shop-backend-xyz` - tên phải là duy nhất trên toàn cầu).
* Chọn khu vực gần Việt Nam nhất: **Singapore (`sin`)** hoặc **Tokyo (`nrt`)**.
* CLI sẽ tự động tạo file cấu hình `fly.toml`.

### Bước 4: Cấu hình cổng và Volume (Lưu file data.json bền vững)
Kiểm tra file `backend/fly.toml`, đảm bảo mục internal port là `5000`:
```toml
[http_service]
  internal_port = 5000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
```

*(Tùy chọn nâng cao - Lưu trữ đĩa cứng bền vững)*:
```powershell
# Tạo một ổ đĩa cứng 1GB gắn vào máy ảo:
fly volumes create loko_data --size 1 --region sin
```
Thêm vào cuối `fly.toml`:
```toml
[mounts]
  source = "loko_data"
  destination = "/app/data"
```

### Bước 5: Triển khai (Deploy)
```powershell
fly deploy
```
Sau khi hoàn tất, bạn sẽ nhận được URL công khai của backend, ví dụ:
👉 `https://loko-shop-backend-xyz.fly.dev`

Kiểm tra API trực tiếp trên trình duyệt:
`https://loko-shop-backend-xyz.fly.dev/api/products`

---

## PHẦN 2: DEPLOY FRONTEND NEXT.JS LÊN VERCEL

Vercel là công ty sáng lập Next.js và là nền tảng lưu trữ Next.js tối ưu nhất thế giới (tự động tối ưu hình ảnh, Server Components, Edge Network).

### Bước 1: Đẩy toàn bộ mã nguồn lên GitHub
1. Tạo một repository mới trên GitHub (ví dụ: `fullstack-shop`).
2. Tại thư mục gốc `h:\Programming\Web\fullstack-shop`:
   ```powershell
   git remote add origin https://github.com/<tai-khoan-cua-ban>/fullstack-shop.git
   git branch -M main
   git push -u origin main
   ```

### Bước 2: Kết nối dự án trên Vercel
1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
2. Bấm nút **"Add New..."** $\rightarrow$ chọn **"Project"**.
3. Tìm và chọn repository `fullstack-shop` của bạn $\rightarrow$ bấm **"Import"**.

### Bước 3: Cấu hình thư mục và Biến môi trường (Environment Variables)
* **Root Directory:** Bấm nút **Edit** và chọn thư mục: `frontend`.
* **Framework Preset:** Vercel tự động nhận diện là **Next.js**.
* **Environment Variables:** Mở mục này và thêm 1 biến quan trọng:
  * **Key:** `NEXT_PUBLIC_API_URL`
  * **Value:** URL backend Fly.io bạn vừa deploy ở Phần 1 (Ví dụ: `https://loko-shop-backend-xyz.fly.dev`).

### Bước 4: Bấm Deploy
Bấm nút **"Deploy"**. Trong vòng 60 giây, Vercel sẽ build dự án và cấp cho bạn một domain trực tiếp (Ví dụ: `https://fullstack-shop-yourname.vercel.app`).

---

## PHẦN 3: CẬP NHẬT BIẾN MÔI TRƯỜNG CORS TRÊN BACKEND

Để bảo mật và cho phép frontend Vercel gọi API sang Fly.io mà không bị chặn CORS:
1. Mở terminal tại thư mục `backend`.
2. Thiết lập biến môi trường `FRONTEND_URL` trên Fly.io:
   ```powershell
   fly secrets set FRONTEND_URL=https://fullstack-shop-yourname.vercel.app
   ```
Fly.io sẽ tự động restart máy ảo với cấu hình CORS mới.

---

## TỔNG KẾT CHECKLIST SAU KHI DEPLOY
- [ ] Backend Fly.io trả về danh sách JSON khi truy cập `/api/products`.
- [ ] Frontend Vercel hiển thị giao diện LOKO sắc nét, load mượt mà trên điện thoại và máy tính.
- [ ] Thêm sản phẩm trên Vercel $\rightarrow$ dữ liệu lưu vào Backend Fly.io $\rightarrow$ F5 không mất.
- [ ] Giỏ hàng và chỉnh sửa sản phẩm hoạt động trơn tru trên môi trường internet toàn cầu!
