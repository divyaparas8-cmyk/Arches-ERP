"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireRole(allowedRoles: string[]) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !user.role || !allowedRoles.includes(user.role)) {
    throw new Error("Unauthorized");
  }
  return user;
}

const updatePriceSchema = z.object({
  id: z.string(),
  type: z.enum(["cost", "sell"]),
  newPence: z.number().int().min(0),
});

export async function updateSkuPrice(data: { id: string; type: "cost" | "sell"; newPence: number }) {
  await requireRole(["owner", "sales"]);
  const parsed = updatePriceSchema.parse(data);

  const sku = await prisma.sku.findUnique({ where: { code: parsed.id } });
  if (!sku) throw new Error("SKU not found");

  const oldPence = parsed.type === "cost" ? sku.costPence : sku.basePence;
  if (oldPence === parsed.newPence) return;

  const updateData = parsed.type === "cost"
    ? { costPence: parsed.newPence }
    : { basePence: parsed.newPence };

  await prisma.sku.update({ where: { code: parsed.id }, data: updateData });

  revalidatePath("/catalog");
  revalidatePath("/");
}

export async function updateEmbPrice(data: { id: string; type: "cost" | "sell"; newPence: number }) {
  await requireRole(["owner", "sales"]);
  const parsed = updatePriceSchema.parse(data);

  const emb = await prisma.embellishment.findUnique({ where: { code: parsed.id } });
  if (!emb) throw new Error("Embellishment not found");

  const oldPence = parsed.type === "cost" ? emb.costPence : emb.pricePence;
  if (oldPence === parsed.newPence) return;

  const updateData = parsed.type === "cost"
    ? { costPence: parsed.newPence }
    : { pricePence: parsed.newPence };

  await prisma.embellishment.update({ where: { code: parsed.id }, data: updateData });

  revalidatePath("/catalog");
  revalidatePath("/");
}

export async function addSku(data: {
  code: string;
  name: string;
  cat: string;
  gsm: string;
  brand: string;
  vendorId?: number;
  costPence: number;
  basePence: number;
}) {
  await requireRole(["owner", "sales"]);

  await prisma.sku.create({
    data: {
      code: data.code,
      name: data.name,
      cat: data.cat as any,
      gsm: data.gsm || "—",
      brand: data.brand,
      vendorId: data.vendorId,
      costPence: data.costPence,
      basePence: data.basePence,
    }
  });

  revalidatePath("/catalog");
}

export async function addEmb(data: {
  code: string;
  name: string;
  vendorId?: number;
  costPence: number;
  pricePence: number;
}) {
  await requireRole(["owner", "sales"]);

  await prisma.embellishment.create({
    data: {
      code: data.code,
      name: data.name,
      vendorId: data.vendorId,
      costPence: data.costPence,
      pricePence: data.pricePence,
    }
  });

  revalidatePath("/catalog");
}

export async function addColorway(data: {
  code: string;
  name: string;
  hex: string;
  vendorName?: string;
}) {
  await requireRole(["owner", "sales"]);

  await prisma.colorway.create({
    data: {
      code: data.code,
      name: data.name,
      hex: data.hex,
      vendorName: data.vendorName,
    }
  });

  revalidatePath("/catalog");
}
