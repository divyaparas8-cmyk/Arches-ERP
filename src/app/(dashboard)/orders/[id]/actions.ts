"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { advanceStage, revertStage } from "@/lib/stages";
import { Actor, CommentAuthor } from "@prisma/client";

export async function advanceOrderAction(orderId: string) {
  await advanceStage(orderId, Actor.Sales);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
}

export async function revertOrderAction(orderId: string, targetStage: number, reason: string) {
  await revertStage(orderId, targetStage, reason, Actor.Sales);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
}

export async function pushMilestoneAction(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  const MILESTONES = [
    "20% — Blanks cut & material prep complete.",
    "40% — Embellishment sampling signed off, bulk print underway.",
    "60% — Bulk embellishment complete, entering finishing.",
    "80% — Finishing & quality control in progress.",
    "100% — Order complete and ready for packing.",
  ];

  const currentIdx = Math.floor(order.progress / 20);
  const nextIdx = Math.min(currentIdx + 1, 5);
  const nextProgress = nextIdx * 20;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      progress: nextProgress,
      stage: nextProgress === 100 ? 6 : 5,
    },
  });

  const milestoneMsg = MILESTONES[Math.min(currentIdx, 4)];
  await prisma.activityLog.create({
    data: {
      orderId,
      body: `Pushed milestone: ${milestoneMsg}`,
      who: Actor.Production,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
}

export async function addCommentAction(orderId: string, body: string, isInternal: boolean) {
  if (!body.trim()) return;

  await prisma.comment.create({
    data: {
      orderId,
      scope: "order",
      who: isInternal ? CommentAuthor.internal : CommentAuthor.client,
      name: isInternal ? "Sales" : "Client",
      body: body.trim(),
    },
  });

  await prisma.activityLog.create({
    data: {
      orderId,
      body: `Comment added by ${isInternal ? "Internal" : "Client"}: ${body.trim().slice(0, 40)}...`,
      who: Actor.Sales,
    },
  });

  revalidatePath(`/orders/${orderId}`);
}

export async function updateTrackingAction(orderId: string, carrier: string, tracking: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { carrier, tracking, stage: 7 },
  });

  await prisma.activityLog.create({
    data: {
      orderId,
      body: `Tracking updated: ${carrier} — ${tracking}`,
      who: Actor.Sales,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
}

export async function declineOrderAction(orderId: string, reason: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "declined", declinedReason: reason },
  });

  await prisma.activityLog.create({
    data: {
      orderId,
      body: `Order declined: ${reason}`,
      who: Actor.Sales,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
}

export async function reopenOrderAction(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "active", stage: 0, declinedReason: null },
  });

  await prisma.activityLog.create({
    data: {
      orderId,
      body: `Order reopened`,
      who: Actor.Sales,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/");
}
