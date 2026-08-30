import React, { useEffect } from 'react';
import { usePoints } from '../context/PointsContext';

export default function BadgeToast() {
  const { newBadge, clearNewBadge } = usePoints();

  useEffect(() => {
    if (newBadge) {
      const t = setTimeout(clearNewBadge, 4000);
      return () => clearTimeout(t);
    }
  }, [newBadge]);

  if (!newBadge) return null;

  return (
    <div className="badge-toast">
      <div className="badge-toast-icon">{newBadge.icon}</div>
      <div>
        <div className="badge-toast-title">Badge Unlocked!</div>
        <div className="badge-toast-label">{newBadge.label}</div>
        <div className="badge-toast-desc">{newBadge.desc}</div>
      </div>
      <button className="badge-toast-close" onClick={clearNewBadge}>✕</button>
    </div>
  );
}
