import React from 'react';
import { useOffline } from '../context/OfflineContext';

export default function OfflineBanner() {
  const { isOnline, queue } = useOffline();
  if (isOnline && queue.length === 0) return null;
  return (
    <div className={`offline-banner ${isOnline ? 'offline-banner-sync' : ''}`}>
      {isOnline
        ? `📶 Back online! ${queue.length} complaint${queue.length > 1 ? 's' : ''} will sync shortly.`
        : `📴 You're offline. Complaints will be saved and sent when you reconnect.`}
    </div>
  );
}
