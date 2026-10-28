import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, requiredRole, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-xs font-mono text-slate-500">Verifying session credentials...</span>
      </div>
    );
  }

  // Not authenticated: Redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Role check if specific roles are required
  const roles = allowedRoles || (requiredRole ? [requiredRole] : null);
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-red-200 rounded-2xl text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto border border-red-200">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">403 — Access Forbidden</h2>
        <p className="text-xs text-slate-600 leading-relaxed font-mono">
          Your current account role (<span className="text-emerald-700 uppercase font-semibold">{user.role}</span>) does not possess authorization for this resource.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl border border-emerald-700 transition-colors shadow-sm"
        >
          Return to Previous View
        </button>
      </div>
    );
  }

  return children;
}
