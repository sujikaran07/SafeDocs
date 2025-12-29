import axios from 'axios';

/**
 * SIMULATE STRIPE WEBHOOK
 * Usage: npx tsx scripts/simulate-webhook.ts <email> <PLAN>
 */

async function main() {
    const email = process.argv[2]?.toLowerCase().trim();
    const plan = (process.argv[3] || 'PRO').toUpperCase();

    if (!email) {
        console.error('❌ Error: Email required.');
        return;
    }

    console.log(`🚀 Simulating Stripe Webhook for ${email} -> ${plan}...`);

    const payload = {
        type: 'checkout.session.completed',
        data: {
            object: {
                customer_email: email,
                customer: 'cus_simulated_' + Math.random().toString(36).substring(7),
                subscription: 'sub_simulated_' + Math.random().toString(36).substring(7),
                metadata: {
                    plan: plan,
                    userEmail: email
                }
            }
        }
    };

    try {
        const res = await axios.post('http://localhost:3000/api/stripe/webhook', payload, {
            headers: {
                'Content-Type': 'application/json',
                // Note: This requires STRIPE_WEBHOOK_SECRET=skip in .env for local testing
            }
        });
        console.log('✅ Webhook accepted!', res.data);
        console.log('Refresh your dashboard to see changes.');
    } catch (err: any) {
        console.error('❌ Failed:', err.response?.data || err.message);
        console.log('\n💡 Tip: Ensure your server is running and STRIPE_WEBHOOK_SECRET=skip is in .env');
    }
}

main();
