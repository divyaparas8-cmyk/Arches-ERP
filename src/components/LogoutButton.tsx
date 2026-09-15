"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded-[2px] transition-colors text-center"
    >
      Sign Out
    </button>
  );
}
