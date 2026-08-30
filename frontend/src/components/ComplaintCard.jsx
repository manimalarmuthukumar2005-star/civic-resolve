import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

const STATUS_COLORS = {
  'Pending':     { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  'In Progress': { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  'Completed':   { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  'Reopened':    { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};
const PRIORITY_COLORS = {
  'Emergency': '#dc2626',
  'High':      '#ea580c',
  'Medium':    '#d97706',
  'Low':       '#16a34a',
};

export default function ComplaintCard({ complaint: c, showUser }) {
  const { t } = useLang();
  const sc = STATUS_COLORS[c.status] || { bg:'#f3f4f6', color:'#374151', border:'#d1d5db' };
  const pc = PRIORITY_COLORS[c.priority] || '#6b7280';
  const date = new Date(c.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

  return (
    <Link to={`/complaints/${c.id}`} className="complaint-card" style={{ '--priority-color': pc }}>
      <div className="cc-priority-bar" />
      <div className="cc-header">
        <div className="cc-title">{c.title}</div>
        <div className="cc-status" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
          {c.status}
        </div>
      </div>
      <div className="cc-badges">
        <span className="cc-badge cc-badge-priority" style={{ color: pc, background: pc + '15' }}>
          {c.priority}
        </span>
        <span className="cc-badge cc-badge-category">{c.category}</span>
        {c.reopened_count > 0 && <span className="cc-badge" style={{ background:'#fff7ed', color:'#c2410c' }}>🔁 ×{c.reopened_count}</span>}
      </div>
      <div className="cc-desc">{c.description}</div>
      <div className="cc-footer">
        <div className="cc-meta">
          {showUser && c.user_name && <span>👤 {c.user_name}</span>}
          <span>🏢 {t('cc_dept')} {c.department_assigned}</span>
        </div>
        <div className="cc-date">{t('cc_submitted')}: {date}</div>
      </div>
      <div className="cc-view">{t('cc_view')}</div>
    </Link>
  );
}
