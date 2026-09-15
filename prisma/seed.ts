import "dotenv/config";
import { Client } from "pg";
import { readFileSync } from "fs";
import { join } from "path";
import * as bcrypt from "bcryptjs";

async function main() {
  const seedPassword = process.env.SEED_PASSWORD || "arches123";
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  // Read the original seed SQL provided by the client
  const sqlPath = join(process.cwd(), "..", "handoff", "03-SEED.sql");
  let sql = readFileSync(sqlPath, "utf-8");
  
  // Inject the hashed password
  sql = sql.replace(/'<bcrypt>'/g, `'${passwordHash}'`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();
  console.log("Executing seed SQL...");
  await client.query(sql);
  await client.end();
  console.log("Seed successful! Use 'arches123' as password for seed users.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
