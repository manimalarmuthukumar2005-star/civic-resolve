import React, { useRef, useEffect, useState } from 'react';

export default function WebcamCapture({ onCapture, onClose }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const [ready, setReady]     = useState(false);
  const [error, setError]     = useState('');
  const [captured, setCaptured] = useState(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; setReady(true); }
      })
      .catch(() => setError('Camera access denied. Please allow camera permission in your browser.'));
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const capture = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCaptured(dataUrl);
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const retake = () => {
    setCaptured(null);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => { streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; });
  };

  const confirm = () => {
    if (!captured) return;
    // Convert dataURL to File
    fetch(captured).then(r => r.blob()).then(blob => {
      const file = new File([blob], `webcam_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file, captured);
    });
  };

  return (
    <div className="webcam-overlay">
      <div className="webcam-modal">
        <div className="webcam-header">
          <span>📷 Live Camera</span>
          <button className="webcam-close" onClick={onClose}>✕</button>
        </div>

        {error ? (
          <div className="webcam-error">
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>📷</div>
            <div>{error}</div>
            <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="webcam-preview">
              {!captured ? (
                <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
              ) : (
                <img src={captured} alt="Captured" className="webcam-video" />
              )}
              {!ready && !error && (
                <div className="webcam-loading">
                  <div className="spinner" />
                  <div style={{ marginTop: 10, color: '#fff' }}>Starting camera…</div>
                </div>
              )}
              {/* Viewfinder corners */}
              <div className="vf-tl" /><div className="vf-tr" />
              <div className="vf-bl" /><div className="vf-br" />
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="webcam-actions">
              {!captured ? (
                <>
                  <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button className="webcam-shutter" onClick={capture} disabled={!ready}>
                    <span className="shutter-inner" />
                  </button>
                  <div style={{ width: 80 }} />
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={retake}>🔄 Retake</button>
                  <button className="btn btn-primary" onClick={confirm}>✅ Use Photo</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
