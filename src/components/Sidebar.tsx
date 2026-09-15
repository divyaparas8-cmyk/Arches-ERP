import Link from "next/link";
import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

        {/* Navigation */}
        <nav className="flex flex-col space-y-1 px-4">
          <NavItem href="/" active>Dashboard</NavItem>
          <NavItem href="/quotes/new">New Quote</NavItem>
          <NavItem href="/catalog">Catalog</NavItem>
          <NavItem href="/clients">Clients</NavItem>
          <NavItem href="/vendors">Vendors</NavItem>
          <NavItem href="/invoices">Invoices</NavItem>
        </nav>
      </div>

      {/* Footer Area */}
      <div className="p-4 flex flex-col space-y-6">
        <Link 
          href="/portal" 
          className="text-[10px] uppercase tracking-[0.14em] px-4 py-3 border border-white/20 text-center hover:bg-white/5 transition-colors rounded-[2px]"
        >
          Client portal ↗
        </Link>
        
        {user && (
          <div className="px-2">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/50 mb-2 truncate">
              Signed in as · {user.name}
            </p>
            <div className="flex flex-wrap gap-2">
              <RoleBadge role={role} active={true} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function NavItem({ href, children, active = false }: { href: string, children: ReactNode, active?: boolean }) {
  return (
    <Link 
      href={href}
      className={`px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] rounded-[2px] transition-colors ${
        active 
          ? "bg-white/10 text-white font-medium" 
          : "text-white/70 hover:bg-white/5 hover:text-white font-light"
      }`}
    >
      <span className={active ? "mr-2" : "mr-2 opacity-0"}>•</span>
      {children}
    </Link>
  );
}

function RoleBadge({ role, active }: { role: string, active: boolean }) {
  return (
    <div className={`px-2 py-1.5 text-[9px] uppercase tracking-[0.12em] rounded-[2px] flex-1 text-center ${
      active ? "bg-white text-near-black font-medium" : "text-white/50 border border-white/10"
    }`}>
      {role}
    </div>
  );
}
