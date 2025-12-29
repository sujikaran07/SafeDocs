import axios from 'axios';

async function simulate() {
    const email = 'tamilveeran20070907@gmail.com';
    const plan = 'ENTERPRISE'; // or 'PRO'

    console.log(`🚀 Simulating ENTERPRISE upgrade for ${email}...`);

    const payload = {
        type: 'checkout.session.completed',
        data: {
            object: {
                customer_email: email,
                customer: 'cus_simulated_123',
                subscription: 'sub_simulated_123',
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
                // No signature needed since we'll set STRIPE_WEBHOOK_SECRET=skip
            }
        });
        console.log('✅ Webhook simulation sent!', res.data);
    } catch (err: any) {
        console.error('❌ Simulation failed:', err.response?.data || err.message);
        console.log('Ensure you have set STRIPE_WEBHOOK_SECRET=skip in .env and restarted the server.');
    }
}

simulate();
