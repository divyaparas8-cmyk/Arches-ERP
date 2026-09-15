import prisma from "@/lib/prisma";
import { Actor } from "@prisma/client";
import { STAGE_NAMES, STAGE_ACTIONS } from "./stageConstants";

export { STAGE_NAMES, STAGE_ACTIONS };

export async function advanceStage(orderId: string, actor: Actor = Actor.Sales) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.stage >= 7) throw new Error("Order is already at the final stage");

  const nextStage = order.stage + 1;
  const updateData: any = { stage: nextStage };

  if (nextStage === 5) {
    updateData.progress = 0;
    updateData.prodStart = new Date();
  }

  await prisma.order.update({
    where: { id: orderId },
    data: updateData,
  });

  await prisma.activityLog.create({
    data: {
      orderId,
      body: `Stage advanced to ${STAGE_NAMES[nextStage]} (${nextStage})`,
      who: actor,
    },
  });
}

export async function revertStage(orderId: string, targetStage: number, reason: string, actor: Actor = Actor.Sales) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (targetStage >= order.stage) throw new Error("Target stage must be less than current stage");

  const updateData: any = { stage: targetStage };

  if (targetStage < 5) {
    updateData.progress = 0;
    updateData.prodStart = null;
  }
  if (targetStage < 7) {
    updateData.tracking = null;
    updateData.carrier = null;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: updateData,
  });

  if (reason) {
    await prisma.comment.create({
      data: {
        orderId,
        scope: "order",
        who: "internal",
        name: "Sales",
        body: `Reopened to stage ${STAGE_NAMES[targetStage]}: ${reason}`,
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      orderId,
      body: `Stage reverted to ${STAGE_NAMES[targetStage]} (${targetStage}). Reason: ${reason || "None"}`,
      who: actor,
    },
  });
}
