import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import ActiveNavItem from "./ActiveNavItem";

export default async function Sidebar() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const role = user?.role || "GUEST";

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[236px] bg-near-black text-white flex flex-col justify-between overflow-y-auto">
      <div>
        {/* Logo Area */}
        <div className="p-8 pb-10">
          <h1 className="text-[17px] font-black tracking-[-0.01em] uppercase leading-none">
            Arches™
          </h1>
          <p className="text-[9px] uppercase tracking-[0.22em] text-white/50 mt-1">
            Production ERP
          </p>
        </div>

        {/* Navigation — hidden from client role (they only use /portal) */}
        {role !== "client" && (
          <nav className="flex flex-col space-y-1 px-4">
            <ActiveNavItem href="/">Dashboard</ActiveNavItem>
            <ActiveNavItem href="/quotes/new">New Quote</ActiveNavItem>
            <ActiveNavItem href="/catalog">Catalog</ActiveNavItem>
            <ActiveNavItem href="/clients">Clients</ActiveNavItem>
            <ActiveNavItem href="/vendors">Vendors</ActiveNavItem>
            <ActiveNavItem href="/invoices">Invoices</ActiveNavItem>
          </nav>
        )}

        {/* Client Portal nav — only for client role */}
        {role === "client" && (
          <nav className="flex flex-col space-y-1 px-4">
            <ActiveNavItem href="/portal">My Orders</ActiveNavItem>
          </nav>
        )}
      </div>

      {/* Footer Area */}
      <div className="p-4 flex flex-col space-y-4">
        {/* Internal staff: bordered client portal view link */}
        {role !== "client" && (
          <Link
            href="/portal"
            className="text-[10px] uppercase tracking-[0.14em] px-4 py-3 border border-white/20 text-center hover:bg-white/5 transition-colors rounded-[2px]"
          >
            Client portal view ↗
          </Link>
        )}

        {user && (
          <div className="px-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/50 mb-2 truncate">
              Signed in as · {user.name}
            </p>
            <div className="mb-3 px-2 py-1.5 text-[9px] uppercase tracking-[0.12em] rounded-[2px] text-center bg-white text-near-black font-medium">
              {role}
            </div>
            <LogoutButton />
          </div>
        )}
      </div>
    </aside>
  );
}
