import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  orderValue,
  calculateDeposit,
  calculateBalance,
  unitSell,
  lineTotal,
  PricingOrder,
  PricingLine,
} from "@/lib/pricing";
import { STAGE_NAMES } from "@/lib/stageConstants";
import ClientPortalActions from "./ClientPortalActions";
import ArtworkApprovalSection from "./ArtworkApprovalSection";

export const dynamic = "force-dynamic";

export default async function ClientOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== "client") {
    redirect("/");
  }

  const resolvedParams = await params;
  const orderId = resolvedParams?.id;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      client: true,
      lines: {
        include: {
          sku: true,
          color: true,
          embellishments: { include: { emb: true } },
          artwork: {
            include: {
              files: { orderBy: { uploadedAt: "desc" } },
              // SPEC §9: only client-facing artwork comments
              comments: {
                where: { who: "client" },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
        orderBy: { position: "asc" },
      },
      comments: {
        // SPEC §9: "Never shows internal notes" — only client-visible comments
        where: { who: "client", scope: "order" },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Security: order must belong to this client
  if (!order || order.clientId !== Number(user.clientId)) {
    notFound();
  }

  // Build PricingOrder — SPEC §2: use sell side only, never show costs
  const pricingOrder: PricingOrder = {
    shippingPence: order.shippingPence ?? 0,
    lines: order.lines.map((l: any): PricingLine => ({
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

  const totalValuePence = orderValue(pricingOrder);
  const depositPence = calculateDeposit(totalValuePence);
  const balancePence = calculateBalance(totalValuePence, depositPence, order.shippingPence ?? 0);

  const formatGBP = (pence: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(pence / 100);

  const stageLabel = STAGE_NAMES[order.stage] ?? `Stage ${order.stage}`;
  const progressPct = Math.round((order.stage / 7) * 100);
  const totalQty = order.lines.reduce((s: number, l: any) => s + l.qty, 0);

  return (
    <div className="min-h-screen bg-[#f5f4f0] p-8 md:p-12">
      {/* Back */}
      <Link
        href="/portal"
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-stone-400 hover:text-stone-700 transition-colors mb-8"
      >
        ← Back to My Orders
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end gap-4 md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-1">
            {order.client.name}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">{order.id}</h1>
        </div>
        <span
          className={`self-start md:self-auto px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-medium ${
            order.status === "active"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-stone-100 text-stone-500"
          }`}
        >
          {order.status}
        </span>
      </div>

      {/* Stage Progress */}
      <div className="bg-white rounded-md border border-stone-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-stone-900">{stageLabel}</p>
          <p className="text-[11px] text-stone-400">{progressPct}% complete</p>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-2 mb-4">
          <div
            className="bg-stone-900 h-2 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1">
          {STAGE_NAMES.map((label, i) => (
            <div key={i} className="text-center">
              <div
                className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                  i <= order.stage ? "bg-stone-900" : "bg-stone-200"
                }`}
              />
              <p className={`text-[9px] uppercase tracking-wider leading-tight ${
                i === order.stage ? "text-stone-900 font-bold" : "text-stone-300"
              }`}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SPEC §9: Quote Approve button — only at Stage 0 */}
      {order.stage === 0 && order.status === "active" && (
        <ClientPortalActions orderId={order.id} stage={order.stage} />
      )}

      {/* Financials — SPEC §9: order value, deposit, balance, delivery */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-md border border-stone-200 p-5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-stone-400 mb-1">Order Value</p>
          <p className="text-xl font-black text-stone-900">{formatGBP(totalValuePence)}</p>
        </div>
        <div className="bg-white rounded-md border border-stone-200 p-5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-stone-400 mb-1">Deposit 50%</p>
          <p className="text-xl font-black text-stone-900">{formatGBP(depositPence)}</p>
        </div>
        <div className="bg-white rounded-md border border-stone-200 p-5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-stone-400 mb-1">
            Balance {order.shippingPence ? "+ Shipping" : ""}
          </p>
          <p className="text-xl font-black text-stone-900">
            {balancePence > 0 ? formatGBP(balancePence) : "TBC"}
          </p>
        </div>
        <div className="bg-white rounded-md border border-stone-200 p-5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-stone-400 mb-1">Delivery</p>
          <p className="text-xl font-black text-stone-900">{order.weeks} wks</p>
          <p className="text-[10px] text-stone-400 mt-1">{totalQty} items</p>
        </div>
      </div>

      {/* Tracking info — shown when shipped */}
      {order.tracking && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-6">
          <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-600 mb-1">Shipment Tracking</p>
          <p className="text-sm font-bold text-emerald-800">
            {order.carrier && <span className="font-normal mr-2">{order.carrier}</span>}
            {order.tracking}
          </p>
        </div>
      )}

      {/* Order Lines — SPEC §9: SKU, colorway, qty, unit price, line total */}
      <div className="bg-white rounded-md border border-stone-200 mb-6">
        <div className="px-6 py-4 border-b border-stone-100">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
            Order Lines · {totalQty} items
          </p>
        </div>
        <div className="divide-y divide-stone-100">
          {order.lines.map((line: any, idx: number) => {
            const pricingLine: PricingLine = pricingOrder.lines[idx];
            const unitP = unitSell(pricingLine);
            const lineTotalP = lineTotal(pricingLine);
            return (
              <div key={line.id} className="px-6 py-4 flex items-center gap-4">
                <div
                  className="w-5 h-5 rounded-full border border-stone-200 shrink-0"
                  style={{ backgroundColor: line.color.hex }}
                  title={line.color.name}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900">{line.sku.name}</p>
                  <p className="text-[11px] text-stone-400">
                    {line.color.name} · {line.sku.code}
                    {line.embellishments.length > 0 && (
                      <span> · {line.embellishments.map((e: any) => e.emb.name).join(", ")}</span>
                    )}
                  </p>
                </div>
                {/* SPEC §9: unit price and line total */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-stone-900">{formatGBP(lineTotalP)}</p>
                  <p className="text-[10px] text-stone-400">
                    {line.qty} × {formatGBP(unitP)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-4 border-t border-stone-200 flex justify-between items-center bg-stone-50">
          <p className="text-[10px] uppercase tracking-[0.14em] text-stone-500">Order Total</p>
          <p className="text-base font-black text-stone-900">{formatGBP(totalValuePence)}</p>
        </div>
      </div>

      {/* SPEC §9: Artwork Approval — shown at stage 2 when artworks exist */}
      {order.stage === 2 && order.lines.some((l: any) => l.artwork) && (
        <div className="bg-white rounded-md border border-stone-200 mb-6">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
              Artwork Approval Required
            </p>
            <span className="text-[9px] px-2 py-1 bg-amber-50 text-amber-700 rounded-full uppercase tracking-wider font-medium">
              Awaiting Your Review
            </span>
          </div>
          <div className="divide-y divide-stone-100">
            {order.lines
              .filter((l: any) => l.artwork)
              .map((line: any) => (
                <div key={line.id} className="p-6">
                  {/* SKU header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-4 h-4 rounded-full border border-stone-200 shrink-0"
                      style={{ backgroundColor: line.color.hex }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-stone-900">
                        {line.sku.name}
                        <span className="ml-2 text-[10px] font-mono font-normal text-stone-400">
                          {line.sku.code}
                        </span>
                      </p>
                      <p className="text-[11px] text-stone-400">
                        {line.color.name} · Qty {line.qty}
                      </p>
                    </div>
                    {/* Approval status badge */}
                    <span className={`text-[9px] px-2 py-1 rounded-full uppercase tracking-wider font-medium ${
                      line.artwork.approved
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {line.artwork.approved ? "✓ Approved" : "Pending Approval"}
                    </span>
                  </div>

                  {/* Artwork files */}
                  {line.artwork.files.length > 0 ? (
                    <div className="mb-4">
                      <p className="text-[9px] uppercase tracking-[0.18em] text-stone-400 mb-2">
                        Artwork Files — Version {line.artwork.ver}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {line.artwork.files.map((file: any) => (
                          <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-200 rounded-[2px] text-[11px] text-stone-700 hover:bg-stone-100 transition-colors"
                          >
                            <span>📄</span>
                            {file.filename}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 py-4 text-center bg-stone-50 rounded-[2px]">
                      <p className="text-[11px] text-stone-400 uppercase tracking-wider">
                        No artwork files uploaded yet
                      </p>
                    </div>
                  )}

                  {/* Approve button + artwork comments — via client component */}
                  <ArtworkApprovalSection
                    orderId={order.id}
                    artworkId={line.artwork.id}
                    lineId={line.id}
                    skuName={line.sku.name}
                    alreadyApproved={line.artwork.approved}
                    artworkComments={line.artwork.comments}
                    clientName={user.name}
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SPEC §9: Order comment thread — client can comment */}
      <ClientPortalActions
        orderId={order.id}
        stage={order.stage}
        showCommentOnly
        comments={order.comments}
        clientName={user.name}
      />
    </div>
  );
}
