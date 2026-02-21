import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import axios from 'axios';

export default function Maintenance() {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        axios.get('http://localhost:8001/api/maintenance').then(res => setLogs(res.data));
    }, []);

    const getUrgencyBadge = (u) => {
        if (u === 'Critical') return <span className="badge badge-danger">● {u}</span>;
        if (u === 'Moderate') return <span className="badge badge-warning">● {u}</span>;
        return <span className="badge badge-neutral">● {u}</span>;
    }

    return (
        <div className="maintenance-page">
            <div className="page-header">
                <div className="page-title">
                    <h1>Maintenance & Repair Logs</h1>
                    <p>Manage, track, and schedule repairs for the entire fleet.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary"><Plus size={16} /> Log New Repair</button>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Vehicle ID</th>
                            <th>Issue Description</th>
                            <th>Urgency</th>
                            <th>Cost Est.</th>
                            <th>Exp. Completion</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td><div className="td-id">{log.vehicle_id}</div></td>
                                <td><b>{log.issue}</b><br /><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.description}</span></td>
                                <td>{getUrgencyBadge(log.urgency)}</td>
                                <td>${log.cost_est.toFixed(2)}</td>
                                <td><b style={{ color: log.urgency === 'Critical' ? 'var(--danger)' : '' }}>{log.exp_completion}</b></td>
                                <td><span className="badge badge-neutral">{log.status}</span></td>
                            </tr>
                        ))}
                        {logs.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: '#64748b' }}>No maintenance records found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
