"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Giao dịch" },
  { href: "/kiem-kho", label: "Kiểm kho" },
  { href: "/admin", label: "Admin" },
];

export function AppShell({
  icon,
  subtitle,
  heroTitle,
  heroText,
  children,
}: {
  icon: string;
  subtitle: string;
  heroTitle: string;
  heroText: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo" aria-hidden="true">
            {icon}
          </div>
          <div>
            <h1>Đổi Sách Lấy Cây</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} className={active ? "active" : ""} href={item.href}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <section className="hero">
        <h2>{heroTitle}</h2>
        <p>{heroText}</p>
      </section>
      {children}
      <div className="footer-space" />
    </div>
  );
}
