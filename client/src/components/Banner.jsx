import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, Eye, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Banner() {
  const { user, isEvaluator } = useAuth();

  return (
    <header className="w-full bg-slate-900 border-b border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-400 font-medium tracking-wide">
          <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
          <span>
            <strong>ACADEMIC SIMULATION:</strong> Pure DSA Project-Based Learning Demo. Synthetic data only. Not for real emergency dispatch.
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!user ? (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition-colors"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              Sign in required for details
            </Link>
          ) : isEvaluator ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium">
              <Eye className="w-3 h-3" />
              Evaluator Mode (Read-Only)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium">
              <ShieldCheck className="w-3 h-3" />
              Dispatcher Active (Full Access)
            </span>
          )}

          <span className="text-slate-400 text-[11px] hidden sm:inline">
            Nashik Area (19.99°N, 73.78°E)
          </span>
        </div>
      </div>
    </header>
  );
}
