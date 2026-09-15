import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <h2 className="text-[10px] uppercase tracking-[0.14em] text-dark-grey mb-4">Vendors</h2>
      <div className="bg-white border border-warm-grey rounded-[2px] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#F4F2EE] border-b border-warm-grey">
            <tr>
              <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Vendor</th>
              <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Capability</th>
              <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Location</th>
              <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Lead Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-grey text-[14px]">
            {vendors.map((vendor: any) => (
              <tr key={vendor.id} className="hover:bg-off-white transition-colors">
                <td className="px-5 py-4 font-medium">{vendor.name}</td>
                <td className="px-5 py-4">{vendor.type}</td>
                <td className="px-5 py-4 text-mid-grey">{vendor.loc}</td>
                <td className="px-5 py-4 text-mid-grey">{vendor.lead}</td>
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-mid-grey text-[12px]">No vendors found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
