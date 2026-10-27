import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs font-mono text-slate-400">Verifying session credentials...</span>
      </div>
    );
  }

  // Not authenticated: Redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Role check if specific role required
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-slate-900 border border-red-500/30 rounded-2xl text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center mx-auto border border-red-500/40">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400 leading-relaxed font-mono">
          Your current account role (<span className="text-cyan-400 uppercase font-semibold">{user.role}</span>) does not possess authorization for this administrative module.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
        >
          Return to Previous View
        </button>
      </div>
    );
  }

  return children;
}
