import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Theo dõi vận đơn | GHN · SPX",
  description: "Tra cứu và theo dõi vận đơn GHN, SPX (Shopee Express) tự động. Nhận thông báo khi trạng thái thay đổi.",
  keywords: "tra cứu vận đơn, GHN, SPX, Shopee Express, theo dõi đơn hàng",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
