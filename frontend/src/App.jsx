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

const AppLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // default to true for demo purposes

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />

        {/* Protected Routes */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={isAuthenticated ? <AppLayout><Dashboard /></AppLayout> : <Navigate to="/login" />} />
        <Route path="/vehicles" element={isAuthenticated ? <AppLayout><VehicleList /></AppLayout> : <Navigate to="/login" />} />
        <Route path="/trips" element={isAuthenticated ? <AppLayout><TripPlanner /></AppLayout> : <Navigate to="/login" />} />
        <Route path="/maintenance" element={isAuthenticated ? <AppLayout><Maintenance /></AppLayout> : <Navigate to="/login" />} />
        <Route path="/drivers" element={isAuthenticated ? <AppLayout><Drivers /></AppLayout> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
