import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useOffline } from '../context/OfflineContext';
import { api } from '../utils/api';
import WebcamCapture from '../components/WebcamCapture';

/* ── Image Validation ──────────────────────────────────── */
const MAX_MB   = 10;
const OK_TYPES = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
function validateImage(file) {
  if (!file) return 'No file selected.';
  const ext = file.name.split('.').pop().toLowerCase();
  if (!OK_TYPES.includes(file.type) && !['jpg','jpeg','png','gif','webp'].includes(ext))
    return `❌ Invalid file "${ext}". Only JPG, PNG, GIF, WEBP allowed.`;
  if (file.size > MAX_MB * 1024 * 1024)
    return `❌ File too large (${(file.size/1024/1024).toFixed(1)}MB). Max is ${MAX_MB}MB.`;
  return null;
}

/* ── Smart Image Detection from filename ──────────────── */
function detectHint(filename) {
  const n = filename.toLowerCase();
  if (/pothole|road|crack|tar|asphalt|pavement|street/.test(n)) return { icon:'🛣️', label:'Roads/Public Works detected' };
  if (/garbage|waste|trash|dump|litter|rubbish/.test(n))        return { icon:'🗑️', label:'Sanitation detected' };
  if (/drain|flood|water|sewage|pipe|waterlog/.test(n))         return { icon:'💧', label:'Drainage/Water detected' };
  if (/light|lamp|electric|wire|pole|bulb/.test(n))             return { icon:'⚡', label:'Electrical detected' };
  return null;
}

