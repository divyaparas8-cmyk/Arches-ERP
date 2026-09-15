import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  // Only client role can access this page
  if (!user || user.role !== "client") {
    redirect("/");
  }

  // Get the client's orders via clientId stored in session
  const clientId = user.clientId;
  if (!clientId) {
    return (
      <div className="p-10">
        <p className="text-red-500">No client account linked to your user. Please contact Arches.</p>
      </div>
    );
  }

  const orders = await prisma.order.findMany({
    where: { clientId: Number(clientId) },
    include: {
      lines: {
        include: {
          sku: true,
          embellishments: { include: { emb: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const client = await prisma.client.findUnique({ where: { id: Number(clientId) } });

  const stageLabels = [
    "Enquiry",
    "Quote Sent",
    "Deposit Invoiced",
    "Deposit Paid",
    "In Production",
    "QC",
    "Balance Invoiced",
    "Shipped",
  ];

  return (
    <div className="min-h-screen bg-[#f5f4f0] p-8 md:p-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-2">
          Client Portal
        </p>
        <h1 className="text-3xl font-black tracking-tight text-stone-900">
          {client?.name ?? "Your Orders"}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Welcome back, {user.name}. Here are all your orders with Arches.
        </p>
      </div>

      {/* Orders */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-md border border-stone-200 p-12 text-center">
          <p className="text-stone-400 text-sm uppercase tracking-widest">No orders yet</p>
          <p className="text-stone-300 text-xs mt-2">Your orders will appear here once raised by Arches.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const totalQty = order.lines.reduce((sum: number, l: any) => sum + l.qty, 0);
            const stageLabel = stageLabels[order.stage] ?? `Stage ${order.stage}`;
            const progressPct = Math.round((order.stage / 7) * 100);

            return (
              <div
                key={order.id}
                className="bg-white rounded-md border border-stone-200 p-6 flex flex-col md:flex-row md:items-center gap-4"
              >
                {/* Order ID + Status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono font-bold text-stone-900">{order.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium ${
                        order.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-stone-100 text-stone-400"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Stage label */}
                  <p className="text-[11px] uppercase tracking-[0.15em] text-stone-400 mb-3">
                    {stageLabel}
                  </p>

                  {/* Progress bar */}
                  <div className="w-full bg-stone-100 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-stone-900 h-1.5 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-4 text-[11px] text-stone-500">
                    <span>{totalQty} items</span>
                    <span>{order.lines.length} line{order.lines.length !== 1 ? "s" : ""}</span>
                    {order.tracking && (
                      <span className="text-emerald-600 font-medium">
                        Tracking: {order.tracking} ({order.carrier ?? ""})
                      </span>
                    )}
                    <span>
                      Created {new Date(order.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* View Details link */}
                <div className="shrink-0">
                  <Link
                    href={`/portal/orders/${order.id}`}
                    className="inline-block px-5 py-2.5 bg-stone-900 text-white text-[10px] uppercase tracking-[0.15em] rounded-[2px] hover:bg-stone-700 transition-colors"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
