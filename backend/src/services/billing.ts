/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import Stripe from 'stripe';
import pool from '../db/pool.js';
import { APP_CONFIG } from '../config.js';

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    stripe = new Stripe(key);
  }
  return stripe;
}

/** Get or create billing record for an org. */
export async function getOrCreateBilling(orgId: string) {
  const result = await pool.query('SELECT * FROM org_billing WHERE org_id = $1', [orgId]);
  if (result.rows.length > 0) return result.rows[0];

  const trialEndsAt = new Date(Date.now() + APP_CONFIG.trialDays * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO org_billing (org_id, status, plan, trial_ends_at)
     VALUES ($1, 'trial', 'standard', $2)
     ON CONFLICT (org_id) DO NOTHING`,
    [orgId, trialEndsAt]
  );

  const fresh = await pool.query('SELECT * FROM org_billing WHERE org_id = $1', [orgId]);
  return fresh.rows[0];
}

/** Count seats (active members) in an org. */
export async function countSeats(orgId: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) FROM users WHERE org_id = $1 AND suspended_at IS NULL',
    [orgId]
  );
  return parseInt(result.rows[0].count, 10);
}

/** Create a Stripe checkout session for subscription. */
export async function createCheckoutSession(orgId: string, planId: string): Promise<string> {
  const s = getStripe();

  const billing = await getOrCreateBilling(orgId);

  let customerId = billing.stripe_customer_id;
  if (!customerId) {
    const orgResult = await pool.query('SELECT name FROM organisations WHERE id = $1', [orgId]);
    const orgName = orgResult.rows[0]?.name || 'Unknown';

    const customer = await s.customers.create({
      name: orgName,
      metadata: { orgId },
    });
    customerId = customer.id;

    await pool.query(
      'UPDATE org_billing SET stripe_customer_id = $1, updated_at = NOW() WHERE org_id = $2',
      [customerId, orgId]
    );
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error('STRIPE_PRICE_ID not configured');

  const session = await s.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: await countSeats(orgId) }],
    success_url: `${APP_CONFIG.frontendUrl}/billing?success=true`,
    cancel_url: `${APP_CONFIG.frontendUrl}/billing?cancelled=true`,
    metadata: { orgId, plan: planId },
  });

  return session.url!;
}

/** Create a Stripe portal session for self-serve subscription management. */
export async function createPortalSession(orgId: string): Promise<string> {
  const s = getStripe();
  const billing = await getOrCreateBilling(orgId);

  if (!billing.stripe_customer_id) {
    throw new Error('No Stripe customer found for this organisation');
  }

  const session = await s.billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    return_url: `${APP_CONFIG.frontendUrl}/billing`,
  });

  return session.url;
}

/** Process a Stripe webhook event. */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId;
      const plan = session.metadata?.plan || 'standard';
      if (!orgId) break;

      await pool.query(
        `UPDATE org_billing SET
          status = 'active',
          plan = $1,
          stripe_subscription_id = $2,
          trial_ends_at = NULL,
          grace_ends_at = NULL,
          updated_at = NOW()
        WHERE org_id = $3`,
        [plan, session.subscription, orgId]
      );

      await logBillingEvent(orgId, 'checkout_completed', event.id, { plan });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const orgResult = await pool.query(
        'SELECT org_id FROM org_billing WHERE stripe_subscription_id = $1',
        [sub.id]
      );
      const orgId = orgResult.rows[0]?.org_id;
      if (!orgId) break;

      const status = sub.status === 'active' ? 'active'
        : sub.status === 'past_due' ? 'past_due'
        : sub.status === 'canceled' ? 'cancelled'
        : 'active';

      await pool.query(
        'UPDATE org_billing SET status = $1, updated_at = NOW() WHERE org_id = $2',
        [status, orgId]
      );

      await logBillingEvent(orgId, 'subscription_updated', event.id, { stripeStatus: sub.status });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const orgResult = await pool.query(
        'SELECT org_id FROM org_billing WHERE stripe_subscription_id = $1',
        [sub.id]
      );
      const orgId = orgResult.rows[0]?.org_id;
      if (!orgId) break;

      await pool.query(
        'UPDATE org_billing SET status = $1, stripe_subscription_id = NULL, updated_at = NOW() WHERE org_id = $2',
        ['cancelled', orgId]
      );

      await logBillingEvent(orgId, 'subscription_deleted', event.id);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;

      const orgResult = await pool.query(
        'SELECT org_id FROM org_billing WHERE stripe_customer_id = $1',
        [customerId]
      );
      const orgId = orgResult.rows[0]?.org_id;
      if (!orgId) break;

      const graceEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await pool.query(
        'UPDATE org_billing SET status = $1, grace_ends_at = $2, updated_at = NOW() WHERE org_id = $3',
        ['past_due', graceEndsAt, orgId]
      );

      await logBillingEvent(orgId, 'payment_failed', event.id);
      break;
    }
  }
}

async function logBillingEvent(
  orgId: string,
  eventType: string,
  stripeEventId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO billing_events (org_id, event_type, stripe_event_id, metadata)
       VALUES ($1, $2, $3, $4)`,
      [orgId, eventType, stripeEventId || null, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.error('[BILLING] Failed to log billing event:', err);
  }
}

/** Check and handle expired trials. Called by scheduler. */
export async function checkExpiredTrials(): Promise<void> {
  const result = await pool.query(
    `SELECT org_id FROM org_billing
     WHERE status = 'trial' AND trial_ends_at < NOW() AND exempt = FALSE`
  );

  for (const row of result.rows) {
    const graceEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      `UPDATE org_billing SET grace_ends_at = $1, updated_at = NOW() WHERE org_id = $2`,
      [graceEndsAt, row.org_id]
    );
  }
}

/** Check and handle expired grace periods. */
export async function checkExpiredGrace(): Promise<void> {
  await pool.query(
    `UPDATE org_billing SET status = 'read_only', updated_at = NOW()
     WHERE grace_ends_at < NOW() AND status IN ('trial', 'past_due') AND exempt = FALSE`
  );
}
