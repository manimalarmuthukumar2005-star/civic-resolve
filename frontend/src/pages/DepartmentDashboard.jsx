import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { api } from '../utils/api';

const P_ORDER = { Emergency:0, High:1, Medium:2, Low:3 };
const STATUS_COLORS = { Pending:'#d97706','In Progress':'#1a56db',Completed:'#059669',Reopened:'#dc2626' };

export default function DepartmentDashboard() {
  const { token, user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [section, setSection]     = useState('complaints');
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [istTime, setIstTime]         = useState('');
  const [istDate, setIstDate]         = useState('');

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

  useEffect(() => {
    api.get('/complaints', token)
      .then(d => setComplaints([...(d.complaints||[])].sort((a,b) => (P_ORDER[a.priority]??9)-(P_ORDER[b.priority]??9))))
      .catch(console.error).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const counts = complaints.reduce((acc,c) => { acc[c.status]=(acc[c.status]||0)+1; return acc; }, {});
  const emergencies = complaints.filter(c => c.priority==='Emergency' && c.status!=='Completed').length;
  const allFeedbacks = complaints.flatMap(c => c.feedbacks||[]);
  const avgRating = allFeedbacks.length ? (allFeedbacks.reduce((s,f)=>s+f.rating,0)/allFeedbacks.length).toFixed(1) : null;

  let filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c =>
      (c.title||'').toLowerCase().includes(q) ||
      (c.description||'').toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  }

  const STATS = [
    { label:'Total',      value: complaints.length,        color:'var(--teal)',    icon:'📋' },
    { label:'Pending',    value: counts['Pending']||0,     color:'#d97706',        icon:'⏳' },
    { label:'In Progress',value: counts['In Progress']||0, color:'#1a56db',        icon:'🔧' },
    { label:'Resolved',   value: counts['Completed']||0,   color:'var(--success)', icon:'✅' },
    { label:'Reopened',   value: counts['Reopened']||0,    color:'var(--danger)',  icon:'🔁' },
    { label:'Avg Rating', value: avgRating ? `${avgRating}★` : '—', color:'var(--saffron)', icon:'⭐' },
  ];

  const NAV = [
    { key:'complaints', icon:'📋', label:'Complaints' },
    { key:'overview',   icon:'📊', label:'Overview' },
    { key:'feedback',   icon:'💬', label:'Feedback' },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen?'open':'collapsed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          {sidebarOpen && (
            <div>
              <div className="sidebar-name">{user?.name}</div>
              <div className="sidebar-role">{user?.department}</div>
            </div>
          )}
        </div>
        {sidebarOpen && <div className="sidebar-nav-label">Navigation</div>}
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button key={n.key} className={`sidebar-link ${section===n.key?'active':''}`}
              onClick={() => setSection(n.key)} title={n.label}>
              <span className="sidebar-icon">{n.icon}</span>
              {sidebarOpen && <span>{n.label}</span>}
            </button>
          ))}

        </nav>
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        <div className="dash-topbar">
          <div>
            <div>
              <h1 className="dash-topbar-title">📋 {user?.department} Dashboard</h1>
              <p className="dash-topbar-sub">Department Panel · Government of Tamil Nadu · Civic Resolve</p>
            </div>
          </div>
          <div className="dash-clock-box">
            <div className="dash-clock-time">{istTime}</div>
            <div className="dash-clock-date">{istDate}</div>
            <div className="dash-clock-ist">IST (UTC+5:30)</div>
          </div>
        </div>

        {emergencies > 0 && (
          <div className="alert alert-error" style={{ marginBottom:20 }}>
            🚨 <strong>{emergencies} Emergency complaint{emergencies>1?'s':''}</strong> require immediate attention!
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom:24 }}>
          {STATS.map(s => (
            <div key={s.label} className="stat-card" style={{'--acc':s.color}}>
              <div className="stat-label">{s.icon} {s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Complaints Table */}
        {(section === 'complaints' || section === 'overview') && (
          <div className="fade-in">
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
              <input className="form-input" placeholder="🔍 Search complaints…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ maxWidth:260, minHeight:38 }} />
              <div className="tabs" style={{ margin:0, border:'none', gap:6 }}>
                {['all','Pending','In Progress','Completed','Reopened'].map(f => (
                  <button key={f} className={`tab ${filter===f?'active':''}`} style={{ padding:'6px 12px', fontSize:'.78rem' }}
                    onClick={() => setFilter(f)}>
                    {f==='all'?`All (${complaints.length})`:`${f} (${counts[f]||0})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="complaints-table-wrap">
              <table className="complaints-table">
                <thead>
                  <tr>
                    <th>#ID</th>
                    <th>Complaint</th>
                    <th>Citizen</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Submitted (IST)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'var(--ink-4)' }}>No complaints found 🎉</td></tr>
                  ) : filtered.map(c => (
                    <tr key={c.id}>
                      <td><span className="table-id">#{c.id}</span></td>
                      <td>
                        <div style={{ fontWeight:600, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title||c.description?.slice(0,40)}</div>
                        <div style={{ fontSize:'.72rem', color:'var(--ink-4)', marginTop:2 }}>{c.category}</div>
                      </td>
                      <td style={{ fontSize:'.82rem' }}>{c.user_name||'—'}</td>
                      <td><span className={`priority-badge priority-${(c.priority||'medium').toLowerCase()}`}>{c.priority}</span></td>
                      <td><span className="status-dot" style={{ background: STATUS_COLORS[c.status]||'#999' }} /><span style={{ fontSize:'.8rem', marginLeft:5 }}>{c.status}</span></td>
                      <td style={{ fontSize:'.78rem', color:'var(--ink-4)', whiteSpace:'nowrap' }}>{c.created_at_ist||c.created_at?.slice(0,16)||'—'}</td>
                      <td><Link to={`/complaints/${c.id}`} className="btn btn-secondary btn-sm" style={{ fontSize:'.74rem', padding:'4px 10px', minHeight:'auto' }}>View & Respond</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feedback */}
        {section === 'feedback' && (
          <div className="fade-in">
            {complaints.filter(c => c.feedbacks?.length > 0).length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💬</div><div className="empty-title">No feedback yet</div></div>
            ) : (
              <div style={{ display:'grid', gap:14 }}>
                {complaints.filter(c => c.feedbacks?.length > 0).map(c => (
                  <div key={c.id} className="card">
                    <div style={{ fontWeight:700, color:'var(--teal)', marginBottom:10 }}>#{c.id} — {c.title}</div>
                    {c.feedbacks.map(f => (
                      <div key={f.id} style={{ background:'var(--ivory-2)', borderRadius:'var(--r)', padding:12, marginBottom:8, border:'1px solid var(--border)' }}>
                        <div>{'⭐'.repeat(f.rating)}{'☆'.repeat(5-f.rating)} <strong>{f.rating}/5</strong></div>
                        {f.comment && <p style={{ color:'var(--ink-3)', fontSize:'.85rem', marginTop:4, marginBottom:0 }}>{f.comment}</p>}
                        <div style={{ fontSize:'.72rem', color:'var(--ink-4)', marginTop:4 }}>{f.created_at}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
