import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';

interface BillingData {
  status: string;
  plan: string;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  seatCount: number;
  exempt: boolean;
  exemptReason: string | null;
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);

  useEffect(() => { fetchBilling(); }, []);

  async function fetchBilling() {
    const token = localStorage.getItem('session_token');
    const res = await fetch('/api/billing/status', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setBilling(await res.json());
  }

  async function openCheckout() {
    const token = localStorage.getItem('session_token');
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan: 'standard' }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
  }

  async function openPortal() {
    const token = localStorage.getItem('session_token');
    const res = await fetch('/api/billing/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
  }

  if (!billing) return <p style={{ color: 'var(--muted)' }}>Loading billing...</p>;

  return (
    <>
      <PageHeader title="Billing">
        {billing.status === 'active' ? (
          <button className="btn btn-outline" onClick={openPortal}>Manage Subscription</button>
        ) : !billing.exempt ? (
          <button className="btn btn-primary" onClick={openCheckout}>Subscribe</button>
        ) : null}
      </PageHeader>

      <div className="stats">
        <StatCard label="Status" value={billing.status} color={billing.status === 'active' ? 'green' : billing.status === 'trial' ? 'blue' : 'amber'} />
        <StatCard label="Plan" value={billing.plan.toUpperCase()} color="blue" />
        <StatCard label="Seats" value={billing.seatCount} color="green" />
        {billing.trialDaysRemaining !== null && (
          <StatCard label="Trial Days Left" value={billing.trialDaysRemaining} color={billing.trialDaysRemaining <= 7 ? 'red' : 'amber'} />
        )}
      </div>

      {billing.exempt && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Exempt Organisation</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            {billing.exemptReason || 'This organisation is exempt from billing.'}
          </p>
        </div>
      )}
    </>
  );
}
