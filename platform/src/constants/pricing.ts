export const PRICING_PLANS = {
    FREE: {
        name: 'Free',
        price: 0,
        maxScans: 10,
        features: [
            '10 scans per month',
            'Basic malware detection',
            'PDF sanitization',
            'Email support',
        ],
    },
    PRO: {
        name: 'Pro',
        price: 2900, // $29.00 in cents
        priceId: process.env.STRIPE_PRO_PRICE_ID!,
        maxScans: 100,
        features: [
            '100 scans per month',
            'Advanced threat detection',
            'Priority processing',
            'API access',
            'Priority support',
        ],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        price: 19900, // $199.00 in cents
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
        maxScans: -1, // Unlimited
        features: [
            'Unlimited scans',
            'Advanced ML detection',
            'Custom integrations',
            'Dedicated support',
            'SLA guarantee',
        ],
    },
};
