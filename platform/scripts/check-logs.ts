import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('📋 Fetching recent webhook logs...');

    try {
        const logs = await prisma.webhookLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        if (logs.length === 0) {
            console.log('ℹ️ No webhook logs found.');
            return;
        }

        logs.forEach(log => {
            console.log(`[${log.createdAt.toISOString()}] Event: ${log.event} | Status: ${log.processed ? '✅ PROCESSED' : '❌ FAILED/PENDING'}`);
            if (log.error) {
                console.log(`   ⚠️ Error: ${log.error}`);
            }
            // Use type assertion for payload to avoid TS error
            const payload = log.payload as any;
            if (payload?.data?.object?.customer_email) {
                console.log(`   📧 Email: ${payload.data.object.customer_email}`);
            } else if (payload?.metadata?.userEmail) {
                console.log(`   📧 Meta Email: ${payload.metadata.userEmail}`);
            }
            console.log('---');
        });
    } catch (error) {
        console.error('❌ Error fetching logs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
