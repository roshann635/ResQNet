import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, Eye, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Banner() {
  const { user, isEvaluator } = useAuth();

  return (
    <header className="w-full bg-emerald-50 border-b border-emerald-200 text-xs">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-900 font-medium tracking-wide">
          <AlertTriangle className="w-4 h-4 text-emerald-700 animate-pulse shrink-0" />
          <span>
            <strong>ACADEMIC SIMULATION:</strong> Pure DSA Project-Based Learning Demo. Synthetic data only. Not for real emergency dispatch.
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!user ? (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-medium transition-colors shadow-sm"
            >
              <Lock className="w-3 h-3 text-emerald-700" />
              Sign in required for details
            </Link>
          ) : isEvaluator ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-medium">
              <Eye className="w-3 h-3" />
              Evaluator Mode (Read-Only)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white border border-emerald-600 text-[11px] font-medium shadow-sm">
              <ShieldCheck className="w-3 h-3" />
              Dispatcher Active (Full Access)
            </span>
          )}

          <span className="text-emerald-700 text-[11px] hidden sm:inline">
            Nashik Area (19.99°N, 73.78°E)
          </span>
        </div>
      </div>
    </header>
  );
}
