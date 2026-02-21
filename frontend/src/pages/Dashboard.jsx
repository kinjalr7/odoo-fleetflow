import React, { useState, useEffect } from 'react';
import { Truck, AlertTriangle, Clock, Package, Filter, Plus } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

export default function Dashboard() {
    const [stats, setStats] = useState({
        active_vehicles: 0,
        maintenance_alerts: 0,
        idle_vehicles: 0,
        pending_shipments: 0
    });
    const [trips, setTrips] = useState([]);

    const fetchData = async () => {
        try {
            const statsRes = await axios.get('http://localhost:8001/api/stats');
            setStats(statsRes.data);
            const tripsRes = await axios.get('http://localhost:8001/api/trips');
            setTrips(tripsRes.data);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    useEffect(() => {
        fetchData(); // initial fetch

        const socket = io('http://localhost:8001');
        socket.on('dashboardUpdate', () => {
            fetchData();
        });

        return () => {
            socket.disconnect();
        };
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

            <div className="table-container" style={{ padding: 24, marginBottom: 24, height: 400, background: '#e2f0fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#64748b', fontSize: 18 }}>Live Vehicle Locations Map (Placeholder)</p>
            </div>

            <div className="table-container">
                <div className="table-header-filters">
                    <h3 style={{ flex: 1 }}>Recent Trip Activity</h3>
                    <a href="#" style={{ color: 'var(--primary-color)', fontSize: 14, fontWeight: 600 }}>View All Activity</a>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Vehicle ID</th>
                            <th>Driver</th>
                            <th>Destination</th>
                            <th>ETA</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trips.length > 0 ? trips.map(trip => (
                            <tr key={trip.id}>
                                <td className="td-id">{trip.vehicle.id}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className="avatar" style={{ width: 24, height: 24, fontSize: 10, background: '#bfdbfe', color: '#1d4ed8' }}>
                                            {trip.driver.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        {trip.driver.name}
                                    </div>
                                </td>
                                <td>{trip.destination}</td>
                                <td>{trip.eta}</td>
                                <td><span className="badge badge-success">{trip.status}</span></td>
                            </tr>
                        )) : <tr><td colSpan="5" style={{ textAlign: 'center', color: '#64748b' }}>No recent trips found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
