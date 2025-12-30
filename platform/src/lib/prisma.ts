import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Sanitize DATABASE_URL to remove potential quotes from cloud dashboards
const rawUrl = process.env.DATABASE_URL || "";
const sanitizedUrl = rawUrl.replace(/^["'](.+)["']$/, '$1');

if (rawUrl !== sanitizedUrl) {
    console.log('🛡️  Prisma: Sanitized DATABASE_URL (removed quotes)');
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
    datasources: {
        db: {
            url: sanitizedUrl
        }
    }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
