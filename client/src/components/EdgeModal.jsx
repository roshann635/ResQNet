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
      alert('Read-only evaluator account cannot modify road network conditions.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Road Segment Details</h3>
            <p className="text-xs text-slate-400 font-mono">Edge ID: {edge.edgeId}</p>
          </div>
        </div>

        {/* Read-only notice for evaluators */}
        {isEvaluator && (
          <div className="mb-4 p-2.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
            <span>Read-Only Evaluator Mode: Road conditions can be inspected, but alterations require Dispatcher authorization.</span>
          </div>
        )}

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs mb-5 space-y-1 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">Endpoints:</span>
            <span className="font-semibold text-slate-200">{edge.fromNodeId} → {edge.toNodeId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Base Travel Distance:</span>
            <span className="font-semibold text-slate-200">{edge.baseCost} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Effective Cost:</span>
            <span className="font-semibold text-cyan-400">{edge.effectiveCost ? edge.effectiveCost.toFixed(2) : edge.baseCost} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Current Condition:</span>
            <span className={`font-semibold uppercase ${
              edge.condition === 'BLOCKED' ? 'text-red-400' : edge.condition === 'CONGESTED' ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {edge.condition}
            </span>
          </div>
        </div>

        {/* Mutative Form only enabled for Dispatcher / Admin */}
        {isAdmin ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Simulate Road Obstruction or Traffic State:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition('NORMAL')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    condition === 'NORMAL'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  NORMAL (1.0×)
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('CONGESTED')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    condition === 'CONGESTED'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  CONGESTED
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('BLOCKED')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    condition === 'BLOCKED'
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  BLOCKED (∞)
                </button>
              </div>
            </div>

            {condition === 'CONGESTED' && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <label className="block text-xs font-medium text-slate-300 mb-1">
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
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 transition-colors"
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
              className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
