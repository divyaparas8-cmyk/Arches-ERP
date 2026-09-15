import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const stageLabels = [
  "Enquiry",
  "Quote Sent",
  "Deposit Invoiced",
  "Deposit Paid",
  "In Production",
  "Quality Check",
  "Balance Invoiced",
  "Shipped",
];

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
        },
        orderBy: { position: "asc" },
      },
      comments: {
        where: { who: "client" }, // client only sees client-facing comments
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Make sure the order belongs to this client
  if (!order || order.clientId !== Number(user.clientId)) {
    notFound();
  }

  const stageLabel = stageLabels[order.stage] ?? `Stage ${order.stage}`;
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

      {/* Progress */}
      <div className="bg-white rounded-md border border-stone-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-stone-900">{stageLabel}</p>
          <p className="text-[11px] text-stone-400">{progressPct}% complete</p>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-2">
          <div
            className="bg-stone-900 h-2 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-4 md:grid-cols-8 gap-1">
          {stageLabels.map((label, i) => (
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

      {/* Tracking info if shipped */}
      {order.tracking && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-6">
          <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-600 mb-1">Shipment Tracking</p>
          <p className="text-sm font-bold text-emerald-800">
            {order.carrier && <span className="font-normal mr-2">{order.carrier}</span>}
            {order.tracking}
          </p>
        </div>
      )}

      {/* Order Lines */}
      <div className="bg-white rounded-md border border-stone-200 mb-6">
        <div className="px-6 py-4 border-b border-stone-100">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
            Order Lines · {totalQty} items
          </p>
        </div>
        <div className="divide-y divide-stone-100">
          {order.lines.map((line: any) => (
            <div key={line.id} className="px-6 py-4 flex items-center gap-4">
              <div
                className="w-5 h-5 rounded-full border border-stone-200 shrink-0"
                style={{ backgroundColor: line.color.hex }}
                title={line.color.name}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900">{line.sku.name}</p>
                <p className="text-[11px] text-stone-400">
                  {line.color.name} · Qty: {line.qty}
                  {line.embellishments.length > 0 && (
                    <span> · {line.embellishments.map((e: any) => e.emb.name).join(", ")}</span>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-[10px] font-mono text-stone-400">
                #{line.position}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comments from Arches (client-visible only) */}
      {order.comments.length > 0 && (
        <div className="bg-white rounded-md border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-100">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Messages from Arches</p>
          </div>
          <div className="divide-y divide-stone-100">
            {order.comments.map((comment: any) => (
              <div key={comment.id} className="px-6 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-stone-700">{comment.name}</p>
                  <span className="text-stone-300">·</span>
                  <p className="text-[10px] text-stone-400">
                    {new Date(comment.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-sm text-stone-600">{comment.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
