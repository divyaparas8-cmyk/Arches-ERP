import prisma from "@/lib/prisma";
import QuoteBuilder from "./QuoteBuilder";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !["owner", "sales"].includes(user.role)) {
    redirect("/");
  }

  const [clients, skus, colorways, embellishments, vendors] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.sku.findMany({
      where: { active: true },
      include: { vendor: true },
      orderBy: { name: "asc" },
    }),
    prisma.colorway.findMany({ orderBy: { name: "asc" } }),
    prisma.embellishment.findMany({
      where: { active: true },
      include: { vendor: true },
      orderBy: { name: "asc" },
    }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <QuoteBuilder
      clients={clients}
      skus={skus}
      colorways={colorways}
      embellishments={embellishments}
      vendors={vendors}
    />
  );
}
