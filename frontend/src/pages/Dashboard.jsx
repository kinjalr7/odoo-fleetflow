import React, { useState, useEffect } from 'react';
import { Truck, AlertTriangle, Clock, Package, Filter, Plus } from 'lucide-react';
import api from '../api';

export default function Dashboard() {
    const [stats, setStats] = useState({
        active_vehicles: 0,
        maintenance_alerts: 0,
        idle_vehicles: 0,
        pending_shipments: 0,
        total_drivers: 0,
        suspended_drivers: 0,
    });
    const [trips, setTrips] = useState([]);
    const [alerts, setAlerts] = useState([]);

    const fetchData = async () => {
        try {
            const [statsRes, tripsRes] = await Promise.all([
                api.get('/api/stats'),
                api.get('/api/trips'),
            ]);
            setStats(statsRes.data);
            setTrips(tripsRes.data);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        }
    };

    useEffect(() => {
        fetchData();

        // Native WebSocket (compatible with FastAPI backend)
        let ws;
        try {
            ws = new WebSocket('ws://localhost:8001/ws');
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.event === 'dashboardUpdate') {
                        if (msg.data?.active_vehicles !== undefined) setStats(msg.data);
                        else fetchData();
                    } else if (msg.event === 'alert') {
                        setAlerts(prev => [msg.data, ...prev].slice(0, 5));
                    }
                } catch { }
            };
            ws.onerror = () => console.warn('WebSocket unavailable — polling disabled');
        } catch { }

        return () => ws?.close();
    }, []);

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <div className="page-title">
                    <h1>Fleet Overview</h1>
                    <p>Real-time logistics and maintenance status</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary"><Filter size={16} /> Filters</button>
                    <button className="btn btn-primary"><Plus size={16} /> New Shipment</button>
                </div>
            </div>

            {/* Live alerts */}
            {alerts.map((alert, i) => (
                <div key={i} style={{
                    padding: '10px 16px', marginBottom: 8, borderRadius: 8,
                    background: alert.severity === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${alert.severity === 'critical' ? 'var(--danger)' : '#f59e0b'}`,
                    color: alert.severity === 'critical' ? 'var(--danger)' : '#92400e',
                    fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <AlertTriangle size={14} /> {alert.message}
                    <button onClick={() => setAlerts(p => p.filter((_, j) => j !== i))}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit' }}>✕</button>
                </div>
            ))}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue"><Truck size={20} /></div>
                    <div className="stat-label">Active Vehicles</div>
                    <div className="stat-value">{stats.active_vehicles}</div>
                </div>
                <div className="stat-card alert">
                    <div className="stat-icon red"><AlertTriangle size={20} /></div>
                    <div className="stat-label">Maintenance Alerts</div>
                    <div className="stat-value">{stats.maintenance_alerts}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon gray"><Clock size={20} /></div>
                    <div className="stat-label">Idle Vehicles</div>
                    <div className="stat-value">{stats.idle_vehicles}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue"><Package size={20} /></div>
                    <div className="stat-label">Pending Shipments</div>
                    <div className="stat-value">{stats.pending_shipments}</div>
                </div>
            </div>

            <div className="table-container" style={{ padding: 24, marginBottom: 24, height: 200, background: 'linear-gradient(135deg, #e0f2fe, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                <p style={{ color: '#64748b', fontSize: 18 }}>🗺 Live Vehicle Locations Map</p>
            </div>

            <div className="table-container">
                <div className="table-header-filters">
                    <h3 style={{ flex: 1 }}>Recent Trip Activity</h3>
                    <a href="#" style={{ color: 'var(--primary-color)', fontSize: 14, fontWeight: 600 }}>View All</a>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Vehicle</th>
                            <th>Driver</th>
                            <th>Destination</th>
                            <th>Cargo (kg)</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trips.length > 0 ? trips.map(trip => (
                            <tr key={trip.id}>
                                <td className="td-id">{trip.vehicle?.plate_number || trip.vehicle_id}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className="avatar" style={{ width: 24, height: 24, fontSize: 10, background: '#bfdbfe', color: '#1d4ed8' }}>
                                            {trip.driver?.name?.substring(0, 2).toUpperCase() || '??'}
                                        </div>
                                        {trip.driver?.name || '—'}
                                    </div>
                                </td>
                                <td>{trip.destination}</td>
                                <td>{Number(trip.cargo_weight).toLocaleString()} kg</td>
                                <td>
                                    <span className={`badge badge-${trip.status === 'done' ? 'success' : trip.status === 'sent' ? 'primary' : trip.status === 'canceled' ? 'danger' : 'neutral'}`}
                                        style={trip.status === 'sent' ? { background: 'rgba(37,99,235,0.1)', color: 'var(--primary-color)' } : {}}>
                                        {trip.status}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: 32 }}>No recent trips found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
