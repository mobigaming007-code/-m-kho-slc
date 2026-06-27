import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Đổi Sách Lấy Cây 2026",
  description: "Công cụ nhập giao dịch, kiểm kho và quản trị kho.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
