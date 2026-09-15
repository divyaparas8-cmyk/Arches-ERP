"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const embOverrideSchema = z.object({
  embCode: z.string(),
  vendorId: z.number().int().nullable().optional(),
  costPence: z.number().int().min(0),
  sellPence: z.number().int().min(0),
});

const lineSchema = z.object({
  skuCode: z.string(),
  colorCode: z.string().length(3),
  qty: z.number().int().min(1),
  embCodes: z.array(z.string()),
  overridePence: z.number().int().min(0).nullable(),
  blankVendorId: z.number().int().nullable().optional(),
  blankCostPence: z.number().int().min(0).nullable().optional(),
  blankSellPence: z.number().int().min(0).nullable().optional(),
  embOverrides: z.array(embOverrideSchema).optional(),
});

const createOrderSchema = z.object({
  clientId: z.number().int().positive(),
  contact: z.string().min(1),
  weeks: z.number().int().min(1).max(52),
  lines: z.array(lineSchema).min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export async function createOrder(input: CreateOrderInput): Promise<string> {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !["owner", "sales"].includes(user.role)) {
    throw new Error("Unauthorized");
  }

  const parsed = createOrderSchema.parse(input);

  // Safe sequential ID — use max(seq)+1.
  // We run without a transaction because Neon's PgBouncer pooler
  // does not support interactive transactions. In practice, concurrent
  // quote creation is rare and the UNIQUE constraint on (seq) will
  // reject any collision at the DB level.
  const maxSeqResult = await prisma.order.aggregate({ _max: { seq: true } });
  const nextSeq = (maxSeqResult._max.seq ?? 1055) + 1;
  const newOrderId = `ARC-${nextSeq}`;

  // Create the order
  await prisma.order.create({
    data: {
      id: newOrderId,
      seq: nextSeq,
      clientId: parsed.clientId,
      contact: parsed.contact,
      weeks: parsed.weeks,
      stage: 0,
    },
  });

  // Create line items sequentially
  for (let i = 0; i < parsed.lines.length; i++) {
    const line = parsed.lines[i];

    const createdLine = await prisma.lineItem.create({
      data: {
        orderId: newOrderId,
        position: i + 1,
        skuCode: line.skuCode,
        colorCode: line.colorCode,
        qty: line.qty,
        overridePence: line.overridePence ?? null,
        blankVendorId: line.blankVendorId ?? null,
        blankCostPence: line.blankCostPence ?? null,
        blankSellPence: line.blankSellPence ?? null,
      },
    });

    // Create embellishments for this line
    if (line.embCodes && line.embCodes.length > 0) {
      const embOverridesMap = new Map(
        (line.embOverrides ?? []).map((o) => [o.embCode, o])
      );

      for (const embCode of line.embCodes) {
        const override = embOverridesMap.get(embCode);
        await prisma.lineEmbellishment.create({
          data: {
            lineId: createdLine.id,
            embCode,
            vendorId: override?.vendorId ?? null,
            costPence: override?.costPence ?? null,
            sellPence: override?.sellPence ?? null,
          },
        });
      }
    }
  }

  // Write the first activity log entry
  await prisma.activityLog.create({
    data: {
      orderId: newOrderId,
      body: "Quote draft created",
      who: "Sales",
      userId: user.id ? parseInt(String(user.id)) : null,
    },
  });

  revalidatePath("/");
  return newOrderId;
}
