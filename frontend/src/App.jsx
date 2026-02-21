import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import VehicleList from './pages/VehicleList';
import Login from './pages/Login';
import TripPlanner from './pages/TripPlanner';
import Maintenance from './pages/Maintenance';
import Drivers from './pages/Drivers';
import Settings from './pages/Settings';

const AppLayout = ({ children, onLogout }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Topbar onLogout={onLogout} />
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
  };

  const Protected = ({ children }) =>
    isAuthenticated
      ? <AppLayout onLogout={handleLogout}>{children}</AppLayout>
      : <Navigate to="/login" replace />;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/vehicles" element={<Protected><VehicleList /></Protected>} />
        <Route path="/trips" element={<Protected><TripPlanner /></Protected>} />
        <Route path="/maintenance" element={<Protected><Maintenance /></Protected>} />
        <Route path="/drivers" element={<Protected><Drivers /></Protected>} />
        <Route path="/settings" element={<Protected><Settings onLogout={handleLogout} /></Protected>} />
      </Routes>
    </Router>
  );
}

export default App;
