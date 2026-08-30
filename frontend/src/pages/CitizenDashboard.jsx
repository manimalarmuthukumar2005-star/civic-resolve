import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useOffline } from '../context/OfflineContext';
import { api } from '../utils/api';
import ComplaintCard from '../components/ComplaintCard';

const FILTER_KEYS = ['all', 'Pending', 'In Progress', 'Completed', 'Reopened'];

export default function CitizenDashboard() {
  const { token, user }  = useAuth();
  const { t }            = useLang();
  const { isOnline, queue, removeFromQueue } = useOffline();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filter, setFilter]         = useState('all');
  const [showMap, setShowMap]       = useState(false);
  const [istTime, setIstTime]       = useState('');
  const [istDate, setIstDate]       = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setIstTime(now.toLocaleTimeString('en-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true }));
      setIstDate(now.toLocaleDateString('en-IN', { timeZone:'Asia/Kolkata', weekday:'long', day:'2-digit', month:'long', year:'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api.get('/complaints', token)
      .then(d => { setComplaints(d.complaints || []); setError(''); })
      .catch(err => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Auto-sync offline queue when back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      queue.forEach(async (item) => {
        try {
          const fd = new FormData();
          Object.entries(item).forEach(([k, v]) => {
            if (!['id', 'savedAt', 'imagePreview'].includes(k) && v)
              fd.append(k, v);
          });
          await api.postForm('/complaints', fd, token);
          removeFromQueue(item.id);
        } catch (e) { console.error('Sync failed:', e); }
      });
      setTimeout(load, 2000);
    }
  }, [isOnline]);

  const counts  = complaints.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});
  const filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter);
  const geoComplaints = complaints.filter(c => c.latitude && c.longitude);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (error)   return (
    <div className="page fade-in">
      <div className="alert alert-error">⚠️ {error}</div>
      <button className="btn btn-primary" onClick={load}>Retry</button>
    </div>
  );

  return (
    <div className="page fade-in">
      {/* ── Top bar with live IST date & time ── */}
      <div className="dash-topbar">
        <div>
          <h1 className="dash-topbar-title">👋 Welcome, {user?.name}</h1>
          <p className="dash-topbar-sub">Citizen Dashboard — Government of Tamil Nadu · Civic Resolve</p>
        </div>
        <div className="dash-clock-box">
          <div className="dash-clock-time">{istTime}</div>
          <div className="dash-clock-date">{istDate}</div>
          <div className="dash-clock-ist">IST (UTC+5:30)</div>
        </div>
      </div>

      {/* Banner */}
      <div className="dash-banner">
        <div>
          <div className="dash-banner-label">{t('cd_banner_label')}</div>
          <div className="dash-banner-title">{t('cd_welcome')} {user?.name?.split(' ')[0]}</div>
          <div className="dash-banner-sub">{t('cd_banner_sub')}</div>
        </div>
        <Link to="/submit" className="btn"
          style={{ background:'#fff', color:'var(--teal)', fontWeight:800, border:'none', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,.15)' }}>
          + {t('cd_report_btn')}
        </Link>
      </div>

      {/* Offline queue */}
      {queue.length > 0 && (
        <div className="offline-queue-card">
          <div className="offline-queue-title">
            📴 {queue.length} Offline Complaint{queue.length > 1 ? 's' : ''} Pending Sync
          </div>
          {queue.map(item => (
            <div key={item.id} className="offline-queue-item">
              <span>📝 {item.title || 'Quick Report'}</span>
              <span className="offline-queue-time">{new Date(item.savedAt).toLocaleTimeString('en-IN')}</span>
            </div>
          ))}
          {isOnline && <div style={{ fontSize: '.75rem', color: 'var(--success)', marginTop: 6 }}>✅ Syncing now…</div>}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: t('cd_stat_total'),    value: complaints.length,         acc: 'var(--blue)',    icon: '📋' },
          { label: t('cd_stat_pending'),  value: counts['Pending'] || 0,    acc: 'var(--warning)', icon: '⏳' },
          { label: t('cd_stat_progress'), value: counts['In Progress'] || 0, acc: 'var(--blue)',   icon: '🔧' },
          { label: t('cd_stat_resolved'), value: counts['Completed'] || 0,  acc: 'var(--success)', icon: '✅' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--acc': s.acc }}>
            <div className="stat-label">{s.icon} {s.label}</div>
            <div className="stat-value" style={{ color: s.acc }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Nearby Map toggle */}
      {geoComplaints.length > 0 && (
        <button className="btn btn-secondary" style={{ marginBottom: 16 }}
          onClick={() => setShowMap(m => !m)}>
          🗺️ {showMap ? 'Hide Map' : `Nearby Complaints Map (${geoComplaints.length})`}
        </button>
      )}

      {/* Map */}
      {showMap && geoComplaints.length > 0 && (() => {
        const lat  = geoComplaints[0].latitude;
        const lng  = geoComplaints[0].longitude;
        const bbox = `${lng - .02},${lat - .02},${lng + .02},${lat + .02}`;
        return (
          <div className="card" style={{ marginBottom: 16, overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '12px 16px', background: 'var(--navy)', color: '#fff', fontWeight: 600, fontSize: '.85rem' }}>
              🗺️ Nearby Complaints — {geoComplaints.length} pinned
            </div>
            <iframe title="Complaints Map" width="100%" height="320" frameBorder="0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`}
              style={{ display: 'block' }} />
          </div>
        );
      })()}

      {/* Filter Tabs */}
      <div className="tabs">
        {FILTER_KEYS.map(f => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? t('cd_tab_all') : f}
            {f !== 'all' && counts[f] ? ` (${counts[f]})` : ''}
          </button>
        ))}
      </div>

      {/* Complaints */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">
            {filter === 'all' ? t('cd_empty_title') : `${t('cd_empty_none')} — ${filter}`}
          </div>
          <div className="empty-desc">{t('cd_empty_desc')}</div>
          {filter === 'all' && (
            <Link to="/submit" className="btn btn-primary" style={{ marginTop: 20 }}>
              {t('cd_empty_btn')}
            </Link>
          )}
        </div>
      ) : (
        <div className="complaints-grid">
          {filtered.map(c => <ComplaintCard key={c.id} complaint={c} />)}
        </div>
      )}
    </div>
  );
}
