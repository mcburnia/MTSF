import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getOrCreateBilling,
  countSeats,
  createCheckoutSession,
  createPortalSession,
  processWebhookEvent,
} from '../services/billing.js';

const router = Router();

/** Helper: get the org_id for a user. */
async function getUserOrgId(userId: string): Promise<string | null> {
  const result = await pool.query('SELECT org_id FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.org_id || null;
}

// GET /api/billing/status
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orgId = await getUserOrgId(userId);
    if (!orgId) {
      res.status(404).json({ error: 'No organisation found' });
      return;
    }

    const billing = await getOrCreateBilling(orgId);
    const seats = await countSeats(orgId);

    const trialDaysRemaining = billing.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(billing.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    res.json({
      status: billing.status,
      plan: billing.plan,
      trialEndsAt: billing.trial_ends_at,
      trialDaysRemaining,
      graceEndsAt: billing.grace_ends_at,
      seatCount: seats,
      stripeCustomerId: billing.stripe_customer_id,
      stripeSubscriptionId: billing.stripe_subscription_id,
      exempt: billing.exempt,
      exemptReason: billing.exempt_reason,
      billingEmail: billing.billing_email,
      vatNumber: billing.vat_number,
      monthlyAmountCents: billing.monthly_amount_cents,
    });
  } catch (err) {
    console.error('Billing status error:', err);
    res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

// POST /api/billing/checkout
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orgId = await getUserOrgId(userId);
    if (!orgId) {
      res.status(404).json({ error: 'No organisation found' });
      return;
    }

    const { plan } = req.body;
    const url = await createCheckoutSession(orgId, plan || 'standard');
    res.json({ url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/billing/portal
router.post('/portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orgId = await getUserOrgId(userId);
    if (!orgId) {
      res.status(404).json({ error: 'No organisation found' });
      return;
    }

    const url = await createPortalSession(orgId);
    res.json({ url });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// POST /api/billing/webhook — Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      res.status(400).json({ error: 'Missing webhook signature' });
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const rawBody = (req as any).rawBody;

    if (!rawBody) {
      res.status(400).json({ error: 'Missing raw body for webhook verification' });
      return;
    }

    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    await processWebhookEvent(event);

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

export default router;
