/** Executa as rotinas manualmente ou por cron do servidor: npm run jobs:run */
import { runJobs } from "../src/lib/jobs";
import { prisma } from "../src/lib/db";
runJobs().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
