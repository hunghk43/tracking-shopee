# 📦 Theo dõi vận đơn — GHN + SPX

Web app theo dõi vận đơn **GHN** và **SPX (Shopee Express)** với thông báo push real-time.

---

## ✨ Tính năng

| Tính năng | Mô tả |
|---|---|
| 🔍 Tra cứu nhanh | Tra cứu ngay mà không cần lưu |
| 📋 Danh sách theo dõi | Lưu tối đa **500 đơn** mỗi tài khoản |
| 🔢 Đánh số thứ tự | Đơn đầu tiên = #1, đơn tiếp theo = #2, tăng dần theo thứ tự thêm vào |
| 🔔 Push Notification | Thông báo khi trạng thái thay đổi |
| ⏱ Tự động cập nhật | Cron quét mỗi 5 phút qua GitHub Actions |
| 📝 Ghi chú đơn | Đặt tên tuỳ theo kiện hàng |
| 🗑 Xóa hàng loạt | Xóa tất cả đã giao / hủy-hoàn |
| 📱 PWA | Cài được lên màn hình điện thoại |
| 🌙 Dark mode | Giao diện tối mặc định |
| 🔒 Đăng nhập | Xác thực qua Supabase Auth (email/password) |
| 🔑 Đặt lại mật khẩu | Gửi link reset về email |

---

## 🗂 Logic thứ tự đơn hàng

- Mỗi đơn được gán **số thứ tự tăng dần** (`display_id`) theo thứ tự thêm vào.
- Số **không bao giờ tái sử dụng** — kể cả khi xóa đơn cũ, số tiếp theo vẫn là `max + 1`.
- UI hiển thị **đơn mới nhất lên đầu** (số lớn nhất trước).
- Đơn **không bao giờ tự bị xóa** — chỉ mất đi khi user bấm xóa thủ công.

---

## ⚙️ Hệ thống cron quét vận đơn

```
Cron chạy mỗi 5 phút (GitHub Actions)
  → Chỉ quét đơn chưa giao (is_delivered = false)
  → Bỏ qua đơn đã giao / hủy / hoàn hàng
  → Đơn mới thêm (chưa tra lần nào) → ưu tiên quét trước
  → Nếu trạng thái thay đổi → gửi Push Notification
  → Không tự archive hay xóa đơn nào
```

---

## 🚀 Hướng dẫn triển khai

### Bước 1 — Tạo Supabase project

1. Vào [supabase.com](https://supabase.com) → **New project**
2. **SQL Editor** → **New query** → paste nội dung `supabase/schema.sql` → **Run**
3. Vào **Settings → API**, lấy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Bước 2 — Tạo VAPID keys (Push Notification)

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
NEXT_PUBLIC_ADMIN_EMAIL=your@email.com
```

### Bước 4 — Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000

### Bước 5 — Deploy Vercel

1. Push code lên GitHub (bỏ `.env.local`)
2. [vercel.com](https://vercel.com) → Import repo
3. **Environment Variables** → thêm tất cả biến trong `.env.local`
4. Deploy

### Bước 6 — Cấu hình GitHub Actions (cron)

Thêm 2 secrets vào repo GitHub (**Settings → Secrets → Actions**):

| Secret | Giá trị |
|---|---|
| `CRON_SECRET` | Cùng giá trị với `.env.local` |
| `VERCEL_APP_URL` | URL app Vercel, VD: `https://tracking-shopee.vercel.app` |

File `.github/workflows/cron.yml` sẽ tự gọi cron mỗi 5 phút.

---

## 📁 Cấu trúc project

```
├── app/
│   ├── api/
│   │   ├── track/                    # Tra cứu nhanh (không lưu DB)
│   │   ├── trackings/
│   │   │   ├── route.ts              # GET list, POST add (giới hạn 500 đơn)
│   │   │   ├── [id]/route.ts         # DELETE, PATCH note, POST check
│   │   │   └── bulk-delete/          # Xóa hàng loạt
│   │   ├── push/subscribe/           # Đăng ký/huỷ push notification
│   │   ├── cron/
│   │   │   ├── check-trackings/      # Worker quét vận đơn
│   │   │   └── status/               # Trạng thái lần check cuối
│   │   ├── admin/users/              # Quản lý users (admin only)
│   │   └── presence/                 # Online presence
│   ├── admin/page.tsx                # Admin dashboard
│   ├── login/page.tsx                # Đăng nhập
│   ├── reset-password/page.tsx       # Đặt lại mật khẩu
│   ├── settings/page.tsx             # Cài đặt tài khoản
│   ├── page.tsx                      # Dashboard chính
│   └── layout.tsx
├── components/
│   ├── StatsBar.tsx                  # Thống kê 4 ô
│   ├── TrackingCard.tsx              # Card đơn trong danh sách
│   ├── TrackingDetail.tsx            # Panel chi tiết + hành trình
│   ├── AddTrackingModal.tsx          # Modal thêm đơn
│   ├── QuickTrackModal.tsx           # Modal tra cứu nhanh
│   ├── DeleteConfirmModal.tsx        # Confirm xóa
│   ├── StatusBadge.tsx               # Badge trạng thái
│   ├── Toast.tsx                     # Thông báo toast
│   ├── BulkToolbar.tsx               # Toolbar chọn nhiều đơn
│   ├── BottomNav.tsx                 # Nav mobile
│   ├── CronStatusBar.tsx             # Hiện thời gian check cuối
│   └── PushNotificationBtn.tsx       # Nút bật/tắt push
├── lib/
│   ├── tracker.ts                    # Logic gọi API GHN + SPX
│   ├── db.ts                         # Helpers Supabase
│   ├── supabase.ts                   # Supabase client
│   └── ratelimit.ts                  # Rate limiting
├── hooks/
│   ├── useAuth.ts                    # Auth state
│   ├── useToast.ts                   # Toast state
│   ├── usePresence.ts                # Online presence
│   ├── useFaviconBadge.ts            # Favicon badge (số đơn đang VC)
│   └── useUserId.ts                  # User ID helper
├── types/index.ts                    # TypeScript types
├── public/
│   ├── sw.js                         # Service Worker (push notifications)
│   └── manifest.json                 # PWA manifest
├── supabase/schema.sql               # SQL tạo bảng
├── .github/workflows/cron.yml        # GitHub Actions cron (mỗi 5 phút)
└── vercel.json                       # Vercel config
```

---

## ⚙️ Cách hoạt động tổng quát

```
User đăng ký / đăng nhập
  → Supabase Auth (email + password)
  → Có thể đặt lại mật khẩu qua email

User thêm mã vận đơn
  → POST /api/trackings
  → Tra cứu GHN/SPX ngay lần đầu
  → Lưu vào Supabase với display_id = max + 1
  → Hiện kết quả ngay trên UI

GitHub Actions Cron (mỗi 5 phút)
  → GET /api/cron/check-trackings (với CRON_SECRET)
  → Chỉ quét đơn is_delivered=false và chưa hủy/hoàn
  → Đơn mới thêm → ưu tiên quét trước
  → Nếu trạng thái thay đổi → gửi Web Push Notification
  → Không tự xóa hay archive bất kỳ đơn nào

User nhận notification
  → Click → mở web → tự refresh danh sách
```

---

## 🔒 Giới hạn & bảo vệ

- Tối đa **500 đơn** mỗi tài khoản
- Rate limit: 60 GET/phút, 10 POST/phút per IP
- Cron yêu cầu `CRON_SECRET` header (GitHub Actions tự gửi)
- Mỗi lần cron xử lý tối đa **50 đơn** để tránh timeout Vercel (55s)
