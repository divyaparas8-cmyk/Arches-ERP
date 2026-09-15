import prisma from "@/lib/prisma";
import ColorSwatch from "@/components/ColorSwatch";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import InlinePriceInput from "@/components/InlinePriceInput";
import { updateSkuPrice, updateEmbPrice } from "./actions";
import { AddSkuFooter, AddEmbFooter, AddColorwayFooter } from "./AddFooters";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const canEdit = user?.role === "owner" || user?.role === "sales";

  const [skus, embellishments, colorways, vendors] = await Promise.all([
    prisma.sku.findMany({
      include: { vendor: true },
      orderBy: { code: "asc" }
    }),
    prisma.embellishment.findMany({
      include: { vendor: true },
      orderBy: { name: "asc" }
    }),
    prisma.colorway.findMany({
      orderBy: { name: "asc" }
    }),
    prisma.vendor.findMany({
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-12">
      {/* Blanks Table */}
      <div>
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-dark-grey mb-4">Blanks</h2>
        <div className="bg-white border border-warm-grey rounded-[2px] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#F4F2EE] border-b border-warm-grey">
              <tr>
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">SKU</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Name</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Category</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">GSM</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Brand</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Vendor</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium text-right w-[100px]">Cost £</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium text-right w-[100px]">Base £</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-grey text-[14px]">
              {skus.map((sku) => (
                <tr key={sku.code} className="hover:bg-off-white transition-colors">
                  <td className="px-5 py-4 font-mono font-medium">{sku.code}</td>
                  <td className="px-5 py-4">{sku.name}</td>
                  <td className="px-5 py-4 text-mid-grey">{sku.cat}</td>
                  <td className="px-5 py-4 text-mid-grey">{sku.gsm}</td>
                  <td className="px-5 py-4">{sku.brand}</td>
                  <td className="px-5 py-4">{sku.vendor?.name || "—"}</td>
                  <td className="px-5 py-4 text-right">
                    <InlinePriceInput id={sku.code} type="cost" initialPence={sku.costPence} action={updateSkuPrice} editable={canEdit} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <InlinePriceInput id={sku.code} type="sell" initialPence={sku.basePence} action={updateSkuPrice} editable={canEdit} />
                  </td>
                </tr>
              ))}
              {skus.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-mid-grey text-[12px]">No blanks found.</td>
                </tr>
              )}
            </tbody>
          </table>
          {canEdit && <AddSkuFooter vendors={vendors} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Add-ons Card */}
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.14em] text-dark-grey mb-4">Add-ons</h2>
          <div className="bg-white border border-warm-grey rounded-[2px] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#F4F2EE] border-b border-warm-grey">
                <tr>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Name</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium">Vendor</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium text-right w-[100px]">Cost £</th>
                  <th className="px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-mid-grey font-medium text-right w-[100px]">Price £</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-grey text-[14px]">
                {embellishments.map((emb) => (
                  <tr key={emb.code} className="hover:bg-off-white transition-colors">
                    <td className="px-5 py-4">{emb.name}</td>
                    <td className="px-5 py-4 text-mid-grey">{emb.vendor?.name || "—"}</td>
                    <td className="px-5 py-4 text-right">
                      <InlinePriceInput id={emb.code} type="cost" initialPence={emb.costPence} action={updateEmbPrice} editable={canEdit} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <InlinePriceInput id={emb.code} type="sell" initialPence={emb.pricePence} action={updateEmbPrice} editable={canEdit} />
                    </td>
                  </tr>
                ))}
                {embellishments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-mid-grey text-[12px]">No add-ons found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            {canEdit && <AddEmbFooter vendors={vendors} />}
          </div>
        </div>

        {/* Colorways Card */}
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.14em] text-dark-grey mb-4">Colorways</h2>
          <div className="bg-white border border-warm-grey rounded-[2px] p-6 relative">
            <div className="grid grid-cols-5 gap-6">
              {colorways.map((c) => (
                <div key={c.code} className="flex flex-col items-center text-center">
                  <ColorSwatch hex={c.hex} name={c.name} size={32} />
                  <span className="mt-3 text-[10px] font-mono font-medium">{c.code}</span>
                  <span className="mt-1 text-[11px] text-mid-grey leading-tight">{c.name}</span>
                  {c.vendorName && (
                    <span className="text-[9px] text-mid-grey opacity-60 leading-tight mt-1">({c.vendorName})</span>
                  )}
                </div>
              ))}
            </div>
            {colorways.length === 0 && (
              <div className="py-8 text-center text-mid-grey text-[12px]">No colorways found.</div>
            )}
          </div>
          {canEdit && <AddColorwayFooter />}
        </div>
      </div>
    </div>
  );
}
