import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { orders: true } }
    }
  });

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <h2 className="text-[10px] uppercase tracking-[0.14em] text-dark-grey mb-4">Clients</h2>
      <div className="bg-white border border-warm-grey rounded-[2px] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#F4F2EE] border-b border-warm-grey">
            <tr>
              <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Client</th>
              <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Contact</th>
              <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Email</th>
              <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Location</th>
              <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium text-right">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-grey text-[14px]">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-off-white transition-colors">
                <td className="px-5 py-4 font-medium">{client.name}</td>
                <td className="px-5 py-4">{client.contact || "—"}</td>
                <td className="px-5 py-4 text-mid-grey">{client.email || "—"}</td>
                <td className="px-5 py-4 text-mid-grey">{client.loc || "—"}</td>
                <td className="px-5 py-4 text-right font-medium">{client._count.orders}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-mid-grey text-[12px]">No clients found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
