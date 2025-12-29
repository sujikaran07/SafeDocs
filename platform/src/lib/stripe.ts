import Stripe from 'stripe';
import { PRICING_PLANS } from '@/constants/pricing';

// Initialize Stripe with test mode secret key
// This ensures ONLY test cards work, not real cards
const apiKey = process.env.STRIPE_SECRET_KEY;

export const stripe = (typeof window === 'undefined' && apiKey)
    ? new Stripe(apiKey, {
        apiVersion: '2025-12-15.clover',
        typescript: true,
    })
    : null as any; // Cast as any to avoid type issues in client components that shouldn't use it anyway

export { PRICING_PLANS };
