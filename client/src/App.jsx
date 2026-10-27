import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Banner from './components/Banner.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import LandingPage from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MapPage from './pages/MapPage.jsx';
import IncidentsPage from './pages/IncidentsPage.jsx';
import FleetPage from './pages/FleetPage.jsx';
import HospitalsPage from './pages/HospitalsPage.jsx';
import AlgorithmLabPage from './pages/AlgorithmLabPage.jsx';
import AnalyticsAuditPage from './pages/AnalyticsAuditPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
          {/* Persistent Simulation Disclaimer */}
          <Banner />

          {/* Navigation Bar */}
          <Navbar />

          {/* Primary Page Content */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Operational & Algorithm Routes (Login Required) */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <MapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents"
                element={
                  <ProtectedRoute>
                    <IncidentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fleet"
                element={
                  <ProtectedRoute>
                    <FleetPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospitals"
                element={
                  <ProtectedRoute>
                    <HospitalsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/algorithms"
                element={
                  <ProtectedRoute>
                    <AlgorithmLabPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsAuditPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect to public landing page */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
