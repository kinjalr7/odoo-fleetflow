import React, { useState, useEffect } from 'react';
import { User, Lock, Shield, Bell, LogOut, Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8001';

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function Section({ icon: Icon, title, children }) {
    return (
        <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            marginBottom: 24,
            overflow: 'hidden',
        }}>
            <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--bg-color)',
            }}>
                <Icon size={18} color="var(--primary-color)" />
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h3>
            </div>
            <div style={{ padding: 24 }}>
                {children}
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 6,
            }}>{label}</label>
            {children}
        </div>
    );
}

function Input({ style, ...props }) {
    return (
        <input
            style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                fontSize: 14,
                background: 'var(--bg-color)',
                color: 'var(--text-primary)',
                outline: 'none',
                ...style,
            }}
            {...props}
        />
    );
}

export default function Settings({ onLogout }) {
    const navigate = useNavigate();

    // Profile state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');

    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    // Feedback
    const [profileMsg, setProfileMsg] = useState(null);
    const [passwordMsg, setPasswordMsg] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Load from localStorage first (instant display)
        setName(localStorage.getItem('userName') || '');
        setEmail(localStorage.getItem('userEmail') || '');
        setRole(localStorage.getItem('role') || '');

        // Then sync from backend
        axios.get(`${API}/auth/me`, { headers: getAuthHeaders() })
            .then(res => {
                setName(res.data.name);
                setEmail(res.data.email);
                setRole(res.data.role);
                // Keep localStorage in sync
                localStorage.setItem('userName', res.data.name);
                localStorage.setItem('userEmail', res.data.email);
                localStorage.setItem('role', res.data.role);
            })
            .catch(() => setProfileMsg({ type: 'error', text: 'Could not load profile from server.' }));
    }, []);

    const showFeedback = (setter, type, text) => {
        setter({ type, text });
        setTimeout(() => setter(null), 4000);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!name.trim()) return showFeedback(setProfileMsg, 'error', 'Name cannot be empty.');
        setSaving(true);
        try {
            const res = await axios.patch(`${API}/auth/me`, { name }, { headers: getAuthHeaders() });
            localStorage.setItem('userName', res.data.name);
            showFeedback(setProfileMsg, 'success', 'Profile updated successfully!');
        } catch (err) {
            showFeedback(setProfileMsg, 'error', err.response?.data?.detail || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return showFeedback(setPasswordMsg, 'error', 'New passwords do not match.');
        }
        if (newPassword.length < 6) {
            return showFeedback(setPasswordMsg, 'error', 'Password must be at least 6 characters.');
        }
        setSaving(true);
        try {
            await axios.patch(`${API}/auth/me/password`, {
                current_password: currentPassword,
                new_password: newPassword,
            }, { headers: getAuthHeaders() });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            showFeedback(setPasswordMsg, 'success', 'Password changed successfully!');
        } catch (err) {
            showFeedback(setPasswordMsg, 'error', err.response?.data?.detail || 'Failed to change password.');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        if (onLogout) onLogout();
        navigate('/login');
    };

    const getRoleBadgeColor = () => {
        const colors = {
            'Fleet Manager': '#2563eb',
            'Dispatcher': '#7c3aed',
            'Safety Officer': '#d97706',
            'Financial Analyst': '#059669',
        };
        return colors[role] || '#64748b';
    };

    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const Feedback = ({ msg }) => msg ? (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
            color: msg.type === 'success' ? '#065f46' : 'var(--danger)',
            fontSize: 13,
        }}>
            {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {msg.text}
        </div>
    ) : null;

    return (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {/* Page header */}
            <div className="page-header">
                <div className="page-title">
                    <h1>Settings & Profile</h1>
                    <p>Manage your account details and security preferences.</p>
                </div>
            </div>

            {/* Profile summary card */}
            <div style={{
                background: 'linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%)',
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                color: 'white',
            }}>
                <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    fontWeight: 700,
                    border: '3px solid rgba(255,255,255,0.4)',
                    flexShrink: 0,
                }}>
                    {initials || '?'}
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{name}</h2>
                    <p style={{ opacity: 0.85, marginBottom: 10 }}>{email}</p>
                    <span style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        padding: '3px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '0.3px',
                    }}>
                        🛡 {role}
                    </span>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 600,
                        fontSize: 13,
                    }}
                >
                    <LogOut size={15} /> Sign Out
                </button>
            </div>

            {/* Profile Section */}
            <Section icon={User} title="Profile Information">
                <Feedback msg={profileMsg} />
                <form onSubmit={handleSaveProfile}>
                    <Field label="Display Name">
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Your full name"
                        />
                    </Field>
                    <Field label="Email Address">
                        <Input
                            value={email}
                            disabled
                            style={{ background: '#f1f5f9', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                        />
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                            Email cannot be changed. Contact your Fleet Manager to update it.
                        </p>
                    </Field>
                    <Field label="Role">
                        <div style={{
                            padding: '10px 12px',
                            background: '#f1f5f9',
                            border: '1px solid var(--border-color)',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}>
                            <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: getRoleBadgeColor(), flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: getRoleBadgeColor() }}>{role}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>Assigned by admin</span>
                        </div>
                    </Field>
                    <button type="submit" className="btn btn-primary" disabled={saving} style={{ gap: 8 }}>
                        <Save size={15} /> {saving ? 'Saving…' : 'Save Profile'}
                    </button>
                </form>
            </Section>

            {/* Password Section */}
            <Section icon={Lock} title="Change Password">
                <Feedback msg={passwordMsg} />
                <form onSubmit={handleChangePassword}>
                    <Field label="Current Password">
                        <div style={{ position: 'relative' }}>
                            <Input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                style={{ paddingRight: 40 }}
                                required
                            />
                            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </Field>
                    <Field label="New Password">
                        <div style={{ position: 'relative' }}>
                            <Input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Minimum 6 characters"
                                style={{ paddingRight: 40 }}
                                required
                            />
                            <button type="button" onClick={() => setShowNew(!showNew)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </Field>
                    <Field label="Confirm New Password">
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            required
                            style={{
                                borderColor: confirmPassword && newPassword !== confirmPassword ? 'var(--danger)' : undefined,
                            }}
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>Passwords do not match</p>
                        )}
                    </Field>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        <Lock size={15} /> {saving ? 'Updating…' : 'Change Password'}
                    </button>
                </form>
            </Section>

            {/* Access Level Info */}
            <Section icon={Shield} title="Access & Permissions">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                        { label: 'Dashboard', allowed: true },
                        { label: 'Vehicle Management', allowed: ['Fleet Manager'].includes(role) },
                        { label: 'Driver Management', allowed: ['Fleet Manager', 'Safety Officer', 'Dispatcher'].includes(role) },
                        { label: 'Trip Planning', allowed: ['Fleet Manager', 'Dispatcher'].includes(role) },
                        { label: 'Maintenance Logs', allowed: ['Fleet Manager', 'Safety Officer'].includes(role) },
                        { label: 'Reports & Exports', allowed: ['Fleet Manager', 'Financial Analyst'].includes(role) },
                        { label: 'User Management', allowed: role === 'Fleet Manager' },
                        { label: 'Fuel Logs', allowed: ['Fleet Manager', 'Financial Analyst'].includes(role) },
                    ].map(({ label, allowed }) => (
                        <div key={label} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 14px',
                            background: allowed ? 'rgba(16,185,129,0.06)' : 'rgba(100,116,139,0.06)',
                            border: `1px solid ${allowed ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`,
                            borderRadius: 8,
                            fontSize: 13,
                        }}>
                            <span style={{ fontSize: 15 }}>{allowed ? '✅' : '🔒'}</span>
                            <span style={{ color: allowed ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Danger Zone */}
            <div style={{
                background: 'rgba(239,68,68,0.04)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
            }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--danger)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LogOut size={16} /> Sign Out
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    You will be returned to the login screen. Your session token will be cleared.
                </p>
                <button onClick={handleLogout} className="btn" style={{
                    background: 'var(--danger)', color: 'white', gap: 8,
                }}>
                    <LogOut size={15} /> Sign Out of FleetFlow
                </button>
            </div>
        </div>
    );
}
