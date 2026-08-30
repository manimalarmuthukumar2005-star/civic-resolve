import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { DarkModeProvider } from './context/DarkModeContext';
import { OfflineProvider } from './context/OfflineContext';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import Login from './pages/Login';
import Register from './pages/Register';
import CitizenDashboard from './pages/CitizenDashboard';
import DepartmentDashboard from './pages/DepartmentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SubmitComplaint from './pages/SubmitComplaint';
import ComplaintDetail from './pages/ComplaintDetail';
import UserProfile from './pages/UserProfile';
import ForgotPassword from './pages/ForgotPassword';
import './App.css';

function normaliseRole(role) { return role === 'user' ? 'citizen' : role; }

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  const userRole = normaliseRole(user.role);
  if (role && userRole !== role) {
    const dest = userRole === 'admin' ? '/admin' : userRole === 'department' ? '/department' : '/dashboard';
    return <Navigate to={dest} replace />;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const r    = user ? normaliseRole(user.role) : null;
  const dest = r ? (r === 'admin' ? '/admin' : r === 'department' ? '/department' : '/dashboard') : '/login';
  return (
    <>
      <Navbar />
      <OfflineBanner />
      <Routes>
        <Route path="/login"           element={!user ? <Login /> : <Navigate to={dest} replace />} />
        <Route path="/register"        element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
        <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to={dest} replace />} />
        <Route path="/dashboard"       element={<Guard role="citizen"><CitizenDashboard /></Guard>} />
        <Route path="/department"      element={<Guard role="department"><DepartmentDashboard /></Guard>} />
        <Route path="/admin"           element={<Guard role="admin"><AdminDashboard /></Guard>} />
        <Route path="/submit"          element={<Guard role="citizen"><SubmitComplaint /></Guard>} />
        <Route path="/complaints/:id"  element={<Guard><ComplaintDetail /></Guard>} />
        <Route path="/profile"         element={<Guard><UserProfile /></Guard>} />
        <Route path="*"                element={<Navigate to={dest} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DarkModeProvider>
        <LanguageProvider>
          <OfflineProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </OfflineProvider>
        </LanguageProvider>
      </DarkModeProvider>
    </BrowserRouter>
  );
}
