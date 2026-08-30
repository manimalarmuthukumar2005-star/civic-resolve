import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function UserProfile() {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState({ name:'', phone:'', address:'', city:'', pincode:'', bio:'' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState({ text:'', type:'' });
  const [pwForm, setPwForm]   = useState({ current:'', newPw:'', confirm:'' });
  const [pwMsg, setPwMsg]     = useState({ text:'', type:'' });
  const [tab, setTab]         = useState('profile');
  const [joinedDate, setJoinedDate] = useState('');

  useEffect(() => {
    api.get('/auth/profile', token).then(d => {
      const u = d.user || {};
      setProfile({
        name:    u.name || '',
        phone:   u.phone || '',
        address: u.profile?.address || '',
        city:    u.profile?.city || '',
        pincode: u.profile?.pincode || '',
        bio:     u.profile?.bio || '',
      });
      setJoinedDate(u.created_at_ist || u.created_at || '');
    }).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault(); setMsg({ text:'', type:'' }); setSaving(true);
    try {
      await api.post('/auth/profile', profile, token);
      setMsg({ text:'✅ Profile updated successfully!', type:'success' });
    } catch(e) { setMsg({ text: e.message, type:'error' }); }
    finally { setSaving(false); }
  };

  const handlePwChange = async (e) => {
    e.preventDefault(); setPwMsg({ text:'', type:'' });
    if (pwForm.newPw.length < 6) { setPwMsg({ text:'Password must be at least 6 characters.', type:'error' }); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg({ text:'Passwords do not match.', type:'error' }); return; }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { current_password: pwForm.current, new_password: pwForm.newPw }, token);
      setPwMsg({ text:'✅ Password changed successfully!', type:'success' });
      setPwForm({ current:'', newPw:'', confirm:'' });
    } catch(e) { setPwMsg({ text: e.message, type:'error' }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const TABS = [{ key:'profile', label:'👤 Profile Details' }, { key:'password', label:'🔒 Change Password' }, { key:'account', label:'ℹ️ Account Info' }];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-avatar">{profile.name?.[0]?.toUpperCase()}</div>
          <div className="sidebar-name">{profile.name}</div>
          <div className="sidebar-role">{user?.role}</div>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(t => (
            <button key={t.key} className={`sidebar-link ${tab===t.key?'active':''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
          <a href={user?.role === 'admin' ? '/admin' : user?.role === 'department' ? '/department' : '/dashboard'}
            className="sidebar-link">
            ← Back to Dashboard
          </a>
        </nav>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        <div className="page-header">
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">Manage your profile and preferences</p>
        </div>

        {tab === 'profile' && (
          <div className="card fade-in">
            <div className="card-title">👤 Personal Information</div>
            {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
            <form onSubmit={handleSave}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={profile.name} onChange={e => setProfile({...profile, name:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" value={profile.phone} onChange={e => setProfile({...profile, phone:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" placeholder="e.g. Chennai" value={profile.city} onChange={e => setProfile({...profile, city:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-input" placeholder="e.g. 600001" value={profile.pincode} onChange={e => setProfile({...profile, pincode:e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Full Address</label>
                <input className="form-input" placeholder="Door no, Street, Area" value={profile.address} onChange={e => setProfile({...profile, address:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Bio (Optional)</label>
                <textarea className="form-textarea" rows={3} placeholder="Brief description about yourself" value={profile.bio} onChange={e => setProfile({...profile, bio:e.target.value})} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? <><span className="spinner-sm" />Saving…</> : '💾 Save Changes'}
              </button>
            </form>
          </div>
        )}

        {tab === 'password' && (
          <div className="card fade-in">
            <div className="card-title">🔒 Change Password</div>
            {pwMsg.text && <div className={`alert alert-${pwMsg.type}`}>{pwMsg.text}</div>}
            <form onSubmit={handlePwChange} style={{ maxWidth:420 }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" value={pwForm.current} onChange={e => setPwForm({...pwForm, current:e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Min. 6 characters" value={pwForm.newPw} onChange={e => setPwForm({...pwForm, newPw:e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm:e.target.value})} required />
                {pwForm.confirm && pwForm.newPw !== pwForm.confirm && <div className="form-hint" style={{color:'var(--danger)'}}>⚠️ Passwords do not match</div>}
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? <><span className="spinner-sm" />Updating…</> : '🔒 Update Password'}
              </button>
            </form>
          </div>
        )}

        {tab === 'account' && (
          <div className="card fade-in">
            <div className="card-title">ℹ️ Account Information</div>
            <div style={{ display:'grid', gap:16 }}>
              {[
                { label:'Email Address', value: user?.email },
                { label:'Role', value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) },
                { label:'Department', value: user?.department || 'N/A' },
                { label:'Joined On', value: joinedDate || 'N/A' },
              ].map(row => (
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:'.82rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--ink-4)' }}>{row.label}</span>
                  <span style={{ fontSize:'.92rem', fontWeight:600, color:'var(--ink)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
