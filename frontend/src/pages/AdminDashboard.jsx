import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { api } from '../utils/api';

const STATUS_COLORS = { Pending:'#d97706', 'In Progress':'#1a56db', Completed:'#059669', Reopened:'#dc2626' };
const CHART_COLORS  = ['#0D4F6C','#D4891A','#1a6b3c','#8b1d1d','#1a4d6b','#5b3a8c'];

function BarChart({ data, title }) {
  const max = Math.max(...Object.values(data||{}), 1);
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {Object.entries(data||{}).map(([label, val], i) => (
          <div key={label}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.78rem', color:'var(--ink-3)', marginBottom:4 }}>
              <span>{label}</span><strong style={{ color: CHART_COLORS[i%CHART_COLORS.length] }}>{val}</strong>
            </div>
            <div style={{ height:7, background:'var(--border)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(val/max)*100}%`, background: CHART_COLORS[i%CHART_COLORS.length], borderRadius:4, transition:'width .7s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { token, user, logout } = useAuth();
  const { t, toggleLang }       = useLang();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [section, setSection]     = useState('overview');
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
    Promise.all([
      api.get('/complaints/analytics/summary', token),
      api.get('/complaints', token),
    ]).then(([a, c]) => {
      setAnalytics(a);
      setComplaints(c.complaints || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const a = analytics || {};
  const counts = complaints.reduce((acc, c) => { acc[c.status]=(acc[c.status]||0)+1; return acc; }, {});

  let filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c =>
      (c.title||'').toLowerCase().includes(q) ||
      (c.description||'').toLowerCase().includes(q) ||
      (c.user_name||'').toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  }

  const STATS = [
    { label:'Total Complaints',  value: a.total_complaints||0,            color:'var(--teal)',    icon:'📋' },
    { label:'Pending',           value: a.by_status?.Pending||0,          color:'#d97706',        icon:'⏳' },
    { label:'In Progress',       value: a.by_status?.['In Progress']||0,  color:'#1a56db',        icon:'🔧' },
    { label:'Resolved',          value: a.by_status?.Completed||0,        color:'var(--success)', icon:'✅' },
    { label:'Reopened',          value: a.by_status?.Reopened||0,         color:'var(--danger)',  icon:'🔁' },
    { label:'Avg Rating',        value: a.average_rating ? `${a.average_rating}★` : '—', color:'var(--saffron)', icon:'⭐' },
  ];

  const NAV = [
    { key:'overview',   icon:'📊', label:'Overview' },
    { key:'complaints', icon:'📋', label:'All Complaints' },
    { key:'feedback',   icon:'💬', label:'Feedback' },
    { key:'users',      icon:'👥', label:'Users' },
  ];

  return (
    <div className="dashboard-layout">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen?'open':'collapsed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-avatar">A</div>
          {sidebarOpen && (
            <div>
              <div className="sidebar-name">{user?.name}</div>
              <div className="sidebar-role">Administrator</div>
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

      {/* ── Main ── */}
      <main className="dashboard-main">
        {/* Top bar */}
        <div className="dash-topbar">
          <div>
            <div>
              <h1 className="dash-topbar-title">
                {section === 'overview' && '📊 Dashboard Overview'}
                {section === 'complaints' && '📋 All Complaints'}
                {section === 'feedback' && '💬 Citizen Feedback'}
                {section === 'users' && '👥 User Management'}
              </h1>
              <p className="dash-topbar-sub">Admin Panel · Government of Tamil Nadu · Civic Resolve</p>
            </div>
          </div>
          <div className="dash-clock-box">
            <div className="dash-clock-time">{istTime}</div>
            <div className="dash-clock-date">{istDate}</div>
            <div className="dash-clock-ist">IST (UTC+5:30)</div>
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {section === 'overview' && (
          <div className="fade-in">
            <div className="stats-grid" style={{ marginBottom:28 }}>
              {STATS.map(s => (
                <div key={s.label} className="stat-card" style={{'--acc':s.color}}>
                  <div className="stat-label">{s.icon} {s.label}</div>
                  <div className="stat-value">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="charts-grid">
              {a.by_status    && <BarChart data={a.by_status}    title="By Status" />}
              {a.by_priority  && <BarChart data={a.by_priority}  title="By Priority" />}
              {a.by_category  && <BarChart data={a.by_category}  title="By Category" />}
              {a.by_department&& <BarChart data={a.by_department}title="By Department" />}
            </div>
          </div>
        )}

        {/* ── COMPLAINTS TABLE ── */}
        {section === 'complaints' && (
          <div className="fade-in">
            {/* Filters */}
            <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
              <input className="form-input" placeholder="🔍 Search by title, name, ID…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ maxWidth:280, minHeight:38 }} />
              <div className="tabs" style={{ margin:0, border:'none', gap:6 }}>
                {['all','Pending','In Progress','Completed','Reopened'].map(f => (
                  <button key={f} className={`tab ${filter===f?'active':''}`} style={{ padding:'6px 14px', fontSize:'.78rem' }}
                    onClick={() => setFilter(f)}>
                    {f==='all'?`All (${complaints.length})`:`${f} (${counts[f]||0})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="complaints-table-wrap">
              <table className="complaints-table">
                <thead>
                  <tr>
                    <th>#ID</th>
                    <th>Title</th>
                    <th>Citizen</th>
                    <th>Department</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Submitted (IST)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:'var(--ink-4)' }}>No complaints found</td></tr>
                  ) : filtered.map(c => (
                    <tr key={c.id}>
                      <td><span className="table-id">#{c.id}</span></td>
                      <td>
                        <div style={{ fontWeight:600, color:'var(--ink)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title||c.description?.slice(0,40)}</div>
                        <div style={{ fontSize:'.72rem', color:'var(--ink-4)', marginTop:2 }}>{c.category}</div>
                      </td>
                      <td style={{ fontSize:'.82rem', color:'var(--ink-2)' }}>{c.user_name||'—'}</td>
                      <td style={{ fontSize:'.82rem', color:'var(--ink-3)' }}>{c.department_assigned||'—'}</td>
                      <td><span className={`priority-badge priority-${(c.priority||'medium').toLowerCase()}`}>{c.priority}</span></td>
                      <td><span className="status-dot" style={{ background: STATUS_COLORS[c.status]||'#999' }} /><span style={{ fontSize:'.8rem', color:'var(--ink-2)', marginLeft:6 }}>{c.status}</span></td>
                      <td style={{ fontSize:'.78rem', color:'var(--ink-4)', whiteSpace:'nowrap' }}>{c.created_at_ist||c.created_at?.slice(0,16)||'—'}</td>
                      <td>
                        <Link to={`/complaints/${c.id}`} className="btn btn-secondary btn-sm" style={{ fontSize:'.74rem', padding:'4px 10px', minHeight:'auto' }}>View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop:10, fontSize:'.78rem', color:'var(--ink-4)' }}>
              Showing {filtered.length} of {complaints.length} complaints
            </div>
          </div>
        )}

        {/* ── FEEDBACK ── */}
        {section === 'feedback' && (
          <div className="fade-in">
            {complaints.filter(c => c.feedbacks?.length > 0).length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💬</div><div className="empty-title">No feedback yet</div></div>
            ) : (
              <div style={{ display:'grid', gap:14 }}>
                {complaints.filter(c => c.feedbacks?.length > 0).map(c => (
                  <div key={c.id} className="card">
                    <div style={{ fontWeight:700, color:'var(--teal)', marginBottom:10, fontFamily:'var(--serif)' }}>#{c.id} — {c.title}</div>
                    {c.feedbacks.map(f => (
                      <div key={f.id} style={{ background:'var(--ivory-2)', borderRadius:'var(--r)', padding:12, marginBottom:8, border:'1px solid var(--border)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <div>{'⭐'.repeat(f.rating)}{'☆'.repeat(5-f.rating)} <strong>{f.rating}/5</strong></div>
                          <span style={{ fontSize:'.7rem', fontWeight:700, padding:'2px 8px', borderRadius:3,
                            background: f.sentiment==='positive'?'var(--success-pale)':f.sentiment==='negative'?'var(--danger-pale)':'var(--ivory-3)',
                            color:       f.sentiment==='positive'?'var(--success)':f.sentiment==='negative'?'var(--danger)':'var(--ink-3)' }}>
                            {f.sentiment}
                          </span>
                        </div>
                        {f.comment && <p style={{ color:'var(--ink-3)', fontSize:'.85rem', margin:0 }}>{f.comment}</p>}
                        <div style={{ fontSize:'.72rem', color:'var(--ink-4)', marginTop:4 }}>{f.created_at}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {section === 'users' && (
          <div className="fade-in card">
            <div className="card-title">👥 Registered Users</div>
            <p style={{ color:'var(--ink-3)', fontSize:'.88rem' }}>User management — view and manage citizen registrations from the complaint details.</p>
            <div style={{ marginTop:14 }}>
              {[
                { label:'Admin', email:'admin@civic.gov', role:'admin' },
                { label:'Roads Officer', email:'roads@civic.gov', role:'department' },
                { label:'Sanitation Officer', email:'sanitation@civic.gov', role:'department' },
                { label:'Drainage Officer', email:'drainage@civic.gov', role:'department' },
                { label:'Electrical Officer', email:'electrical@civic.gov', role:'department' },
              ].map(u => (
                <div key={u.email} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:'.9rem' }}>{u.label}</div>
                    <div style={{ fontSize:'.78rem', color:'var(--ink-4)' }}>{u.email}</div>
                  </div>
                  <span className={`role-badge ${u.role}`}>{u.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
