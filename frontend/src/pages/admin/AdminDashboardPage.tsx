import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';

interface AdminData {
  totalUsers: number;
  totalOrgs: number;
  billing: {
    trial: number;
    active: number;
    past_due: number;
    cancelled: number;
    exempt: number;
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  return (
    <>
      <PageHeader title="Platform Dashboard" />
      <div className="stats">
        <StatCard label="Total Users" value={data?.totalUsers ?? '...'} color="blue" />
        <StatCard label="Total Organisations" value={data?.totalOrgs ?? '...'} color="green" />
        <StatCard label="Active Subscriptions" value={data?.billing?.active ?? '...'} color="green" />
        <StatCard label="Trial" value={data?.billing?.trial ?? '...'} color="amber" />
        <StatCard label="Past Due" value={data?.billing?.past_due ?? '...'} color="red" />
        <StatCard label="Exempt" value={data?.billing?.exempt ?? '...'} color="blue" />
      </div>
    </>
  );
}
