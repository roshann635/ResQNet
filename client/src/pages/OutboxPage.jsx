import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import { Mail, MessageSquare, RefreshCw, Send, CheckCircle2, Clock } from 'lucide-react';

export default function OutboxPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('ALL');

  const loadOutbox = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications('limit=50');
      setItems(res.items || []);
    } catch (err) {
      console.error('Error loading outbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutbox();

    // SSE connection for live notifications
    const sse = new EventSource(`/api/events?token=${localStorage.getItem('resqnet_token') || ''}`);
    sse.onmessage = () => {
      loadOutbox();
    };
    return () => sse.close();
  }, []);

  const filteredItems = items.filter((item) => {
    if (channelFilter === 'ALL') return true;
    return item.channel === channelFilter;
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-700 shadow-xl text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Send className="w-4 h-4" />
            Simulated Notification Gateway
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            System Outbox & Communications Feed
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Simulates external SMS & Email adapters reading and writing to <span className="font-mono text-indigo-300">notifications</span> collection.
          </p>
        </div>

        <button
          onClick={loadOutbox}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-600 transition flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          {['ALL', 'SMS', 'EMAIL'].map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                channelFilter === ch
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900'
              }`}
            >
              {ch} ({ch === 'ALL' ? items.length : items.filter((i) => i.channel === ch).length})
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Role Scope: <span className="font-bold uppercase text-slate-800">{user?.role}</span>
        </span>
      </div>

      {/* Outbox Items List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading outbox communications...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
            No notification records matching filter.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.notificationId}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-indigo-200 transition"
            >
              <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                item.channel === 'SMS' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {item.channel === 'SMS' ? <MessageSquare className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{item.notificationId}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded font-bold">
                      {item.channel}
                    </span>
                    <span className="text-slate-500">Destination: <span className="font-medium text-slate-800">{item.destination}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> {item.status || 'Delivered'}
                    </span>
                  </div>
                </div>

                {item.subject && (
                  <div className="text-xs font-bold text-slate-900">{item.subject}</div>
                )}

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  {item.message}
                </p>

                {item.incidentId && (
                  <div className="text-[11px] text-slate-500">
                    Linked Incident: <span className="font-mono font-semibold text-indigo-700">{item.incidentId}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
