/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { APP_CONFIG } from '../../config';
import '../public/LoginPage.css';

export default function OrgSetupPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name) { setError('Organisation name is required'); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem('session_token');
      const res = await fetch('/api/org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, country, companySize, industry }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create organisation'); return; }

      await refreshUser();
      navigate('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="logo">{APP_CONFIG.name}</div>
        <div className="subtitle">Set up your organisation</div>
        <div className="auth-card">
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Organisation Name *</label>
              <input type="text" placeholder="Acme Ltd" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input type="text" placeholder="e.g. United Kingdom" className="form-input" value={country} onChange={e => setCountry(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Company Size</label>
              <select className="form-input" value={companySize} onChange={e => setCompanySize(e.target.value)}>
                <option value="">Select...</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="500+">500+</option>
              </select>
            </div>
            <div className="form-group">
              <label>Industry</label>
              <input type="text" placeholder="e.g. Technology, Healthcare" className="form-input" value={industry} onChange={e => setIndustry(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!name || loading}>
              {loading ? 'Creating...' : 'Create Organisation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
