import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { api } from '../utils/api';

export default function Register() {
  const { register } = useAuth();
  const { t }        = useLang();
  const navigate     = useNavigate();

  const [step, setStep]             = useState(1); // 1=details, 2=otp, 3=password
  const [form, setForm]             = useState({ name:'', email:'', phone:'', password:'', confirmPassword:'' });
  const [otp, setOtp]               = useState(['','','','','','']);
  const [timer, setTimer]           = useState(60);
  const [timerOn, setTimerOn]       = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [devOtp, setDevOtp]         = useState('');
  const [error, setError]           = useState('');
  const [info, setInfo]             = useState('');
  const [loading, setLoading]       = useState(false);
  const [sending, setSending]       = useState(false);
  const otpRefs  = useRef([]);
  const timerRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (timerOn && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(p => p - 1), 1000);
    } else if (timer === 0) {
      setTimerOn(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [timerOn, timer]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Step 1 → send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault(); setError(''); setInfo('');
    if (!form.name.trim())  { setError('Please enter your full name.'); return; }
    if (!form.email.trim()) { setError('Please enter your email address.'); return; }
    if (!form.phone.trim()) { setError('Please enter your phone number.'); return; }
    setSending(true);
    try {
      const res = await api.post('/auth/send-otp', { email: form.email.trim() });
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
        setInfo(`⚠️ Dev mode: Email not configured. Your OTP is: ${res.dev_otp}`);
      } else {
        setInfo(`✅ OTP sent to ${form.email}. Please check your inbox (also check spam folder).`);
      }
      setStep(2);
      setTimer(60); setTimerOn(true);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  };

  // OTP input handling
  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  // Step 2 → verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setError('');
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit OTP.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: form.email.trim(), otp: code });
      setEmailVerified(true);
      setStep(3);
      setInfo('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // Resend OTP
  const handleResend = async () => {
    setError(''); setSending(true);
    try {
      const res = await api.post('/auth/send-otp', { email: form.email.trim() });
      if (res.dev_otp) setDevOtp(res.dev_otp);
      setOtp(['','','','','','']);
      setTimer(60); setTimerOn(true);
      setInfo(res.dev_otp ? `⚠️ Dev mode — New OTP: ${res.dev_otp}` : `✅ New OTP sent to ${form.email}`);
      otpRefs.current[0]?.focus();
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  };

  // Step 3 → final registration
  const handleRegister = async (e) => {
    e.preventDefault(); setError('');
    if (!form.password)                        { setError('Please enter a password.'); return; }
    if (form.password.length < 6)             { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirmPassword){ setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password });
      navigate('/dashboard');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const FEATS = [t('reg_feat1'), t('reg_feat2'), t('reg_feat3'), t('reg_feat4'), t('reg_feat5')];

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <div className="auth-left-seal">🌉</div>
          <h1 className="auth-left-title">{t('reg_left_title')}</h1>
          <p className="auth-left-sub">{t('reg_left_sub')}</p>
          <div className="auth-left-features">
            {FEATS.map(f => (
              <div key={f} className="auth-left-feat">
                <div className="auth-left-dot" />
                <span className="auth-left-feat-text">{f}</span>
              </div>
            ))}
          </div>
          {/* Step indicator on left */}
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: '.68rem', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: 4 }}>Registration Steps</div>
            {[
              { n: 1, label: 'Your Details' },
              { n: 2, label: 'Verify Email' },
              { n: 3, label: 'Set Password' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.78rem', fontWeight: 800,
                  background: step > s.n ? 'rgba(255,255,255,.9)' : step === s.n ? '#fff' : 'rgba(255,255,255,.18)',
                  color: step > s.n ? '#e23744' : step === s.n ? '#e23744' : 'rgba(255,255,255,.5)',
                }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span style={{ fontSize: '.84rem', fontWeight: step === s.n ? 700 : 500, color: step === s.n ? '#fff' : 'rgba(255,255,255,.55)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-left-footer">
          <p className="auth-left-footer-text">{t('login_footer')}</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card fade-in">
          <div className="auth-logo">
            <div className="auth-logo-seal" style={{ background: 'linear-gradient(135deg,#e23744,#fc8019)' }}>
              {step === 1 ? '📝' : step === 2 ? '📧' : '🔒'}
            </div>
            <h1>{step === 1 ? t('reg_title') : step === 2 ? 'Verify Your Email' : 'Set Your Password'}</h1>
            <p>{step === 1 ? t('reg_subtitle') : step === 2 ? `Enter the 6-digit OTP sent to ${form.email}` : 'Almost done! Create a secure password.'}</p>
          </div>

          {/* Step progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{
                width: n === step ? 28 : 8, height: 8, borderRadius: 4,
                background: n <= step ? 'var(--red)' : 'var(--border-2)',
                transition: 'all .3s',
              }} />
            ))}
          </div>

          {error && <div className="alert alert-error">⚠️ {error}</div>}
          {info  && <div className="alert alert-info">ℹ️ {info}</div>}

          {/* ── STEP 1: Details ── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label">{t('reg_name')}</label>
                <input className="form-input" type="text" placeholder="e.g. Ravi Kumar"
                  value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('reg_email')}</label>
                <input className="form-input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} required />
                <div className="form-hint">An OTP will be sent to this email to verify your identity.</div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('reg_phone')}</label>
                <input className="form-input" type="tel" placeholder="+91 98765 43210"
                  value={form.phone} onChange={e => set('phone', e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={sending}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                {sending ? <><span className="spinner-sm" />Sending OTP…</> : '📧 Send Verification OTP →'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '.875rem', color: 'var(--ink-4)', marginTop: 18 }}>
                {t('reg_have_account')} <Link to="/login" style={{ color: 'var(--red)', fontWeight: 700 }}>{t('reg_signin')}</Link>
              </p>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '.84rem', color: 'var(--ink-3)', marginBottom: 4 }}>
                  OTP sent to <strong style={{ color: 'var(--ink)' }}>{form.email}</strong>
                </div>
              </div>

              {/* 6 OTP boxes */}
              <div className="otp-grid" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    className={`otp-box ${digit ? 'filled' : ''}`}
                    type="text" inputMode="numeric"
                    maxLength={1} value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>

              {/* Timer */}
              <div className="otp-timer">
                {timerOn
                  ? <>Resend OTP in <span>{timer}s</span></>
                  : <button type="button" className="otp-resend" onClick={handleResend} disabled={sending}>
                      {sending ? 'Sending…' : 'Resend OTP'}
                    </button>
                }
              </div>

              <button className="btn btn-primary" type="submit" disabled={loading || otp.join('').length < 6}
                style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <><span className="spinner-sm" />Verifying…</> : '✅ Verify OTP →'}
              </button>

              <button type="button" className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                onClick={() => { setStep(1); setError(''); setInfo(''); setOtp(['','','','','','']); }}>
                ← Back to Details
              </button>
            </form>
          )}

          {/* ── STEP 3: Password ── */}
          {step === 3 && (
            <form onSubmit={handleRegister}>
              {/* Email verified badge */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div className="email-verified-badge">
                  ✅ {form.email} verified
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('reg_password')}</label>
                <input className="form-input" type="password" placeholder="Min. 6 characters"
                  value={form.password} onChange={e => set('password', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('reg_confirm')}</label>
                <input className="form-input" type="password" placeholder="Repeat your password"
                  value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <div className="form-hint" style={{ color: 'var(--red)' }}>⚠️ Passwords do not match</div>
                )}
                {form.confirmPassword && form.password === form.confirmPassword && form.password && (
                  <div className="form-hint" style={{ color: 'var(--green)' }}>✅ Passwords match</div>
                )}
              </div>

              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                {loading ? <><span className="spinner-sm" />Creating account…</> : '🎉 Create My Account →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
