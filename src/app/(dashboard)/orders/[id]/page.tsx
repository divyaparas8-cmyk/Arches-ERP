import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import OrderDetailView from "./OrderDetailView";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;
  const orderId = resolvedParams?.id;

  if (!orderId) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      client: true,
      lines: {
        include: {
          sku: true,
          color: true,
          embellishments: {
            include: { emb: true },
          },
        },
        orderBy: { position: "asc" },
      },
      comments: {
        orderBy: { createdAt: "asc" },
      },
      activityLogs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return <OrderDetailView order={order} />;
}
