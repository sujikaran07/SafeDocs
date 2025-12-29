import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const logs = await prisma.webhookLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        console.log(`Found ${logs.length} webhook logs.`);
        logs.forEach(log => {
            console.log(`[${log.createdAt.toISOString()}] ${log.provider} - ${log.event}`);
        });
    } catch (error) {
        console.error('WebhookLog table error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
