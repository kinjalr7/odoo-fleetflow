import React, { useState, useEffect } from 'react';
import { Download, Plus, MoreVertical } from 'lucide-react';
import api from '../api';

export default function VehicleList() {
    const [vehicles, setVehicles] = useState([]);

    const fetchVehicles = async () => {
        try {
            const res = await api.get('/api/vehicles');
            setVehicles(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchVehicles();

        let ws;
        try {
            ws = new WebSocket('ws://localhost:8001/ws');
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.event === 'dashboardUpdate') fetchVehicles();
                    else if (msg.event === 'vehicleCreated') setVehicles(prev => [...prev, msg.data]);
                    else if (msg.event === 'vehicleStatusUpdated')
                        setVehicles(prev => prev.map(v => v.id === msg.data.id ? { ...v, ...msg.data } : v));
                } catch { }
            };
        } catch { }
        return () => ws?.close();
    }, []);

    const getStatusBadge = (status) => {
        if (status === 'available') return <span className="badge badge-success">● Available</span>;
        if (status === 'on_trip') return <span className="badge" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--primary-color)' }}>● On Trip</span>;
        if (status === 'in_shop') return <span className="badge badge-warning">● In Shop</span>;
        if (status === 'retired') return <span className="badge badge-neutral">● Retired</span>;
        return <span className="badge badge-neutral">● {status}</span>;
    };

    return (
        <div className="vehicle-page">
            <div className="page-header">
                <div className="page-title">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        Fleet Inventory
                        <span className="badge badge-neutral" style={{ fontSize: 14 }}>{vehicles.length} Total</span>
                    </h1>
                    <p>Manage, monitor, and update your global logistics assets in real-time.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary"><Download size={16} /> Export CSV</button>
                    <button className="btn btn-primary"><Plus size={16} /> Add Vehicle</button>
                </div>
            </div>

            <div className="table-container">
                <div className="table-header-filters" style={{ gap: 20 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>FILTERS:</span>
                    <select className="btn btn-secondary" style={{ padding: '6px 12px' }}>
                        <option>All Statuses</option>
                        <option>Available</option>
                        <option>On Trip</option>
                        <option>In Shop</option>
                    </select>
                    <select className="btn btn-secondary" style={{ padding: '6px 12px' }}><option>All Types</option></select>
                    <button className="btn" style={{ marginLeft: 'auto', background: 'transparent', color: 'var(--text-secondary)' }}>Clear all</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Plate Number</th>
                            <th>Type</th>
                            <th>Max Capacity</th>
                            <th>Mileage</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles.map(v => (
                            <tr key={v.id}>
                                <td>
                                    <div className="td-id">{v.plate_number}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        Added {new Date(v.created_at).toLocaleDateString()}
                                    </div>
                                </td>
                                <td>{v.vehicle_type}</td>
                                <td>{Number(v.max_weight).toLocaleString()} kg</td>
                                <td>{Number(v.mileage).toLocaleString()} km</td>
                                <td>{getStatusBadge(v.status)}</td>
                                <td><MoreVertical size={16} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} /></td>
                            </tr>
                        ))}
                        {vehicles.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: 32 }}>No vehicles found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
