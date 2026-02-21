import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../api';

export default function Drivers() {
    const [drivers, setDrivers] = useState([]);

    useEffect(() => {
        api.get('/api/drivers')
            .then(res => setDrivers(res.data))
            .catch(console.error);
    }, []);

    const isExpired = (dateStr) => new Date(dateStr) < new Date();
    const isExpiringSoon = (dateStr) => {
        const d = new Date(dateStr);
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + 30);
        return d > new Date() && d < threshold;
    };

    return (
        <div className="drivers-page">
            <div className="page-header">
                <div className="page-title">
                    <h1>Driver Profiles</h1>
                    <p>Monitor fleet safety scores, license compliance, and current assignment status.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary"><Plus size={16} /> Add Driver</button>
                </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {drivers.map(driver => {
                    const isSuspended = driver.duty_status === 'suspended';
                    const licenseExpired = isExpired(driver.license_expiry_date);
                    const licenseWarn = isExpiringSoon(driver.license_expiry_date);
                    return (
                        <div key={driver.id} className="stat-card" style={{
                            display: 'flex', flexDirection: 'column', gap: 16,
                            border: isSuspended ? '1px solid var(--danger)' : licenseExpired ? '1px solid #f59e0b' : undefined
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <img
                                        src={driver.avatar_url || `https://i.pravatar.cc/150?u=${driver.id}`}
                                        alt="avatar"
                                        style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                                    />
                                    <div>
                                        <h3 style={{ margin: 0 }}>{driver.name}</h3>
                                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0' }}>
                                            #{driver.license_number}
                                        </p>
                                        <span className={isSuspended ? 'badge badge-danger' : 'badge badge-success'}
                                            style={{ padding: '2px 8px', fontSize: 10 }}>
                                            ● {driver.duty_status?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 24, fontWeight: 'bold', color: isSuspended ? 'var(--text-secondary)' : 'var(--primary-color)' }}>
                                        {driver.safety_score}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>SCORE</div>
                                </div>
                            </div>

                            {/* Safety score bar */}
                            <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2 }}>
                                <div style={{
                                    height: '100%',
                                    width: `${driver.safety_score}%`,
                                    background: isSuspended ? 'var(--danger)' : driver.safety_score < 60 ? 'var(--warning)' : 'var(--primary-color)',
                                    borderRadius: 2
                                }} />
                            </div>

                            {/* License expiry */}
                            <div style={{
                                fontSize: 12,
                                color: licenseExpired ? 'var(--danger)' : licenseWarn ? '#d97706' : 'var(--text-secondary)',
                                fontWeight: licenseExpired || licenseWarn ? 600 : 400,
                            }}>
                                {licenseExpired ? '⚠ LICENSE EXPIRED: ' : licenseWarn ? '⚠ EXPIRES SOON: ' : 'License Expires: '}
                                {driver.license_expiry_date}
                            </div>

                            {isSuspended && (
                                <div style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>
                                    ⚠ COMPLIANCE HOLD — Account Suspended
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }}>View Details</button>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 1, ...(isSuspended || licenseExpired ? { background: '#e2e8f0', color: '#94a3b8' } : {}) }}
                                    disabled={isSuspended || licenseExpired}
                                >
                                    {isSuspended ? 'Assign Locked' : licenseExpired ? 'License Invalid' : 'Assign Trip'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
