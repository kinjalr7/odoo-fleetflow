import React, { useState, useEffect } from 'react';
import api from '../api';

export default function TripPlanner() {
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [trips, setTrips] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [destination, setDestination] = useState('');
    const [loadWeight, setLoadWeight] = useState(5000);
    const [message, setMessage] = useState(null);

    const loadData = () => {
        api.get('/api/vehicles').then(res => setVehicles(res.data.filter(v => v.status === 'available')));
        api.get('/api/drivers').then(res => setDrivers(res.data.filter(d => d.duty_status === 'on')));
        api.get('/api/trips').then(res => setTrips(res.data));
    };

    useEffect(() => {
        loadData();
        let ws;
        try {
            ws = new WebSocket('ws://localhost:8001/ws');
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.event === 'dashboardUpdate' || msg.event === 'tripStatusUpdated') loadData();
                } catch { }
            };
        } catch { }
        return () => ws?.close();
    }, []);

    const handleDispatch = async () => {
        if (!selectedVehicle || !selectedDriver || !destination.trim()) {
            setMessage({ type: 'error', text: 'Please fill in all fields.' });
            return;
        }
        try {
            await api.post('/api/trips', {
                vehicle_id: selectedVehicle,
                driver_id: selectedDriver,
                destination,
                cargo_weight: loadWeight,
            });
            setMessage({ type: 'success', text: 'Trip created successfully!' });
            setSelectedVehicle(''); setSelectedDriver(''); setDestination(''); setLoadWeight(5000);
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Error dispatching trip' });
        }
    };

    const handleStatusChange = async (tripId, status) => {
        try {
            await api.patch(`/api/trips/${tripId}/status`, { status });
            setMessage({ type: 'success', text: `Trip marked as ${status}` });
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Error updating trip' });
        }
    };

    const vData = vehicles.find(v => v.id === selectedVehicle);
    const overCapacity = vData && loadWeight > vData.max_weight;

    return (
        <div className="trip-page">
            <div className="page-header">
                <div className="page-title">
                    <h1>Trip Planner</h1>
                    <p>Schedule trips and dispatch vehicles with real-time validation</p>
                </div>
            </div>

            {message && (
                <div style={{
                    padding: '10px 16px', marginBottom: 16, borderRadius: 8,
                    background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                    border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                    color: message.type === 'error' ? 'var(--danger)' : '#15803d',
                    fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    {message.text}
                    <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            <div style={{ display: 'flex', gap: 24 }}>
                {/* Trip list */}
                <div style={{ flex: 1 }} className="table-container">
                    <div style={{ padding: 24, borderBottom: '1px solid var(--border-color)' }}>
                        <h3>Active Trips</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{trips.length} total</p>
                    </div>
                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 480, overflowY: 'auto' }}>
                        {trips.slice(0, 8).map(trip => (
                            <div key={trip.id} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{trip.destination}</span>
                                    <span className={`badge badge-${trip.status === 'done' ? 'success' : trip.status === 'canceled' ? 'danger' : trip.status === 'sent' ? 'primary' : 'neutral'}`}
                                        style={trip.status === 'sent' ? { background: 'rgba(37,99,235,0.1)', color: 'var(--primary-color)' } : {}}>
                                        {trip.status}
                                    </span>
                                </div>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                                    {Number(trip.cargo_weight).toLocaleString()} kg — {trip.driver?.name || '—'}
                                </p>
                                {trip.status === 'draft' && (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => handleStatusChange(trip.id, 'sent')} className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}>Send</button>
                                        <button onClick={() => handleStatusChange(trip.id, 'canceled')} className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>Cancel</button>
                                    </div>
                                )}
                                {trip.status === 'sent' && (
                                    <button onClick={() => handleStatusChange(trip.id, 'done')} className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}>Mark Done</button>
                                )}
                            </div>
                        ))}
                        {trips.length === 0 && <p style={{ textAlign: 'center', color: '#64748b' }}>No trips yet.</p>}
                    </div>
                </div>

                {/* New trip form */}
                <div style={{ flex: 2 }}>
                    <div className="table-container" style={{ padding: 24 }}>
                        <h3 style={{ marginBottom: 16 }}>New Trip Assignment</h3>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>DESTINATION</label>
                            <input className="btn btn-secondary" style={{ width: '100%', padding: '12px' }}
                                placeholder="e.g. Chicago, IL → Houston, TX"
                                value={destination} onChange={e => setDestination(e.target.value)} />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>SELECT VEHICLE</label>
                            <select className="btn btn-secondary" style={{ width: '100%', padding: '12px' }} value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
                                <option value="">-- Choose an Available Vehicle --</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} ({v.vehicle_type}) — Max {Number(v.max_weight).toLocaleString()} kg</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>CARGO WEIGHT (kg)</label>
                            <input type="number" className="btn btn-secondary" style={{ width: '100%', padding: '12px' }}
                                value={loadWeight} onChange={e => setLoadWeight(Number(e.target.value))} min={1} />
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>SELECT DRIVER</label>
                            <select className="btn btn-secondary" style={{ width: '100%', padding: '12px' }} value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                                <option value="">-- Choose an On-Duty Driver --</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name} (Safety: {d.safety_score})</option>)}
                            </select>
                        </div>

                        {selectedVehicle && vData && (
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>CAPACITY UTILIZATION</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: overCapacity ? 'var(--danger)' : 'var(--primary-color)' }}>
                                        {Math.round((loadWeight / vData.max_weight) * 100)}% {overCapacity ? '— OVERLOADED' : ''}
                                    </span>
                                </div>
                                <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 4 }}>
                                    <div style={{
                                        height: '100%',
                                        width: Math.min((loadWeight / vData.max_weight) * 100, 100) + '%',
                                        background: overCapacity ? 'var(--danger)' : 'var(--primary-color)',
                                        borderRadius: 4, transition: 'width 0.3s'
                                    }} />
                                </div>
                            </div>
                        )}

                        {overCapacity && (
                            <div style={{ border: '1px solid var(--danger)', padding: 16, borderRadius: 8, background: 'rgba(239,68,68,0.05)', color: 'var(--danger)', marginBottom: 16, fontSize: 13 }}>
                                ⚠ Cargo ({loadWeight.toLocaleString()} kg) exceeds vehicle max ({vData.max_weight.toLocaleString()} kg). Select a larger vehicle or reduce the load.
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button className="btn btn-secondary" onClick={loadData}>↻ Refresh</button>
                            <button
                                className="btn btn-primary"
                                disabled={overCapacity || !selectedVehicle || !selectedDriver || !destination.trim()}
                                style={{ opacity: (overCapacity || !selectedVehicle || !selectedDriver || !destination.trim()) ? 0.5 : 1 }}
                                onClick={handleDispatch}
                            >
                                SEND TO DISPATCH
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
