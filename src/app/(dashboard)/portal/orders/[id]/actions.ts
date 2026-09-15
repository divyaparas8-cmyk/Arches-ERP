"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Actor, CommentAuthor } from "@prisma/client";

// SPEC §9 + §3: Client can approve quote from portal (stage 0 → 1)
export async function clientApproveQuoteAction(orderId: string) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== "client") throw new Error("Unauthorized");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.clientId !== Number(user.clientId)) throw new Error("Order not found or unauthorized");
  if (order.stage !== 0) throw new Error("Quote can only be approved at stage 0");

  await prisma.order.update({ where: { id: orderId }, data: { stage: 1 } });

  await prisma.activityLog.create({
    data: { orderId, body: "Quote approved by client", who: Actor.System },
  });

  revalidatePath(`/portal/orders/${orderId}`);
  revalidatePath("/portal");
  revalidatePath("/");
}

// SPEC §9: Client can approve artwork per SKU from portal
export async function clientApproveArtworkAction(orderId: string, artworkId: number) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== "client") throw new Error("Unauthorized");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.clientId !== Number(user.clientId)) throw new Error("Order not found or unauthorized");

  await prisma.artwork.update({
    where: { id: artworkId },
    data: { approved: true, approvedAt: new Date(), approvedBy: user.name },
  });

  await prisma.activityLog.create({
    data: { orderId, body: `Artwork approved by client (${user.name})`, who: Actor.System },
  });

  revalidatePath(`/portal/orders/${orderId}`);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/portal");
  revalidatePath("/");
}

// SPEC §9: Client can comment on their order
export async function clientAddCommentAction(orderId: string, body: string, clientName: string) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== "client") throw new Error("Unauthorized");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.clientId !== Number(user.clientId)) throw new Error("Order not found or unauthorized");

  if (!body.trim()) return;

  await prisma.comment.create({
    data: {
      orderId,
      scope: "order",
      who: CommentAuthor.client,
      name: clientName,
      body: body.trim(),
    },
  });

  await prisma.activityLog.create({
    data: { orderId, body: `Client comment: ${body.trim().slice(0, 60)}`, who: Actor.System },
  });

  revalidatePath(`/portal/orders/${orderId}`);
  revalidatePath("/portal");
  revalidatePath(`/orders/${orderId}`);
}

// SPEC §9: Client can comment on artwork per SKU
export async function clientAddArtworkCommentAction(
  orderId: string,
  artworkId: number,
  body: string,
  clientName: string
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== "client") throw new Error("Unauthorized");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.clientId !== Number(user.clientId)) throw new Error("Order not found or unauthorized");

  if (!body.trim()) return;

  await prisma.comment.create({
    data: {
      orderId,
      artworkId,
      scope: "artwork",
      who: CommentAuthor.client,
      name: clientName,
      body: body.trim(),
    },
  });

  await prisma.activityLog.create({
    data: { orderId, body: `Client artwork comment: ${body.trim().slice(0, 60)}`, who: Actor.System },
  });

  revalidatePath(`/portal/orders/${orderId}`);
  revalidatePath(`/orders/${orderId}`);
}
