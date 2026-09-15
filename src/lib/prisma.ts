import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

function createPgPool() {
  const rawUrl = (process.env.DATABASE_URL || "").replace(/^["']|["']$/g, "").trim();
  try {
    const parsed = new URL(rawUrl);
    return new Pool({
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parseInt(parsed.port || "5432", 10),
      database: parsed.pathname.replace(/^\//, ""),
      ssl: { rejectUnauthorized: false },
    });
  } catch {
    return new Pool({ connectionString: rawUrl });
  }
}

const pool = createPgPool();
const adapter = new PrismaPg(pool);

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  prisma = globalForPrisma.prisma;
}

export default prisma;
