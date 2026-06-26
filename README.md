# 📦 Theo dõi vận đơn — GHN + SPX

Web app tra cứu và theo dõi vận đơn **GHN** và **SPX (Shopee Express)** real-time.

## ✨ Tính năng

| Tính năng | Mô tả |
|---|---|
| 🔍 Tra cứu nhanh | Tra cứu ngay không cần lưu |
| 📋 Danh sách theo dõi | Lưu tối đa 100 đơn/thiết bị |
| 🔔 Push Notification | Thông báo khi trạng thái thay đổi |
| ⏱ Tự động cập nhật | Quét mỗi 15 phút qua Vercel Cron |
| � Ghi chú đơn | Đặt tên tuỳ theo kiện hàng |
| 🗑 Xóa hàng loạt | Xóa tất cả đã giao / hủy-hoàn |
| 📱 PWA | Cài được lên màn hình điện thoại |
| 🌙 Dark mode | Giao diện tối mặc định |

## 🚀 Hướng dẫn triển khai

### Bước 1 — Tạo Supabase project

1. Vào [supabase.com](https://supabase.com) → **New project**
2. **SQL Editor** → **New query** → paste nội dung `supabase/schema.sql` → **Run**
3. Vào **Settings → API**, lấy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Bước 2 — Tạo VAPID keys

```bash
npm run generate-vapid
```

Copy 2 dòng `NEXT_PUBLIC_VAPID_PUBLIC_KEY=...` và `VAPID_PRIVATE_KEY=...`

### Bước 3 — Điền `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKunuZup9Aa...
VAPID_PRIVATE_KEY=lFqHtDxpp...
VAPID_MAILTO=mailto:you@gmail.com

CRON_SECRET=abc123xyz_random_string
```

### Bước 4 — Chạy local

```bash
npm run dev
```

Mở http://localhost:3000

### Bước 5 — Deploy Vercel

**Option A: GitHub**
1. Push code lên GitHub (bỏ `.env.local`)
2. [vercel.com](https://vercel.com) → Import repo
3. **Environment Variables** → thêm tất cả biến trong `.env.local`
4. Deploy

**Option B: CLI**
```bash
npm i -g vercel
vercel --prod
# Thêm env vars qua vercel.com dashboard hoặc:
vercel env add NEXT_PUBLIC_SUPABASE_URL
```

> **Cron tự động:** Vercel đọc `vercel.json` và gọi `/api/cron/check-trackings` mỗi 15 phút tự động.

## 📁 Cấu trúc project

```
├── app/
│   ├── api/
│   │   ├── track/              # Tra cứu nhanh (không lưu DB)
│   │   ├── trackings/          # CRUD danh sách
│   │   │   ├── route.ts        # GET list, POST add
│   │   │   ├── [id]/route.ts   # DELETE, PATCH note, POST check
│   │   │   └── bulk-delete/    # Xóa hàng loạt
│   │   ├── push/subscribe/     # Đăng ký/huỷ push notification
│   │   └── cron/check-trackings/ # Worker quét định kỳ
│   ├── page.tsx                # Dashboard chính
│   └── layout.tsx
├── components/
│   ├── StatsBar.tsx            # Thống kê 4 ô
│   ├── TrackingCard.tsx        # Card đơn trong danh sách
│   ├── TrackingDetail.tsx      # Panel chi tiết + hành trình
│   ├── AddTrackingModal.tsx    # Modal thêm đơn
│   ├── QuickTrackModal.tsx     # Modal tra cứu nhanh
│   ├── DeleteConfirmModal.tsx  # Confirm xóa
│   ├── StatusBadge.tsx         # Badge trạng thái
│   ├── Toast.tsx               # Thông báo toast
│   └── PushNotificationBtn.tsx # Nút bật/tắt push
├── lib/
│   ├── tracker.ts              # Logic gọi API GHN + SPX
│   ├── db.ts                   # Helpers Supabase
│   └── supabase.ts             # Supabase client
├── hooks/
│   ├── useUserId.ts            # Anonymous UUID từ localStorage
│   └── useToast.ts             # Toast state
├── types/index.ts              # TypeScript types
├── public/sw.js                # Service Worker (push notifications)
├── supabase/schema.sql         # SQL tạo bảng
└── vercel.json                 # Cron config
```

## ⚙️ Cách hoạt động

```
User mở web
  → Tạo UUID ẩn danh lưu localStorage (không cần đăng nhập)
  → Tải danh sách từ Supabase

User thêm mã
  → POST /api/trackings
  → Tra cứu GHN/SPX ngay lần đầu
  → Lưu vào Supabase
  → Hiện kết quả ngay

Vercel Cron (mỗi 15 phút)
  → GET /api/cron/check-trackings
  → Gọi GHN/SPX API cho từng đơn chưa hoàn thành
  → Nếu status thay đổi → gửi Web Push Notification
  → Update Supabase

User nhận notification
  → Click → mở web → tự refresh
```
