/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';

interface Item {
  id: string;
  name: string;
  description: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => { fetchItem(); }, [id]);

  async function fetchItem() {
    const token = localStorage.getItem('session_token');
    const res = await fetch(`/api/items/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setItem(data);
      setName(data.name);
      setDescription(data.description || '');
      setStatus(data.status);
    }
  }

  async function saveItem() {
    const token = localStorage.getItem('session_token');
    const res = await fetch(`/api/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, description, status }),
    });
    if (res.ok) {
      setEditing(false);
      fetchItem();
    }
  }

  if (!item) return <p style={{ color: 'var(--muted)' }}>Loading...</p>;

  return (
    <>
      <PageHeader title={item.name}>
        {!editing ? (
          <button className="btn btn-outline" onClick={() => setEditing(true)}>Edit</button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={saveItem}>Save</button>
            <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        )}
        <button className="btn btn-outline" onClick={() => navigate('/items')}>Back</button>
      </PageHeader>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.5rem' }}>
        {editing ? (
          <>
            <div className="form-group">
              <label>Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</span>
              <div><span className={`badge ${item.status === 'active' ? 'green' : 'amber'}`}>{item.status}</span></div>
            </div>
            {item.description && (
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Description</span>
                <div>{item.description}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '2rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
              <div>Created: {new Date(item.created_at).toLocaleString()}</div>
              <div>Updated: {new Date(item.updated_at).toLocaleString()}</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
