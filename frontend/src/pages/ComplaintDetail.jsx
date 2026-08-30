import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { api } from '../utils/api';
import ProgressTracker from '../components/ProgressTracker';

const S_CLASS = { 'Pending':'status-pending','In Progress':'status-in-progress','Completed':'status-completed','Reopened':'status-reopened' };
const P_CLASS  = { 'Emergency':'priority-emergency','High':'priority-high','Medium':'priority-medium','Low':'priority-low' };

function Section({ title, children }) {
  return <div className="card" style={{ marginBottom:16 }}><div className="card-title">{title}</div>{children}</div>;
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [complaint, setComplaint]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [note, setNote]             = useState('');
  const [updating, setUpdating]     = useState(false);
  const [feedback, setFeedback]     = useState({ rating:0, comment:'' });
  const [submittingFb, setSubmittingFb] = useState(false);
  const [msg, setMsg]               = useState({ text:'', type:'' });
  const [notifEnabled, setNotifEnabled] = useState(false);
  // Dept response state
  const [respMsg, setRespMsg]       = useState('');
  const [respImage, setRespImage]   = useState(null);
  const [sendingResp, setSendingResp] = useState(false);
  const respFileRef = useRef(null);

  const load = () => {
    api.get(`/complaints/${id}`, token)
      .then(d => { setComplaint(d.complaint); setStatusUpdate(d.complaint.status); })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id, token]);
  useEffect(() => {
    if ('Notification' in window) setNotifEnabled(Notification.permission === 'granted');
  }, []);

  const enableNotifications = async () => {
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === 'granted');
    if (perm === 'granted') new Notification('🔔 Civic Resolve', { body: `You'll be notified on complaint #${id} updates.` });
  };

  const handleStatus = async () => {
    setUpdating(true);
    try {
      await api.patch(`/complaints/${id}/status`, { status: statusUpdate, note }, token);
      setMsg({ text:'✅ Status updated successfully.', type:'success' });
      if (notifEnabled) new Notification('📋 Complaint Updated', { body: `#${id} → ${statusUpdate}` });
      load();
    } catch(e) { setMsg({ text:e.message, type:'error' }); }
    finally { setUpdating(false); }
  };

  const handleFeedback = async () => {
    if (!feedback.rating) { setMsg({ text:'Please select a star rating.', type:'error' }); return; }
    setSubmittingFb(true);
    try {
      const data = await api.post(`/complaints/${id}/feedback`, feedback, token);
      setMsg({ text: data.reopened ? '⚠️ Complaint reopened due to low satisfaction.' : '✅ Thank you for your feedback!', type: data.reopened?'warning':'success' });
      load();
    } catch(e) { setMsg({ text:e.message, type:'error' }); }
    finally { setSubmittingFb(false); }
  };

  const handleSendResponse = async () => {
    if (!respMsg.trim()) { setMsg({ text:'Please enter a response message.', type:'error' }); return; }
    setSendingResp(true);
    try {
      const fd = new FormData();
      fd.append('message', respMsg);
      if (respImage) fd.append('image', respImage);
      await api.postForm(`/complaints/${id}/response`, fd, token);
      setMsg({ text:'✅ Response sent to citizen successfully!', type:'success' });
      setRespMsg(''); setRespImage(null);
      load();
    } catch(e) { setMsg({ text:e.message, type:'error' }); }
    finally { setSendingResp(false); }
  };

  const handleDownloadReport = async () => {
    try {
      const res = await api.downloadBlob(`/complaints/${id}/report`, token);
      const contentType = res.headers.get('content-type') || '';
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objUrl;
      const ext = contentType.includes('pdf') ? 'pdf' : 'txt';
      link.download = `Civic_Resolve_Complaint_${id}_Report.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      setMsg({ text: 'Download failed. Please try again.', type: 'error' });
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!complaint) return null;

  const canUpdate   = user?.role === 'admin' || user?.role === 'department';
  const canFeedback = user?.role === 'citizen' && complaint.user_id === user?.id && complaint.status === 'Completed' && !complaint.feedbacks?.length;
  const canRespond  = user?.role === 'admin' || user?.role === 'department';
  const imageUrl    = complaint.image_url ? complaint.image_url
    : complaint.image_path ? (complaint.image_path.startsWith('https://') ? complaint.image_path : api.imageUrl(complaint.image_path)) : null;
  const mapUrl = complaint.latitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${complaint.longitude-.01},${complaint.latitude-.01},${complaint.longitude+.01},${complaint.latitude+.01}&layer=mapnik&marker=${complaint.latitude},${complaint.longitude}`
    : null;

  return (
    <div className="page fade-in" style={{ maxWidth:900 }}>
      {/* ── Sticky action bar — always visible below navbar ── */}
      <div className="detail-action-bar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
          ← {t('detail_back')}
        </button>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className="btn btn-secondary btn-sm detail-download-btn" onClick={handleDownloadReport}>
            📥 Download Report
          </button>
          <button className={`notif-btn ${notifEnabled?'notif-on':''}`} onClick={enableNotifications}>
            {notifEnabled ? '🔔 Notified' : '🔕 Notify Me'}
          </button>
        </div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom:16 }}>{msg.text}</div>}

      {/* Header */}
      <Section title={`📋 Complaint #${complaint.id}`}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
          <span className={`status-badge ${S_CLASS[complaint.status]}`}>{complaint.status}</span>
          <span className={`priority-badge ${P_CLASS[complaint.priority||'Medium']}`}>{complaint.priority}</span>
          <span className="category-badge">{complaint.category}</span>
          {complaint.ml_confidence > 0 && (
            <span style={{ fontSize:'.68rem', background:'var(--teal-pale)', color:'var(--teal)', padding:'3px 10px', borderRadius:'var(--r)', fontWeight:600 }}>
              🤖 AI {(complaint.ml_confidence*100).toFixed(0)}% confident
            </span>
          )}
        </div>
        <h2 style={{ fontFamily:'var(--serif)', color:'var(--teal)', fontSize:'1.3rem', marginBottom:10 }}>{complaint.title}</h2>
        <p style={{ color:'var(--ink-2)', lineHeight:1.7, marginBottom:16 }}>{complaint.description}</p>

        <ProgressTracker status={complaint.status} reopenedCount={complaint.reopened_count||0} />

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginTop:16 }}>
          {[
            { label:'Department', value: complaint.department_assigned || '—' },
            { label:'Reported By', value: complaint.user_name || '—' },
            { label:'Submitted (IST)', value: complaint.created_at_ist || complaint.created_at?.slice(0,16) || '—' },
            { label:'Last Updated (IST)', value: complaint.updated_at_ist || complaint.updated_at?.slice(0,16) || '—' },
            complaint.resolved_at_ist && { label:'Resolved At (IST)', value: complaint.resolved_at_ist },
          ].filter(Boolean).map(row => (
            <div key={row.label} style={{ background:'var(--ivory-2)', borderRadius:'var(--r)', padding:'10px 14px' }}>
              <div style={{ fontSize:'.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink-4)', marginBottom:3 }}>{row.label}</div>
              <div style={{ fontWeight:600, color:'var(--ink)', fontSize:'.88rem' }}>{row.value}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Image */}
      {imageUrl && (
        <Section title="📸 Complaint Photo">
          <img src={imageUrl} alt="Complaint" style={{ width:'100%', borderRadius:'var(--r-lg)', maxHeight:360, objectFit:'cover', border:'1px solid var(--border)' }} />
        </Section>
      )}

      {/* Location */}
      {(complaint.location_address || mapUrl) && (
        <Section title="📍 Location">
          {complaint.location_address && <p style={{ color:'var(--ink-2)', marginBottom: mapUrl?12:0 }}>{complaint.location_address}</p>}
          {mapUrl && <div className="map-container"><iframe title="map" src={mapUrl} width="100%" height="260" style={{ border:'none', display:'block' }} /></div>}
        </Section>
      )}

      {/* Department Responses — fully visible to citizen */}
      {complaint.dept_responses && complaint.dept_responses.length > 0 && (
        <Section title={`💬 Official Department Responses (${complaint.dept_responses.length})`}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {complaint.dept_responses.map((r, i) => (
              <div key={i} style={{
                background:'var(--cream)', border:'2px solid var(--teal-mist)',
                borderRadius:'var(--r-xl)', overflow:'hidden',
                boxShadow:'var(--sh-xs)'
              }}>
                {/* Response header */}
                <div style={{
                  background:'linear-gradient(90deg, var(--teal-3), var(--teal-2))',
                  padding:'10px 16px',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  flexWrap:'wrap', gap:8
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{
                      width:32, height:32, borderRadius:'50%', background:'var(--saffron)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontWeight:700, fontSize:'.85rem', flexShrink:0
                    }}>
                      {(r.responder_name||'D')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color:'#fff', fontWeight:700, fontSize:'.88rem' }}>{r.responder_name}</div>
                      <div style={{ color:'var(--saffron-light)', fontSize:'.68rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em' }}>{r.department}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ background:'var(--saffron)', color:'#fff', fontSize:'.6rem', fontWeight:700, padding:'2px 8px', borderRadius:'var(--r-pill)', textTransform:'uppercase', letterSpacing:'.1em' }}>
                      Official Response #{i+1}
                    </span>
                    <span style={{ color:'rgba(255,255,255,.6)', fontSize:'.7rem' }}>{r.created_at}</span>
                  </div>
                </div>

                {/* Response image — shown prominently if present */}
                {r.image_path && (
                  <div style={{ position:'relative', background:'var(--ivory-2)' }}>
                    <div style={{
                      position:'absolute', top:10, left:10, zIndex:1,
                      background:'var(--teal)', color:'#fff',
                      fontSize:'.62rem', fontWeight:700, padding:'3px 10px',
                      borderRadius:'var(--r-pill)', letterSpacing:'.08em',
                      textTransform:'uppercase'
                    }}>
                      📸 Resolution Photo
                    </div>
                    <img
                      src={api.imageUrl(r.image_path)}
                      alt={`Resolution photo from ${r.department}`}
                      style={{
                        width:'100%', display:'block',
                        maxHeight:340, objectFit:'cover',
                        cursor:'pointer'
                      }}
                      onClick={() => window.open(api.imageUrl(r.image_path), '_blank')}
                      onError={e => { e.target.parentElement.style.display='none'; }}
                    />
                    <div style={{ padding:'6px 14px', background:'var(--teal-pale)', borderTop:'1px solid var(--teal-mist)', fontSize:'.72rem', color:'var(--teal)', fontWeight:600 }}>
                      Click image to view full size · {r.department} · {r.created_at}
                    </div>
                  </div>
                )}

                {/* Response text message */}
                <div style={{ padding:'14px 18px' }}>
                  <div style={{ fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--ink-4)', marginBottom:8 }}>
                    Response Message
                  </div>
                  <p style={{ color:'var(--ink)', fontSize:'.92rem', margin:0, lineHeight:1.75, fontWeight:500 }}>
                    {r.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Send Response (dept/admin) */}
      {canRespond && (
        <Section title="📤 Send Response to Citizen">
          <div style={{ marginBottom:12 }}>
            <label className="form-label">Response Message</label>
            <textarea className="form-textarea" rows={4}
              placeholder="Write your official response about this complaint resolution…"
              value={respMsg} onChange={e => setRespMsg(e.target.value)} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label className="form-label">Attach Image (Optional)</label>
            <input type="file" accept="image/*" ref={respFileRef}
              onChange={e => setRespImage(e.target.files[0])}
              style={{ display:'block', fontSize:'.84rem', color:'var(--ink-3)' }} />
            {respImage && <div style={{ fontSize:'.78rem', color:'var(--success)', marginTop:4 }}>✅ {respImage.name}</div>}
          </div>
          <button className="btn btn-primary" onClick={handleSendResponse} disabled={sendingResp || !respMsg.trim()}>
            {sendingResp ? <><span className="spinner-sm" />Sending…</> : '📤 Send Official Response'}
          </button>
        </Section>
      )}

      {/* Status Update (dept/admin) */}
      {canUpdate && (
        <Section title={t('detail_update_status')}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
            {['Pending','In Progress','Completed','Reopened'].map(s => (
              <button key={s} onClick={() => setStatusUpdate(s)}
                className={`tab ${statusUpdate===s?'active':''}`}
                style={{ padding:'7px 16px', borderRadius:'var(--r)', fontSize:'.84rem' }}>
                {s}
              </button>
            ))}
          </div>
          <textarea className="form-textarea" rows={3} placeholder={t('detail_note_ph')} value={note} onChange={e => setNote(e.target.value)} style={{ marginBottom:12 }} />
          <button className="btn btn-primary" onClick={handleStatus} disabled={updating || statusUpdate === complaint.status}>
            {updating ? <><span className="spinner-sm" />{t('detail_updating')}</> : t('detail_update_btn')}
          </button>
        </Section>
      )}

      {/* Timeline */}
      {complaint.history?.length > 0 && (
        <Section title="📅 Timeline (IST)">
          <div className="timeline">
            {complaint.history.map((h, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <div className="timeline-action">
                    {h.change_type === 'created' ? '📋 Complaint Submitted' : h.change_type === 'response' ? '💬 Response Sent' : `🔄 Status: ${h.old_value} → ${h.new_value}`}
                  </div>
                  {h.note && <div className="timeline-detail">{h.note}</div>}
                  <div className="timeline-detail">by {h.changed_by}</div>
                  <div className="timeline-time">{h.created_at}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Citizen Feedback */}
      {canFeedback && (
        <Section title="⭐ Rate the Resolution">
          <p style={{ color:'var(--ink-3)', marginBottom:14, fontSize:'.88rem' }}>How satisfied are you with how this complaint was resolved?</p>
          <div className="star-rating" style={{ marginBottom:14 }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} className={`star ${feedback.rating>=n?'active':''}`}
                onClick={() => setFeedback({...feedback, rating:n})}>⭐</span>
            ))}
            {feedback.rating > 0 && <span style={{ marginLeft:8, fontSize:'.84rem', color:'var(--ink-3)' }}>{feedback.rating}/5</span>}
          </div>
          <textarea className="form-textarea" rows={3} placeholder="Share your experience (optional)…"
            value={feedback.comment} onChange={e => setFeedback({...feedback, comment:e.target.value})}
            style={{ marginBottom:12 }} />
          <button className="btn btn-primary" onClick={handleFeedback} disabled={submittingFb || !feedback.rating}>
            {submittingFb ? <><span className="spinner-sm" />Submitting…</> : '⭐ Submit Feedback'}
          </button>
        </Section>
      )}

      {/* Previous Feedbacks */}
      {complaint.feedbacks?.length > 0 && (
        <Section title="💬 Citizen Feedback Received">
          {complaint.feedbacks.map(f => (
            <div key={f.id} style={{ background:'var(--ivory-2)', borderRadius:'var(--r)', padding:12, marginBottom:8, border:'1px solid var(--border)' }}>
              <div style={{ marginBottom:6 }}>{'⭐'.repeat(f.rating)}{'☆'.repeat(5-f.rating)} <strong>{f.rating}/5</strong>
                <span style={{ marginLeft:10, fontSize:'.72rem', fontWeight:700, padding:'2px 8px', borderRadius:3,
                  background: f.sentiment==='positive'?'var(--success-pale)':f.sentiment==='negative'?'var(--danger-pale)':'var(--ivory-3)',
                  color:       f.sentiment==='positive'?'var(--success)':f.sentiment==='negative'?'var(--danger)':'var(--ink-3)' }}>
                  {f.sentiment}
                </span>
              </div>
              {f.comment && <p style={{ color:'var(--ink-3)', fontSize:'.85rem', margin:0 }}>{f.comment}</p>}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
