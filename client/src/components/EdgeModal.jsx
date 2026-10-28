import React, { useState } from 'react';
import { X, Check, AlertTriangle, ShieldAlert, RotateCcw, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function EdgeModal({ edge, onClose, onUpdate }) {
  const { isAdmin, isEvaluator } = useAuth();
  const [condition, setCondition] = useState(edge?.condition || 'NORMAL');
  const [multiplier, setMultiplier] = useState(edge?.multiplier || 1.8);
  const [loading, setLoading] = useState(false);

  if (!edge) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Read-only auditor account cannot modify road network conditions.');
      return;
    }
    setLoading(true);
    try {
      await onUpdate(edge.edgeId, condition, multiplier);
      onClose();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-emerald-200 rounded-xl max-w-md w-full p-4 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-950">Road Segment Details</h3>
            <p className="text-xs text-slate-500 font-mono">Edge ID: {edge.edgeId}</p>
          </div>
        </div>

        {/* Read-only notice for evaluators */}
        {isEvaluator && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
            <span>Auditor Profile: Road conditions can be inspected, but alterations require Dispatcher authorization.</span>
          </div>
        )}

        <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 text-xs mb-5 space-y-1 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500">Endpoints:</span>
            <span className="font-semibold text-slate-800">{edge.fromNodeId} → {edge.toNodeId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Base Travel Distance:</span>
            <span className="font-semibold text-slate-800">{edge.baseCost} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Effective Cost:</span>
            <span className="font-semibold text-emerald-700">{edge.effectiveCost ? edge.effectiveCost.toFixed(2) : edge.baseCost} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Condition:</span>
            <span className={`font-semibold uppercase ${
              edge.condition === 'BLOCKED' ? 'text-red-500' : edge.condition === 'CONGESTED' ? 'text-amber-500' : 'text-emerald-600'
            }`}>
              {edge.condition}
            </span>
          </div>
        </div>

        {/* Mutative Form only enabled for Dispatcher / Admin */}
        {isAdmin ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-950 mb-2">
                Update Road Incident / Traffic Condition:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition('NORMAL')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    condition === 'NORMAL'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-400 shadow-sm'
                      : 'bg-white border-emerald-200 text-slate-600 hover:bg-emerald-50'
                  }`}
                >
                  NORMAL (1.0×)
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('CONGESTED')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    condition === 'CONGESTED'
                      ? 'bg-amber-100 text-amber-800 border-amber-400 shadow-sm'
                      : 'bg-white border-emerald-200 text-slate-600 hover:bg-emerald-50'
                  }`}
                >
                  CONGESTED
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('BLOCKED')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    condition === 'BLOCKED'
                      ? 'bg-red-100 text-red-800 border-red-400 shadow-sm'
                      : 'bg-white border-emerald-200 text-slate-600 hover:bg-emerald-50'
                  }`}
                >
                  BLOCKED (∞)
                </button>
              </div>
            </div>

            {condition === 'CONGESTED' && (
              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                <label className="block text-xs font-medium text-emerald-950 mb-1">
                  Congestion Delay Multiplier ({multiplier}×)
                </label>
                <input
                  type="range"
                  min="1.2"
                  max="3.5"
                  step="0.1"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>1.2× (Light)</span>
                  <span>1.8× (Default)</span>
                  <span>3.5× (Severe Gridlock)</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? 'Applying...' : 'Apply Road State'}
              </button>
            </div>
          </form>
        ) : (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
