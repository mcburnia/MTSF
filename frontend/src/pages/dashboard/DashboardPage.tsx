import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';

interface DashboardData {
  itemCount: number;
  memberCount: number;
  billingStatus: string;
  plan: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    const token = localStorage.getItem('session_token');
    try {
      const [itemsRes, membersRes, billingRes] = await Promise.all([
        fetch('/api/items', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/org/members', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/billing/status', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const items = itemsRes.ok ? await itemsRes.json() : { items: [] };
      const members = membersRes.ok ? await membersRes.json() : { members: [] };
      const billing = billingRes.ok ? await billingRes.json() : { status: 'unknown', plan: 'standard' };

      setData({
        itemCount: items.items?.length || 0,
        memberCount: members.members?.length || 0,
        billingStatus: billing.status,
        plan: billing.plan,
      });
    } catch {
      // Dashboard data is non-critical
    }
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="stats">
        <StatCard label="Items" value={data?.itemCount ?? '...'} color="blue" />
        <StatCard label="Team Members" value={data?.memberCount ?? '...'} color="green" />
        <StatCard label="Plan" value={data?.plan?.toUpperCase() ?? '...'} color="amber" />
        <StatCard
          label="Billing Status"
          value={data?.billingStatus ?? '...'}
          color={data?.billingStatus === 'active' ? 'green' : data?.billingStatus === 'trial' ? 'blue' : 'amber'}
        />
      </div>

      <div className="section">
        <h3>Getting Started</h3>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.5rem' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.8' }}>
            Welcome to your dashboard. Here's what you can do next:
          </p>
          <ul style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '2', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Create your first <strong style={{ color: 'var(--text)' }}>Item</strong> from the sidebar</li>
            <li>Invite team members from <strong style={{ color: 'var(--text)' }}>Settings</strong></li>
            <li>Set up billing from the <strong style={{ color: 'var(--text)' }}>Billing</strong> page</li>
          </ul>
        </div>
      </div>
    </>
  );
}
