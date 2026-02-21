import React, { useState, useEffect } from 'react';
import { Search, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ onLogout }) {
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        setUserName(localStorage.getItem('userName') || 'User');
        setUserRole(localStorage.getItem('role') || 'Fleet Member');
    }, []);

    const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        if (onLogout) onLogout();
        navigate('/login');
    };

    return (
        <header className="topbar">
            <div className="search-bar">
                <Search className="search-icon" size={18} />
                <input type="text" placeholder="Search vehicles, drivers, or alerts..." />
            </div>
            <div className="user-profile">
                <Bell className="notification-bell" size={20} />
                <div className="user-info" style={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>
                    <div className="details" style={{ textAlign: 'right' }}>
                        <h4>{userName}</h4>
                        <p>{userRole}</p>
                    </div>
                    <div className="avatar" title="Settings">{initials}</div>
                </div>
                <button onClick={handleLogout} title="Sign Out" style={{
                    background: 'none', border: '1px solid var(--border-color)',
                    borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
                    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                }}>
                    <LogOut size={16} />
                </button>
            </div>
        </header>
    );
}
