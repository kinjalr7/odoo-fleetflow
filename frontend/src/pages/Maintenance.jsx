import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import api from '../api';

export default function Maintenance() {
    const [logs, setLogs] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [vehicles, setVehicles] = useState([]);
    const [form, setForm] = useState({ vehicle_id: '', description: '', cost: '' });
    const [msg, setMsg] = useState(null);

    const loadData = () => {
        api.get('/api/maintenance').then(res => setLogs(res.data)).catch(console.error);
        api.get('/api/vehicles').then(res => setVehicles(res.data)).catch(console.error);
    };

    useEffect(() => { loadData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/maintenance', {
                vehicle_id: form.vehicle_id,
                description: form.description,
                cost: parseFloat(form.cost),
            });
            setMsg({ type: 'success', text: 'Maintenance log added. Vehicle set to In Shop.' });
            setShowForm(false);
            setForm({ vehicle_id: '', description: '', cost: '' });
            loadData();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.detail || 'Error creating log' });
        }
    };

    const handleResolve = async (logId) => {
        if (!confirm('Mark as resolved? Vehicle will be returned to Available.')) return;
        try {
            await api.delete(`/api/maintenance/${logId}`);
            setMsg({ type: 'success', text: 'Maintenance resolved — vehicle is now available.' });
            loadData();
        } catch {
            setMsg({ type: 'error', text: 'Error resolving maintenance' });
        }
    };

    return (
        <div className="maintenance-page">
            <div className="page-header">
                <div className="page-title">
                    <h1>Maintenance & Repair Logs</h1>
                    <p>Track and schedule repairs across the entire fleet.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        <Plus size={16} /> Log New Repair
                    </button>
                </div>
            </div>

            {msg && (
                <div style={{
                    padding: '10px 16px', marginBottom: 16, borderRadius: 8,
                    background: msg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                    border: `1px solid ${msg.type === 'error' ? 'var(--danger)' : '#22c55e'}`,
                    color: msg.type === 'error' ? 'var(--danger)' : '#15803d',
                    fontSize: 13, display: 'flex', justifyContent: 'space-between',
                }}>
                    {msg.text}
                    <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {showForm && (
                <div className="table-container" style={{ padding: 24, marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>New Maintenance Log</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>VEHICLE</label>
                            <select className="btn btn-secondary" style={{ width: '100%', padding: '10px', marginTop: 4 }}
                                value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} required>
                                <option value="">-- Select Vehicle --</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.plate_number} ({v.vehicle_type})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>DESCRIPTION</label>
                            <textarea className="btn btn-secondary" style={{ width: '100%', padding: '10px', marginTop: 4, minHeight: 80, resize: 'vertical' }}
                                placeholder="Describe the issue..." value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })} required />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>COST ESTIMATE ($)</label>
                            <input type="number" step="0.01" className="btn btn-secondary" style={{ width: '100%', padding: '10px', marginTop: 4 }}
                                placeholder="e.g. 850.00" value={form.cost}
                                onChange={e => setForm({ ...form, cost: e.target.value })} required />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button type="submit" className="btn btn-primary">Submit Log</button>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Vehicle</th>
                            <th>Description</th>
                            <th>Cost</th>
                            <th>Date Logged</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td><div className="td-id">{log.vehicle_id}</div></td>
                                <td><span style={{ fontSize: 13 }}>{log.description}</span></td>
                                <td><b>${Number(log.cost).toFixed(2)}</b></td>
                                <td>{new Date(log.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                                        onClick={() => handleResolve(log.id)}>
                                        ✓ Resolve
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: 32 }}>No maintenance records found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
