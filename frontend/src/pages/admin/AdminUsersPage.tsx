import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';

interface AdminUser {
  id: string;
  email: string;
  org_name: string | null;
  org_role: string | null;
  is_platform_admin: boolean;
  email_verified: boolean;
  suspended_at: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUsers(); }, [filter, search]);

  async function fetchUsers() {
    const token = localStorage.getItem('session_token');
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const data = await res.json(); setUsers(data.users || []); }
  }

  return (
    <>
      <PageHeader title="Users" />
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['all', 'admins', 'unverified', 'suspended'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <input className="search-input" placeholder="Search by email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Organisation</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td style={{ color: 'var(--muted)' }}>{u.org_name || '—'}</td>
              <td>
                {u.is_platform_admin && <span className="badge purple">Admin</span>}
                {u.org_role && !u.is_platform_admin && <span className="badge blue">{u.org_role}</span>}
              </td>
              <td>
                {u.suspended_at ? <span className="badge red">Suspended</span>
                  : !u.email_verified ? <span className="badge amber">Unverified</span>
                  : <span className="badge green">Active</span>}
              </td>
              <td style={{ color: 'var(--muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
