import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

export default function Login() {
  const { login }  = useAuth();
  const { t }      = useLang();
  const navigate   = useNavigate();
  const [selectedRole, setSelectedRole] = useState('citizen');
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ROLES = [
    {
      key: 'citizen', icon: '👤',
      label: 'Citizen',
      desc: 'Register and track your civic complaints',
      hint: 'Use your registered email address',
      placeholder: 'your@email.com',
      showRegister: true,
      accentColor: 'var(--success)',
      bgColor: 'var(--success-pale)',
      borderColor: 'rgba(29,107,62,.3)',
    },
    {
      key: 'department', icon: '🏗️',
      label: 'Department',
      desc: 'Manage and resolve assigned complaints',
      hint: 'Use your official department email',
      placeholder: 'dept@civic.gov',
      showRegister: false,
      accentColor: 'var(--info)',
      bgColor: 'var(--info-pale)',
      borderColor: 'rgba(26,77,107,.3)',
    },
    {
      key: 'admin', icon: '🏛️',
      label: 'Admin',
      desc: 'Full system access and oversight',
      hint: 'Use your admin credentials',
      placeholder: 'admin@civic.gov',
      showRegister: false,
      accentColor: 'var(--saffron)',
      bgColor: 'var(--saffron-pale)',
      borderColor: 'rgba(212,137,26,.3)',
    },
  ];

  const role = ROLES.find(r => r.key === selectedRole);

  const handleRoleChange = (key) => {
    setSelectedRole(key);
    setForm({ email: '', password: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await login(form.email.trim(), form.password);
      const r = data.user?.role;
      const normRole = r === 'user' ? 'citizen' : r;
      // Strict role enforcement — citizen tab only for citizens
      if (normRole !== selectedRole) {
        setError(
          normRole === 'citizen'
            ? 'This is a Citizen account. Please select the "Citizen" tab.'
            : normRole === 'department'
            ? 'This is a Department account. Please select the "Department" tab.'
            : 'This is an Admin account. Please select the "Admin" tab.'
        );
        setLoading(false); return;
      }
      navigate(normRole === 'admin' ? '/admin' : normRole === 'department' ? '/department' : '/dashboard');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      {/* ── Left panel ── */}
      <div className="auth-left">
        <div className="auth-left-top-rule" />
        <div className="auth-left-inner">
          <div className="auth-left-seal">🏛️</div>
          <h1 className="auth-left-title">{t('login_left_title')}</h1>
          <p className="auth-left-sub">{t('login_left_sub')}</p>
          <div className="auth-left-features">
            {[t('login_feat1'),t('login_feat2'),t('login_feat3'),t('login_feat4'),t('login_feat5')].map(f => (
              <div key={f} className="auth-left-feat">
                <div className="auth-left-dot" />
                <span className="auth-left-feat-text">{f}</span>
              </div>
            ))}
          </div>

          {/* Who can login */}
          <div style={{ marginTop: 36 }}>
            <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 12 }}>
              Portal Access
            </div>
            {ROLES.map(r => (
              <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                  {r.icon}
                </div>
                <div>
                  <div style={{ fontSize: '.84rem', fontWeight: 700, color: '#fff' }}>{r.label}</div>
                  <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.5)' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-left-footer">
          <p className="auth-left-footer-text">{t('login_footer')}</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-card fade-in">
          <div className="auth-logo">
            <div className="auth-logo-seal" style={{ background: 'linear-gradient(135deg,var(--teal),var(--teal-2))' }}>🌉</div>
            <h1>Civic Resolve</h1>
            <p>Sign in to your account</p>
          </div>

          {/* Role Selector */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-4)', marginBottom: 10 }}>
              Select Your Role
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {ROLES.map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleRoleChange(r.key)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--r-lg)',
                    border: `2px solid ${selectedRole === r.key ? r.accentColor : 'var(--border)'}`,
                    background: selectedRole === r.key ? r.bgColor : 'var(--ivory)',
                    cursor: 'pointer',
                    transition: 'all var(--t)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    outline: 'none',
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{r.icon}</span>
                  <span style={{
                    fontSize: '.76rem', fontWeight: 700,
                    color: selectedRole === r.key ? r.accentColor : 'var(--ink-3)',
                  }}>{r.label}</span>
                </button>
              ))}
            </div>

            {/* Selected role hint */}
            <div style={{
              marginTop: 10, padding: '8px 12px',
              background: role.bgColor,
              border: `1px solid ${role.borderColor}`,
              borderRadius: 'var(--r)',
              fontSize: '.78rem', color: 'var(--ink-2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{role.icon}</span>
              <span><strong style={{ color: role.accentColor }}>{role.label}:</strong> {role.hint}</span>
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('login_email')}</label>
              <input
                className="form-input"
                type="email"
                placeholder={role.placeholder}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label className="form-label" style={{ margin: 0 }}>{t('login_password')}</label>
                <Link to="/forgot-password" style={{ fontSize: '.78rem', color: 'var(--teal)', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  Forgot Password?
                </Link>
              </div>
              <input
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? <><span className="spinner-sm" />Signing in…</> : `Sign in as ${role.label} →`}
            </button>
          </form>

          {role.showRegister && (
            <p style={{ textAlign: 'center', fontSize: '.88rem', color: 'var(--ink-4)', marginTop: 20 }}>
              New citizen?{' '}
              <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 700 }}>
                Register here
              </Link>
            </p>
          )}

          {!role.showRegister && (
            <p style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--ink-4)', marginTop: 16, padding: '10px 14px', background: 'var(--ivory-2)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
              🔒 {role.label} access is restricted to authorised government personnel only.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
