import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { Plus, Trash2 } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  created_by_email: string | null;
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    const token = localStorage.getItem('session_token');
    try {
      const res = await fetch('/api/items', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setItems(data.items || []); }
    } catch { /* non-critical */ }
    setLoading(false);
  }

  async function createItem() {
    if (!newName) return;
    const token = localStorage.getItem('session_token');
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      if (res.ok) {
        setNewName(''); setNewDesc(''); setShowCreate(false);
        fetchItems();
      }
    } catch { /* handled */ }
  }

  async function deleteItem(id: string) {
    const token = localStorage.getItem('session_token');
    await fetch(`/api/items/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchItems();
  }

  return (
    <>
      <PageHeader title="Items">
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={16} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
          New Item
        </button>
      </PageHeader>

      {showCreate && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Item name" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input type="text" className="form-input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional description" />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={createItem} disabled={!newName}>Create</button>
            <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h3>No items yet</h3>
          <p>Create your first item to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Item</button>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Created</th>
              <th>Created By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td><Link to={`/items/${item.id}`} style={{ color: 'var(--accent)' }}>{item.name}</Link></td>
                <td><span className={`badge ${item.status === 'active' ? 'green' : 'amber'}`}>{item.status}</span></td>
                <td>{new Date(item.created_at).toLocaleDateString()}</td>
                <td style={{ color: 'var(--muted)' }}>{item.created_by_email || '—'}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => deleteItem(item.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
