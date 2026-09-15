import prisma from "@/lib/prisma";
import Link from "next/link";
import ColorSwatch from "@/components/ColorSwatch";
import { orderValue, orderCost, PricingOrder } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const orders = await prisma.order.findMany({
    include: {
      client: true,
      xeroRecords: true,
      lines: {
        include: {
          color: true,
          sku: true,
          embellishments: {
            include: { emb: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatGBP = (pence: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

  const getStatusBadge = (stage: number) => {
    switch (stage) {
      case 3:
        return { label: "Invoiced", color: "bg-amber-100 text-amber-900 border-amber-300" };
      case 4:
        return { label: "Deposit Due", color: "bg-orange-100 text-orange-900 border-orange-300" };
      case 5:
      case 6:
        return { label: "Deposit Paid", color: "bg-blue-100 text-blue-900 border-blue-300" };
      case 7:
        return { label: "Paid in Full", color: "bg-green-100 text-green-900 border-green-300" };
      default:
        return { label: "Draft / Uninvoiced", color: "bg-gray-100 text-gray-700 border-gray-300" };
    }
  };

  const syncedCount = orders.filter((o) => o.xeroRecords.some((x) => x.status === "synced")).length;
  const queuedCount = orders.filter((o) => o.stage >= 3 && !o.xeroRecords.some((x) => x.status === "synced")).length;

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8">
      <div>
        <h1 className="text-[10px] uppercase tracking-[0.18em] text-dark-grey mb-2">
          Invoices &amp; Accounting
        </h1>
        <h2 className="text-[28px] font-black tracking-tight">Financial Overview</h2>
      </div>

      {/* Xero Connection Panel */}
      <div className="bg-near-black text-white p-6 rounded-[2px] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center font-bold text-[18px]">
              X
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">
                ACCOUNTING INTEGRATION
              </p>
              <h3 className="text-[16px] font-bold">Xero &middot; Arches Production Ltd</h3>
              <p className="text-[11px] text-white/60">
                Connected &middot; GBP &middot; VAT 20% &middot; Last sync Today 18:00
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-[11px] text-white/70">
              <span>Auto-push</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-white">
                ON
              </span>
            </div>
            <button className="bg-white text-near-black text-[10px] uppercase tracking-[0.18em] font-medium px-4 py-2.5 rounded-[2px]">
              Sync now
            </button>
          </div>
        </div>

        {/* 4-up Stat Grid */}
        <div className="grid grid-cols-4 gap-[1px] bg-white/10 border border-white/10">
          <div className="bg-near-black p-4">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">Synced Invoices</p>
            <p className="text-[20px] font-mono font-medium mt-1">{syncedCount}</p>
          </div>
          <div className="bg-near-black p-4">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">Queued for Sync</p>
            <p className="text-[20px] font-mono font-medium mt-1 text-amber-400">{queuedCount}</p>
          </div>
          <div className="bg-near-black p-4">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">Sync Direction</p>
            <p className="text-[20px] font-mono font-medium mt-1">2-Way</p>
          </div>
          <div className="bg-near-black p-4">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">Mapping</p>
            <p className="text-[20px] font-mono font-medium mt-1">Automatic</p>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white border border-warm-grey rounded-[2px] p-6 space-y-4">
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-dark-grey font-medium">
          All Order Invoices
        </h2>

        <div className="space-y-3">
          {orders.map((order) => {
            const pricingOrder: PricingOrder = {
              shippingPence: order.shippingPence,
              lines: order.lines.map((l: any) => ({
                qty: l.qty,
                overridePence: l.overridePence,
                blankCostPence: l.blankCostPence,
                blankSellPence: l.blankSellPence,
                sku: { basePence: l.sku.basePence, costPence: l.sku.costPence },
                embellishments: l.embellishments.map((le: any) => ({
                  costPence: le.costPence,
                  sellPence: le.sellPence,
                  emb: { pricePence: le.emb.pricePence, costPence: le.emb.costPence },
                })),
              })),
            };

            const val = orderValue(pricingOrder);
            const deposit = Math.round(val / 2);
            const balance = val - deposit;
            const statusInfo = getStatusBadge(order.stage);
            const xeroRec = order.xeroRecords[0];

            return (
              <div
                key={order.id}
                className="border border-warm-grey rounded-[2px] p-5 hover:border-near-black transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-6">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-[14px] font-mono font-bold hover:underline"
                    >
                      {order.id}
                    </Link>
                    <span className="text-[14px] font-medium">{order.client.name}</span>
                    <div className="flex -space-x-1">
                      {order.lines.map((l) => (
                        <ColorSwatch key={l.id} hex={l.color.hex} name={l.color.name} size={14} />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-8 text-[13px]">
                    <div>
                      <span className="text-[10px] text-mid-grey uppercase block">Total</span>
                      <span className="font-bold font-mono">{formatGBP(val)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-mid-grey uppercase block">Deposit 50%</span>
                      <span className="font-mono text-mid-grey">{formatGBP(deposit)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-mid-grey uppercase block">Balance</span>
                      <span className="font-mono text-mid-grey">{formatGBP(balance)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-warm-grey pt-3 text-[11px]">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-[2px] border text-[9px] uppercase tracking-wider font-semibold ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                    <span className="text-mid-grey">&middot;</span>
                    <span className="text-dark-grey font-mono">
                      Xero Ref: {xeroRec?.ref || `INV-${order.id}`}
                    </span>
                  </div>

                  <div>
                    {xeroRec?.status === "synced" ? (
                      <span className="text-green-700 font-medium text-[10px] uppercase tracking-wider">
                        &check; Synced to Xero
                      </span>
                    ) : (
                      <button className="bg-near-black text-white text-[9px] uppercase tracking-[0.14em] px-3 py-1 rounded-[2px]">
                        Push to Xero
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="text-center py-8 text-mid-grey text-[12px]">
              No invoices found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
