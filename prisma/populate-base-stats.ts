import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { populateBaseStats } from "../src/lib/scrapers/base-stats";

const dbPath = path.resolve(__dirname, "..", "dev.db");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

populateBaseStats(prisma)
  .then(() => prisma.$disconnect())
  .catch(console.error);
