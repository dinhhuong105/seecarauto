import type { Metadata } from "next";
import "./globals.css";

// M00: no next/font/google here — the build must not fetch fonts from the
// network (the dev/CI network blocks fonts.googleapis.com, which fails
// `next build`). Body font is the system stack defined in globals.css
// (Inter first when installed locally, otherwise system-ui). A self-hosted
// font is an M01 UI/UX decision (see ARCHITECTURE_DECISIONS.md ADR-011).

export const metadata: Metadata = {
  title: "SeeCar Auto — Trang quản trị",
  description:
    "Trang quản trị SeeCar Auto: quản lý sản phẩm, đơn hàng, tương thích xe và phân quyền động RBAC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
