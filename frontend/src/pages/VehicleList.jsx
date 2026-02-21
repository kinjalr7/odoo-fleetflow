import React, { useState, useEffect } from 'react';
import { Download, Plus, MoreVertical } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

export default function VehicleList() {
    const [vehicles, setVehicles] = useState([]);

    const fetchVehicles = async () => {
        try {
            const res = await axios.get('http://localhost:8001/api/vehicles');
            setVehicles(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchVehicles();

        const socket = io('http://localhost:8001');
        socket.on('dashboardUpdate', () => {
            fetchVehicles();
        });
        socket.on('vehicleCreated', (v) => {
            setVehicles(prev => [...prev, v]);
        });
        socket.on('vehicleStatusUpdated', (updated) => {
            setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v));
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const getStatusBadge = (status) => {
        if (status === 'Available') return <span className="badge badge-success">● {status}</span>;
        if (status === 'In Transit') return <span className="badge badge-primary" style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--primary-color)' }}>● {status}</span>;
        if (status === 'In Shop') return <span className="badge badge-warning">● {status}</span>;
        return <span className="badge badge-neutral">● {status}</span>;
    };

    return (
        <div className="vehicle-page">
            <div className="page-header">
                <div className="page-title">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>Fleet Inventory <span className="badge badge-neutral" style={{ fontSize: 14 }}>{vehicles.length} Active</span></h1>
                    <p>Manage, monitor, and update your global logistics assets in real-time.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary"><Download size={16} /> Export CSV</button>
                    <button className="btn btn-primary"><Plus size={16} /> Add New Vehicle</button>
                </div>
            </div>

            <div className="table-container">
                <div className="table-header-filters" style={{ gap: 20 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>FILTERS:</span>
                    <select className="btn btn-secondary" style={{ padding: '6px 12px' }}><option>All Statuses</option></select>
                    <select className="btn btn-secondary" style={{ padding: '6px 12px' }}><option>Vehicle Type</option></select>
                    <select className="btn btn-secondary" style={{ padding: '6px 12px' }}><option>Service Area</option></select>
                    <button className="btn" style={{ marginLeft: 'auto', background: 'transparent', color: 'var(--text-secondary)' }}>Clear all</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Vehicle ID</th>
                            <th>Type</th>
                            <th>License Plate</th>
                            <th>Max Capacity</th>
                            <th>Mileage</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles.map(v => (
                            <tr key={v.id}>
                                <td>
                                    <div className="td-id">{v.id}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Added {new Date(v.createdAt).toLocaleDateString()}</div>
                                </td>
                                <td>{v.type}</td>
                                <td><span className="badge badge-neutral">{v.plate}</span></td>
                                <td>{Number(v.maxWeight).toLocaleString()} kg</td>
                                <td>{Number(v.mileage).toLocaleString()} km</td>
                                <td>{getStatusBadge(v.status)}</td>
                                <td><MoreVertical size={16} style={{ color: 'var(--text-secondary)' }} /></td>
                            </tr>
                        ))}
                        {vehicles.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>No vehicles found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
