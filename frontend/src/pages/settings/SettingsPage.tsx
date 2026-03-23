/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';

export default function SettingsPage() {
  const [orgName, setOrgName] = useState('');
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchOrg(); }, []);

  async function fetchOrg() {
    const token = localStorage.getItem('session_token');
    const res = await fetch('/api/org', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setOrgName(data.name || '');
      setCountry(data.country || '');
      setIndustry(data.industry || '');
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const token = localStorage.getItem('session_token');
    await fetch('/api/org', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: orgName, country, industry }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.5rem', maxWidth: '600px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Organisation</h3>
        <div className="form-group">
          <label>Name</label>
          <input className="form-input" value={orgName} onChange={e => setOrgName(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Country</label>
          <input className="form-input" value={country} onChange={e => setCountry(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Industry</label>
          <input className="form-input" value={industry} onChange={e => setIndustry(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </>
  );
}
