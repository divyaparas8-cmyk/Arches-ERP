"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function ActiveNavItem({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();

  // Exact match for home, prefix match for others
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] rounded-[2px] transition-colors ${
        isActive
          ? "bg-white/10 text-white font-medium"
          : "text-white/70 hover:bg-white/5 hover:text-white font-light"
      }`}
    >
      <span className={isActive ? "mr-2" : "mr-2 opacity-0"}>•</span>
      {children}
    </Link>
  );
}
