import React from 'react';
import { NavLink } from 'react-router-dom';
import { Truck, LayoutDashboard, Users, Wrench, Map, Settings, HelpCircle } from 'lucide-react';

export default function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo-icon"><Truck size={24} /></div>
                <div className="logo-text">
                    <h2>FleetFlow</h2>
                    <p>Executive Portal</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                <ul>
                    <li>
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <LayoutDashboard size={20} /> Dashboard
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/vehicles" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Truck size={20} /> Vehicles
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/drivers" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Users size={20} /> Drivers
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/trips" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Map size={20} /> Trip Planner
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/maintenance" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Wrench size={20} /> Maintenance
                        </NavLink>
                    </li>
                </ul>
            </nav>

            <div className="sidebar-footer">
                <ul>
                    <li>
                        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Settings size={20} /> Settings
                        </NavLink>
                    </li>
                    <li>
                        <a href="mailto:support@fleetflow.com" className="nav-item">
                            <HelpCircle size={20} /> Support
                        </a>
                    </li>
                </ul>
            </div>
        </aside>
    );
}
