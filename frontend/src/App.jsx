import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Flats from './pages/Flats';
import Residents from './pages/Residents';
import Maintenance from './pages/Maintenance';
import Complaints from './pages/Complaints';
import Visitors from './pages/Visitors';
import NoticeBoard from './pages/NoticeBoard';
import Staff from './pages/Staff';
import Feed from './pages/Feed';
import Marketplace from './pages/Marketplace';
import Bookings from './pages/Bookings';
import './App.css';

// Protected Route wrapper component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#080b11' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="page-body">
          {children}
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={!user ? <Login /> : <Navigate to="/" replace />} 
      />

      {/* Protected Routes - All Roles */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/notices" 
        element={
          <ProtectedRoute>
            <NoticeBoard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/feed" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'resident']}>
            <Feed />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/marketplace" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'resident']}>
            <Marketplace />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/bookings" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'resident', 'staff']}>
            <Bookings />
          </ProtectedRoute>
        } 
      />

      {/* Protected Routes - Admin Only */}
      <Route 
        path="/flats" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Flats />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/residents" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Residents />
          </ProtectedRoute>
        } 
      />

      {/* Protected Routes - Role Specific Views (Checked internally by page components) */}
      <Route 
        path="/maintenance" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'resident']}>
            <Maintenance />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/complaints" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'resident', 'staff']}>
            <Complaints />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/visitors" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'resident', 'staff']}>
            <Visitors />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/staff" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'resident']}>
            <Staff />
          </ProtectedRoute>
        } 
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
