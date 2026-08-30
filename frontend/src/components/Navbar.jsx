import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useDark } from '../context/DarkModeContext';

export default function Navbar() {
  const navRef = useRef(null);

  useEffect(() => {
    const updateHeight = () => {
      if (navRef.current) {
        const h = navRef.current.offsetHeight;
        document.documentElement.style.setProperty('--nav-h', h + 'px');
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    // Also update when fonts load
    document.fonts?.ready?.then(updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  const { user, logout }     = useAuth();
  const { t, toggleLang }    = useLang();
  const { dark, toggleDark } = useDark();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const dashLink = user?.role === 'admin' ? '/admin'
                 : user?.role === 'department' ? '/department'
                 : '/dashboard';

  return (
    <nav className="navbar" ref={navRef}>
      {/* ── Tier 1: Government identity strip ── */}
      <div className="navbar-govt-strip">
        <div className="navbar-govt-left">
          <div className="navbar-govt-emblem">🏛️</div>
          <span className="navbar-govt-name">Government of Tamil Nadu</span>
          <span className="navbar-govt-tag">தமிழ்நாடு அரசு · Digital Governance</span>
        </div>
        <span className="navbar-govt-right">Citizen Services Portal</span>
      </div>

      {/* ── Tier 2: Brand + Navigation ── */}
      <div className="navbar-inner">
        <Link to={user ? dashLink : '/'} className="navbar-brand">
          <div className="emblem">🌉</div>
          <span>
            <span className="name">Civic Resolve</span>
            <span className="sub">{t('nav_portal')}</span>
          </span>
        </Link>

        <div className="navbar-links">
          <button onClick={toggleDark} className="icon-btn" title={dark ? 'Light mode' : 'Dark mode'}>
            {dark ? '☀️' : '🌙'}
          </button>
          <button onClick={toggleLang} className="lang-toggle-btn" title="Switch Language / மொழி மாற்று">
            {t('lang_toggle')}
          </button>

          {user ? (
            <>
              <Link to={dashLink}>{t('nav_dashboard')}</Link>
              {user.role === 'citizen' && <Link to="/submit">{t('nav_report')}</Link>}
              <div className="user-pill">
                <div className="user-avatar">{user.name?.[0]?.toUpperCase()}</div>
                <span>{user.name?.split(' ')[0]}</span>
                <span className={`role-badge ${user.role}`}>{user.role}</span>
              </div>
              <button onClick={handleLogout}>{t('nav_signout')}</button>
            </>
          ) : (
            <>
              <Link to="/login">{t('nav_signin')}</Link>
              <Link to="/register" className="nav-cta">{t('nav_register')}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
