import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';

interface AdminOrg {
  id: string;
  name: string;
  billing_status: string | null;
  plan: string | null;
  member_count: number;
  exempt: boolean;
  created_at: string;
}

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    fetch('/api/admin/orgs', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : { orgs: [] })
      .then(data => setOrgs(data.orgs || []))
      .catch(() => {});
  }, []);

  return (
    <>
      <PageHeader title="Organisations" />
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Members</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map(o => (
            <tr key={o.id}>
              <td>{o.name}</td>
              <td>{o.member_count}</td>
              <td><span className="badge blue">{o.plan || 'standard'}</span></td>
              <td>
                {o.exempt ? <span className="badge purple">Exempt</span>
                  : <span className={`badge ${o.billing_status === 'active' ? 'green' : o.billing_status === 'trial' ? 'blue' : 'amber'}`}>{o.billing_status || 'none'}</span>}
              </td>
              <td style={{ color: 'var(--muted)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
