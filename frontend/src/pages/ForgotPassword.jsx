import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep]   = useState(1); // 1=email, 2=otp+newpw
  const [email, setEmail] = useState('');
  const [otp, setOtp]     = useState(['','','','','','']);
  const [devOtp, setDevOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [timer, setTimer] = useState(60);
  const [timerOn, setTimerOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [info, setInfo]     = useState('');
  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerOn && timer > 0) { timerRef.current = setTimeout(() => setTimer(p => p-1), 1000); }
    else if (timer === 0) setTimerOn(false);
    return () => clearTimeout(timerRef.current);
  }, [timerOn, timer]);

  const handleSend = async (e) => {
    e.preventDefault(); setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setInfo(res.dev_otp ? `OTP: ${res.dev_otp} (dev mode)` : 'OTP sent to your email. Check your inbox.');
      if (res.dev_otp) setDevOtp(res.dev_otp);
      setStep(2); setTimer(60); setTimerOn(true);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const n = [...otp]; n[i] = val.slice(-1); setOtp(n);
    if (val && i < 5) otpRefs.current[i+1]?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i-1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (p.length === 6) { setOtp(p.split('')); otpRefs.current[5]?.focus(); }
  };

  const handleReset = async (e) => {
    e.preventDefault(); setError('');
    const code = otp.join('');
    if (code.length < 6) { setError('Enter all 6 digits.'); return; }
    if (!password)       { setError('Enter a new password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim().toLowerCase(), otp: code, password });
      setInfo('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      if (res.dev_otp) setDevOtp(res.dev_otp);
      setOtp(['','','','','','']); setTimer(60); setTimerOn(true);
      setInfo(res.dev_otp ? `New OTP: ${res.dev_otp}` : 'New OTP sent!');
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-top-rule" />
        <div className="auth-left-inner">
          <div className="auth-left-seal">🔐</div>
          <h1 className="auth-left-title">Reset Your Password</h1>
          <p className="auth-left-sub">Enter your registered email and we'll send you a 6-digit OTP to reset your password securely.</p>
        </div>
        <div className="auth-left-footer">
          <p className="auth-left-footer-text">CIVIC RESOLVE · GOVERNMENT OF TAMIL NADU</p>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card fade-in">
          <div className="auth-logo">
            <div className="auth-logo-seal" style={{ background: 'linear-gradient(135deg,var(--teal),var(--teal-2))' }}>
              {step === 1 ? '📧' : '🔑'}
            </div>
            <h1>{step === 1 ? 'Forgot Password' : 'Reset Password'}</h1>
            <p>{step === 1 ? 'Enter your registered email address' : `OTP sent to ${email}`}</p>
          </div>

          <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:22 }}>
            {[1,2].map(n => (
              <div key={n} style={{ width: n===step?28:8, height:8, borderRadius:4, background: n<=step?'var(--teal)':'var(--border-2)', transition:'all .3s' }} />
            ))}
          </div>

          {error && <div className="alert alert-error">⚠️ {error}</div>}
          {info  && <div className="alert alert-success">✅ {info}</div>}

          {step === 1 ? (
            <form onSubmit={handleSend}>
              <div className="form-group">
                <label className="form-label">Registered Email</label>
                <input className="form-input" type="email" placeholder="your@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width:'100%', justifyContent:'center' }}>
                {loading ? <><span className="spinner-sm" />Sending OTP…</> : '📧 Send Reset OTP →'}
              </button>
              <p style={{ textAlign:'center', fontSize:'.88rem', color:'var(--ink-4)', marginTop:16 }}>
                Remembered your password? <Link to="/login" style={{ color:'var(--teal)', fontWeight:700 }}>Sign In</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleReset}>
              <div className="otp-grid" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input key={i} ref={el => otpRefs.current[i] = el}
                    className={`otp-box ${digit?'filled':''}`}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)} />
                ))}
              </div>
              <div className="otp-timer">
                {timerOn ? <>Resend in <span>{timer}s</span></> :
                  <button type="button" className="otp-resend" onClick={handleResend} disabled={loading}>Resend OTP</button>}
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Min. 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" placeholder="Repeat new password"
                  value={confirm} onChange={e => setConfirm(e.target.value)} required />
                {confirm && password !== confirm && <div className="form-hint" style={{color:'var(--danger)'}}>⚠️ Passwords do not match</div>}
                {confirm && password === confirm && password && <div className="form-hint" style={{color:'var(--success)'}}>✅ Passwords match</div>}
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading || otp.join('').length < 6}
                style={{ width:'100%', justifyContent:'center' }}>
                {loading ? <><span className="spinner-sm" />Resetting…</> : '🔑 Reset Password →'}
              </button>
              <button type="button" className="btn btn-secondary"
                style={{ width:'100%', justifyContent:'center', marginTop:10 }}
                onClick={() => { setStep(1); setError(''); setInfo(''); setOtp(['','','','','','']); }}>
                ← Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
