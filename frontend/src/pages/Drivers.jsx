import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import axios from 'axios';

export default function Drivers() {
    const [drivers, setDrivers] = useState([]);

    useEffect(() => {
        axios.get('http://localhost:8001/api/drivers').then(res => setDrivers(res.data));
    }, []);

    return (
        <div className="drivers-page">
            <div className="page-header">
                <div className="page-title">
                    <h1>Driver Profiles</h1>
                    <p>Monitor fleet safety scores, license compliance, and current assignment status.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary"><Plus size={16} /> Add New Driver</button>
                </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {drivers.map(driver => {
                    const isSuspended = driver.status === 'SUSPENDED';
                    return (
                        <div key={driver.id} className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, border: isSuspended ? '1px solid var(--danger)' : undefined }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <img src={driver.avatar_url || "https://i.pravatar.cc/150"} alt="avatar" style={{ width: 48, height: 48, borderRadius: '8px' }} />
                                    <div>
                                        <h3 style={{ margin: 0 }}>{driver.name}</h3>
                                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0' }}>ID: {driver.id} • {driver.role}</p>
                                        <span className={isSuspended ? "badge badge-danger" : "badge badge-success"} style={{ padding: '2px 8px', fontSize: 10 }}>● {driver.status}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 24, fontWeight: 'bold', color: isSuspended ? 'var(--text-secondary)' : 'var(--primary-color)' }}>{driver.score}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>SCORE</div>
                                </div>
                            </div>
                            <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2 }}>
                                <div style={{ height: '100%', width: `${driver.score}%`, background: isSuspended ? 'var(--danger)' : 'var(--primary-color)', borderRadius: 2 }}></div>
                            </div>

                            {isSuspended && (
                                <div style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>⚠ COMPLIANCE HOLD</span>
                                    <span>{driver.license_expires}</span>
                                </div>
                            )}
                            {!isSuspended && (
                                <div style={{ color: 'var(--text-secondary)', fontSize: 12, flex: 1 }}>
                                    License Expires: {driver.license_expires}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }}>View Details</button>
                                <button className="btn btn-primary" style={{ flex: 1, backgroundColor: isSuspended ? 'var(--bg-color)' : '', color: isSuspended ? 'var(--text-secondary)' : '' }} disabled={isSuspended}>{isSuspended ? 'Assign Locked' : 'Assign Trip'}</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
