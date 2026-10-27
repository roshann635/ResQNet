import React, { useState, useEffect } from 'react';
import { BarChart3, ShieldCheck, Filter, Search, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { api } from '../api/client.js';

export default function AnalyticsAuditPage() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [filterEvent, setFilterEvent] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [filterEvent, filterOutcome]);

  async function loadAnalytics() {
    try {
      const data = await api.getAnalyticsSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLogs() {
    try {
      const params = new URLSearchParams();
      if (filterEvent) params.append('event', filterEvent);
      if (filterOutcome) params.append('outcome', filterOutcome);
      const data = await api.getAuditLogs(params.toString());
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Operations Analytics & Immutable Audit Trail
          </h1>
          <p className="text-xs text-slate-400">
            Historical response logs, algorithm performance benchmarks, and security audit ledger.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing 14-day historical telemetry
        </div>
      </div>

      {/* Analytics Charts & Aggregations */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Severity Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              Incidents by Severity
            </h3>
            <div className="space-y-3 font-mono text-xs">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
                const count = summary.incidents?.bySeverity?.[sev] || 0;
                const total = summary.incidents?.total || 1;
                const pct = Math.round((count / total) * 100);
                const colors = {
                  CRITICAL: 'bg-red-500',
                  HIGH: 'bg-orange-500',
                  MEDIUM: 'bg-amber-500',
                  LOW: 'bg-emerald-500'
                };
                return (
                  <div key={sev}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300">{sev}:</span>
                      <span className="font-bold text-white">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full ${colors[sev]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Algorithm Runtimes */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              Algorithm Runtime Benchmark
            </h3>
            <div className="space-y-3 font-mono text-xs">
              {summary.algorithmMetrics?.map((m) => (
                <div key={m.algorithm}>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300 font-sans font-semibold">{m.algorithm}:</span>
                    <span className="text-emerald-400 font-bold">{m.avgRuntimeMs} ms</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Avg Nodes Expanded: {m.avgNodesExpanded}</span>
                    <span>Total Runs: {m.totalRuns}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fleet Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
              Fleet Operational Readiness
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Available Units:</span>
                  <span className="text-emerald-400 font-bold">{summary.fleet?.available}</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${(summary.fleet?.available / summary.fleet?.total) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Dispatched / Busy:</span>
                  <span className="text-amber-400 font-bold">{summary.fleet?.busy}</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${(summary.fleet?.busy / summary.fleet?.total) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Offline / Maintenance:</span>
                  <span className="text-purple-400 font-bold">{summary.fleet?.offline}</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${(summary.fleet?.offline / summary.fleet?.total) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Trail Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Immutable System Audit Logs ({logs.length})
            </h2>
            <p className="text-xs text-slate-400">
              Complete activity ledger with sensitive credential redaction enforced by database hooks.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">All Event Types</option>
              <option value="INCIDENT_CREATED">INCIDENT_CREATED</option>
              <option value="INCIDENT_STATUS_CHANGED">INCIDENT_STATUS_CHANGED</option>
              <option value="DISPATCH_CONFIRMED">DISPATCH_CONFIRMED</option>
              <option value="ROAD_CONDITION_UPDATED">ROAD_CONDITION_UPDATED</option>
              <option value="SCENARIO_SEEDED">SCENARIO_SEEDED</option>
              <option value="SCENARIO_RESET">SCENARIO_RESET</option>
            </select>

            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">All Outcomes</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILURE">FAILURE</option>
              <option value="WARNING">WARNING</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Log ID</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {logs.slice(0, 50).map((log) => (
                <tr key={log.logId} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-cyan-400 font-semibold">{log.logId}</td>
                  <td className="py-2.5 px-3 font-bold text-white">{log.eventType}</td>
                  <td className="py-2.5 px-3 text-slate-300">{log.actorId}</td>
                  <td className="py-2.5 px-3 text-slate-400">{log.entityId}</td>
                  <td className="py-2.5 px-3">
                    {log.outcome === 'SUCCESS' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        SUCCESS
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        {log.outcome}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
