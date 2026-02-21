import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TripPlanner() {
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);

    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [loadWeight, setLoadWeight] = useState(18500);

    useEffect(() => {
        axios.get('http://localhost:8001/api/vehicles').then(res => setVehicles(res.data.filter(v => v.status === 'Available')));
        axios.get('http://localhost:8001/api/drivers').then(res => setDrivers(res.data.filter(d => d.status === 'ON DUTY')));
    }, []);

    const handleDispatch = () => {
        if (!selectedVehicle || !selectedDriver) return;

        axios.post('http://localhost:8001/api/trips', {
            vehicle_id: selectedVehicle,
            driver_id: selectedDriver,
            destination: "Chicago, IL -> Houston, TX",
            load_weight: loadWeight,
            status: "Sent",
            eta: "14:45 PM"
        }).then(res => {
            alert("Trip Dispatched Successfully!");
            window.location.reload();
        }).catch(err => {
            alert("Error: " + err.response.data.detail);
        });
    };

    const vData = vehicles.find(v => v.id === selectedVehicle);
    const overCapacity = vData && loadWeight > vData.capacity;

    return (
        <div className="trip-page">
            <div className="page-header">
                <div className="page-title">
                    <h1>Trip Planner</h1>
                    <p>Schedule trips and dispatch vehicles</p>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: 1 }} className="table-container">
                    <div style={{ padding: 24, borderBottom: '1px solid var(--border-color)' }}>
                        <h3>Pending Shipments</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>1 items awaiting dispatch</p>
                    </div>
                    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ border: '2px solid var(--primary-color)', borderRadius: 8, padding: 16, backgroundColor: 'rgba(37,99,235,0.05)', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span className="badge badge-primary" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>PRIORITY</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>#SH-8821</span>
                            </div>
                            <h4 style={{ marginBottom: 8 }}>Industrial Lathes (4 units)</h4>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Chicago, IL → Houston, TX</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                <span style={{ fontWeight: 600 }}>18,500 kg</span>
                                <span style={{ color: 'var(--text-secondary)' }}>Due: Oct 24</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ flex: 2 }}>
                    <div className="table-container" style={{ padding: 24 }}>
                        <h3 style={{ marginBottom: 16 }}>New Trip Assignment</h3>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>SELECT FREE TRUCK</label>
                            <select className="btn btn-secondary" style={{ width: '100%', padding: '12px' }} value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
                                <option value="">-- Choose a Vehicle --</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.id} ({v.type}) - Max {v.capacity}kg</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>AVAILABLE DRIVER</label>
                            <select className="btn btn-secondary" style={{ width: '100%', padding: '12px' }} value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                                <option value="">-- Choose a Driver --</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.role})</option>)}
                            </select>
                        </div>

                        {selectedVehicle && (
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>CAPACITY UTILIZATION</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: overCapacity ? 'var(--danger)' : 'var(--primary-color)' }}>
                                        {Math.round((loadWeight / vData.capacity) * 100)}% {overCapacity ? '(OVERLOADED)' : ''}
                                    </span>
                                </div>
                                <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 4 }}>
                                    <div style={{ height: '100%', width: Math.min((loadWeight / vData.capacity) * 100, 100) + '%', background: overCapacity ? 'var(--danger)' : 'var(--primary-color)', borderRadius: 4 }}></div>
                                </div>
                            </div>
                        )}

                        {overCapacity && (
                            <div style={{ border: '1px solid var(--danger)', padding: 16, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.05)', color: 'var(--danger)' }}>
                                Critical: Shipment weight ({loadWeight.toLocaleString()}kg) exceeds vehicle capacity ({vData.capacity.toLocaleString()}kg). Please split the load or select a larger truck.
                            </div>
                        )}

                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button className="btn btn-secondary">Save Draft</button>
                            <button className="btn btn-primary" style={{ backgroundColor: overCapacity || !selectedVehicle || !selectedDriver ? '#9ca3af' : 'var(--primary-color)' }} disabled={overCapacity || !selectedVehicle || !selectedDriver} onClick={handleDispatch}>
                                SEND TO DISPATCH
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