export default function SubmitComplaint() {
  const { token }              = useAuth();
  const { t, lang }            = useLang();
  const { isOnline, addToQueue } = useOffline();
  const navigate               = useNavigate();

  const [form, setForm]             = useState({ title:'', description:'', location_address:'', latitude:'', longitude:'' });
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageSource, setImageSource]   = useState('');
  const [imageError, setImageError]     = useState('');
  const [detectHintMsg, setDetectHintMsg] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoAddress, setGeoAddress] = useState('');
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const recognitionRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /* ── Voice Input ─────────────────────────────────────── */
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('Voice input not supported. Please use Chrome.'); return; }
    const rec = new SR();
    rec.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    rec.continuous = false; rec.interimResults = false;
    rec.onstart  = () => setIsListening(true);
    rec.onend    = () => setIsListening(false);
    rec.onresult = (e) => {
      const spoken = e.results[0][0].transcript;
      setForm(f => ({ ...f, description: f.description + (f.description ? ' ' : '') + spoken }));
    };
    rec.onerror = () => { setIsListening(false); setError('Voice input failed. Try again.'); };
    rec.start(); recognitionRef.current = rec;
  };
  const stopVoice = () => { recognitionRef.current?.stop(); setIsListening(false); };

  /* ── Image handling with validation + detection ──────── */
  const handleImage = (file) => {
    if (!file) return;
    setImageError('');
    setDetectHintMsg(null);
    const err = validateImage(file);
    if (err) { setImageError(err); return; }
    setImageFile(file);
    setImageSource('upload');
    // Smart detection from filename
    const hint = detectHint(file.name);
    if (hint) setDetectHintMsg(hint);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleWebcamCapture = (file, preview) => {
    setImageFile(file); setImagePreview(preview);
    setImageSource('webcam'); setImageError('');
    setDetectHintMsg(null); setShowWebcam(false);
  };

  const clearImage = () => {
    setImageFile(null); setImagePreview(null);
    setImageSource(''); setImageError(''); setDetectHintMsg(null);
  };

  /* ── GPS with reverse geocoding ─────────────────────── */
  const getLocation = () => {
    setGeoLoading(true); setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm(f => ({ ...f, latitude: lat, longitude: lng }));
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
          const data = await res.json();
          if (data?.display_name) {
            const a = data.address || {};
            const parts = [a.road || a.pedestrian, a.suburb || a.neighbourhood, a.city || a.town || a.village, a.state].filter(Boolean);
            const addr = parts.join(', ') || data.display_name;
            setGeoAddress(addr);
            setForm(f => ({ ...f, location_address: addr, latitude: lat, longitude: lng }));
          }
        } catch { setForm(f => ({ ...f, location_address: `${lat}, ${lng}` })); }
        setGeoLoading(false);
      },
      () => { setError('Location access denied. Please allow location in browser settings.'); setGeoLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* ── Submit ─────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!form.title.trim())       { setError('Please enter a complaint title.'); return; }
    if (form.description.trim().split(/\s+/).length < 3) { setError('Please describe the issue in at least 3 words.'); return; }
    if (imageError) { setError('Please fix the image error before submitting.'); return; }
    setLoading(true);

    if (!isOnline) {
      addToQueue({ ...form, imagePreview });
      setSuccess('📴 Saved offline! Will auto-submit when you reconnect.');
      setTimeout(() => navigate('/dashboard'), 2500);
      setLoading(false); return;
    }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    if (imageFile) fd.append('image', imageFile);

    try {
      await api.postForm('/complaints', fd, token);
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
      setSuccess('✅ Complaint submitted successfully! Our AI is routing it to the right department.');
      setTimeout(() => navigate('/dashboard'), 2200);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="page fade-in" style={{ maxWidth: 760 }}>
      {showWebcam && <WebcamCapture onCapture={handleWebcamCapture} onClose={() => setShowWebcam(false)} />}

      <div className="page-header">
        <h1 className="page-title">📋 {t('sc_title')}</h1>
        <p className="page-subtitle">{t('sc_subtitle')}</p>
      </div>

      {error   && <div className="alert alert-error">⚠️ {error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {!isOnline && <div className="alert alert-warning">📴 You're offline — complaint will be saved and submitted when you reconnect.</div>}

      <div className="ai-info-box">
        <strong>🤖 {t('sc_ai_title')}</strong>
        <p>{t('sc_ai_desc')}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>

        {/* ── Details ── */}
        <div className="card">
          <div className="card-title">📋 {t('sc_section_details')}</div>
          <div className="form-group">
            <label className="form-label">{t('sc_issue_title')}</label>
            <input className="form-input" placeholder={t('sc_title_ph')}
              value={form.title} onChange={e => set('title', e.target.value)} required />
            <div className="form-hint">{t('sc_title_hint')}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <label className="form-label" style={{ margin: 0 }}>{t('sc_desc')}</label>
              <button type="button" className={`voice-btn ${isListening ? 'voice-listening' : ''}`}
                onClick={isListening ? stopVoice : startVoice}>
                {isListening ? '⏹ Stop' : `🎤 Voice (${lang === 'ta' ? 'தமிழ்' : 'English'})`}
              </button>
            </div>
            {isListening && (
              <div className="listening-indicator">
                <span className="listening-dot" />
                Listening… speak your complaint in {lang === 'ta' ? 'Tamil (தமிழ்)' : 'English'}
              </div>
            )}
            <textarea className="form-textarea" rows={5} placeholder={t('sc_desc_ph')}
              value={form.description} onChange={e => set('description', e.target.value)} required />
            <div className="form-hint">{t('sc_desc_hint')}</div>
          </div>
        </div>

        {/* ── Photo with webcam + validation + detection ── */}
        <div className="card">
          <div className="card-title">📸 {t('sc_section_photo')}</div>

          {imageError && <div className="image-error-banner">⚠️ {imageError}</div>}

          {!imagePreview ? (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button type="button" className="img-source-btn"
                  onClick={() => document.getElementById('img-file').click()}>
                  🖼️ Upload Photo
                </button>
                <button type="button" className="img-source-btn img-source-btn-cam"
                  onClick={() => setShowWebcam(true)}>
                  📷 Live Camera
                </button>
              </div>

              <div className={`image-upload-area ${dragOver ? 'over' : ''}`}
                onClick={() => document.getElementById('img-file').click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleImage(e.dataTransfer.files[0]); }}>
                <input id="img-file" type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={e => handleImage(e.target.files[0])} />
                <div style={{ fontSize: '2.2rem', marginBottom: 8, opacity: .35 }}>📷</div>
                <div style={{ fontWeight: 700, color: 'var(--ink-2)', marginBottom: 4 }}>
                  Click to upload or drag &amp; drop
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--ink-4)' }}>JPG, PNG, GIF, WEBP — max {MAX_MB}MB</div>
              </div>

              <div className="image-validation-info">
                <span>✅ Accepted: JPG, PNG, GIF, WEBP</span>
                <span>📦 Max: {MAX_MB}MB</span>
                <span>🔍 Auto-detects category from image name</span>
              </div>
            </>
          ) : (
            <div>
              <div className="image-source-badge">
                {imageSource === 'webcam' ? '📷 Live Camera' : '🖼️ Uploaded'}
                {imageFile && ` · ${(imageFile.size/1024).toFixed(0)}KB`}
              </div>
              <img src={imagePreview} alt="Preview" className="image-preview" />

              {/* Smart category detection hint */}
              {detectHintMsg && (
                <div className="image-detect-hint">
                  {detectHintMsg.icon} {detectHintMsg.label} — AI will auto-route to correct department
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => setShowWebcam(true)}>📷 Retake with Camera</button>
                <button type="button" className="btn btn-danger btn-sm"
                  onClick={clearImage}>✕ Remove</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Location with GPS auto-fill ── */}
        <div className="card">
          <div className="card-title">📍 {t('sc_section_location')}</div>
          <div className="form-group">
            <label className="form-label">{t('sc_address')}</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" placeholder={t('sc_address_ph')}
                value={form.location_address}
                onChange={e => set('location_address', e.target.value)} />
              {geoAddress && <div className="geo-autofill-tag">📍 Auto-filled</div>}
            </div>
            <div className="form-hint">Click the GPS button below to auto-fill your current address</div>
          </div>

          <button type="button" className="btn btn-secondary" onClick={getLocation} disabled={geoLoading}>
            {geoLoading
              ? <><span className="spinner-sm" /> Detecting location &amp; address…</>
              : '📍 Capture GPS & Auto-fill Address'}
          </button>

          {form.latitude && (
            <div className="geo-indicator" style={{ marginTop: 10 }}>
              <div className="geo-dot" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '.82rem' }}>
                  GPS: {form.latitude}, {form.longitude}
                </div>
                {geoAddress && (
                  <div style={{ fontSize: '.75rem', color: 'var(--ink-3)', marginTop: 2 }}>
                    📍 {geoAddress}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem' }}>
          {loading
            ? <><span className="spinner-sm" />{t('sc_submitting')}</>
            : `📤 ${t('sc_submit_btn')}`}
        </button>
      </form>
    </div>
  );
}
