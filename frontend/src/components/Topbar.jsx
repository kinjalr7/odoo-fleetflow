import React from 'react';
import { Search, Bell } from 'lucide-react';

export default function Topbar() {
    return (
        <header className="topbar">
            <div className="search-bar">
                <Search className="search-icon" size={18} />
                <input type="text" placeholder="Search vehicles, drivers, or alerts..." />
            </div>

            <div className="user-profile">
                <Bell className="notification-bell" size={20} />
                <div className="user-info">
                    <div className="details" style={{ textAlign: 'right' }}>
                        <h4>Marcus Reed</h4>
                        <p>Fleet Director</p>
                    </div>
                    <div className="avatar">MR</div>
                </div>
            </div>
        </header>
    );
}
