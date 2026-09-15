import prisma from "@/lib/prisma";
import Link from "next/link";
import { orderValue, orderCost, orderMarginPct, PricingOrder } from "@/lib/pricing";
import StageDots from "@/components/StageDots";
import ColorSwatch from "@/components/ColorSwatch";

// Revalidate dashboard every minute or rely on Next.js default caching (we can keep it dynamic)
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { stage?: string; status?: string };
}) {
  const currentStatus = searchParams.status === "declined" ? "declined" : "active";
  const filterStage = searchParams.stage ? parseInt(searchParams.stage, 10) : null;

  // Fetch all orders with lines and embellishments for pricing calculation
  const allOrders = await prisma.order.findMany({
    include: {
      client: true,
      lines: {
        include: {
          sku: true,
          color: true,
          embellishments: {
            include: { emb: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate KPIs on active orders
  const activeOrders = allOrders.filter(o => o.status === "active");
  const openOrdersCount = activeOrders.length;
  
  let pipelineValue = 0;
  let totalCost = 0;
  let awaitingApproval = 0;
  let awaitingDeposit = 0;

  const stageCounts = Array(8).fill(0);

  // We convert Prisma models to PricingOrder inline
  const mapToPricingOrder = (o: any): PricingOrder => ({
    shippingPence: o.shippingPence,
    lines: o.lines.map((l: any) => ({
      qty: l.qty,
      overridePence: l.overridePence,
      blankCostPence: l.blankCostPence,
      blankSellPence: l.blankSellPence,
      sku: { basePence: l.sku.basePence, costPence: l.sku.costPence },
      embellishments: l.embellishments.map((le: any) => ({
        costPence: le.costPence,
        sellPence: le.sellPence,
        emb: { pricePence: le.emb.pricePence, costPence: le.emb.costPence }
      }))
    }))
  });

  activeOrders.forEach(o => {
    const pOrder = mapToPricingOrder(o);
    const val = orderValue(pOrder);
    const cost = orderCost(pOrder);
    
    pipelineValue += val;
    totalCost += cost;
    
    if (o.stage === 2) awaitingApproval++;
    if (o.stage === 4) awaitingDeposit++;
    if (o.stage >= 0 && o.stage <= 7) {
      stageCounts[o.stage]++;
    }
  });

  const grossProfit = pipelineValue - totalCost;
  const blendedMargin = pipelineValue > 0 ? Math.round((grossProfit / pipelineValue) * 100) : 0;

  const formatGBP = (pence: number) => 
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(pence / 100);

  const STAGE_LABELS_SHORT = [
    "Quote", "Confirm", "Artwork", "Invoice", "Deposit", "Production", "Ready", "Shipped"
  ];

  // Filter orders for the table
  const displayedOrders = allOrders.filter(o => {
    if (o.status !== currentStatus) return false;
    if (currentStatus === "active" && filterStage !== null && o.stage !== filterStage) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Open Orders", val: openOrdersCount },
          { label: "Pipeline Value", val: formatGBP(pipelineValue) },
          { label: "Awaiting Approval", val: awaitingApproval },
          { label: "Awaiting Deposit", val: awaitingDeposit },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-warm-grey rounded-[2px] p-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-dark-grey mb-4">{kpi.label}</p>
            <p className="text-[40px] font-black tracking-[-0.02em] leading-none">{kpi.val}</p>
          </div>
        ))}
      </div>

      {/* Margin Strip */}
      <div className="bg-near-black text-white p-6 rounded-[2px] mb-8">
        <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-6">Margin &middot; Internal Only</p>
        <div className="grid grid-cols-4 gap-[1px] bg-white/10 border border-white/10">
          {[
            { label: "Revenue", val: formatGBP(pipelineValue) },
            { label: "Vendor Cost", val: formatGBP(totalCost) },
            { label: "Gross Profit", val: formatGBP(grossProfit) },
            { label: "Blended Margin", val: `${blendedMargin}%` },
          ].map((m, i) => (
            <div key={i} className="bg-near-black p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/50 mb-2">{m.label}</p>
              <p className="text-[20px] font-medium tracking-tight">{m.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Order Pipeline Filter */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-dark-grey">Order Pipeline</p>
          {filterStage !== null && (
            <Link href="/" className="text-[10px] uppercase tracking-[0.14em] text-mid-grey hover:text-near-black transition-colors">
              Clear filter &times;
            </Link>
          )}
        </div>
        <div className="grid grid-cols-8 gap-2">
          {STAGE_LABELS_SHORT.map((label, idx) => {
            const isActive = filterStage === idx;
            return (
              <Link
                key={idx}
                href={isActive ? "/" : `/?stage=${idx}`}
                className={`border rounded-[2px] p-3 text-center transition-colors ${
                  isActive 
                    ? "bg-near-black border-near-black text-white" 
                    : "bg-white border-warm-grey hover:border-near-black text-near-black"
                }`}
              >
                <p className="text-[20px] font-medium leading-none mb-1">{stageCounts[idx]}</p>
                <p className={`text-[9px] uppercase tracking-[0.14em] ${isActive ? "text-white/70" : "text-mid-grey"}`}>
                  {label}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex space-x-6 border-b border-warm-grey mb-4">
        <Link 
          href="/" 
          className={`pb-3 text-[10px] uppercase tracking-[0.18em] border-b-2 ${
            currentStatus === "active" ? "border-near-black text-near-black font-medium" : "border-transparent text-mid-grey hover:text-near-black"
          }`}
        >
          Active
        </Link>
        <Link 
          href="/?status=declined" 
          className={`pb-3 text-[10px] uppercase tracking-[0.18em] border-b-2 ${
            currentStatus === "declined" ? "border-near-black text-near-black font-medium" : "border-transparent text-mid-grey hover:text-near-black"
          }`}
        >
          Declined &amp; Closed
        </Link>
      </div>

      {/* All Orders Table */}
      <div className="space-y-2">
        {displayedOrders.map(order => {
          const pOrder = mapToPricingOrder(order);
          const val = orderValue(pOrder);
          const totalQty = order.lines.reduce((sum, l) => sum + l.qty, 0);
          
          return (
            <Link 
              key={order.id} 
              href={`/orders/${order.id}`}
              className="block bg-white border border-warm-grey rounded-[2px] p-5 hover:border-near-black transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-8">
                  <span className="text-[14px] font-medium font-mono">{order.id}</span>
                  <span className="text-[14px]">{order.client.name}</span>
                  <div className="flex items-center space-x-3">
                    <div className="flex -space-x-1">
                      {order.lines.map(l => (
                        <ColorSwatch key={l.id} hex={l.color.hex} name={l.color.name} size={14} />
                      ))}
                    </div>
                    <span className="text-[12px] text-mid-grey">
                      {order.lines.length} {order.lines.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-8 text-[14px]">
                  <span className="text-mid-grey">{totalQty} pcs</span>
                  <span className="font-medium">{formatGBP(val)}</span>
                </div>
              </div>
              <StageDots stage={order.stage} status={order.status} />
            </Link>
          );
        })}
        {displayedOrders.length === 0 && (
          <div className="py-12 text-center text-mid-grey text-[12px]">
            No orders found.
          </div>
        )}
      </div>
    </div>
  );
}
