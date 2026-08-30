import React, { createContext, useContext, useState, useEffect } from 'react';

const OfflineContext = createContext();

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem('offlineQueue') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    localStorage.setItem('offlineQueue', JSON.stringify(queue));
  }, [queue]);

  const addToQueue = (complaint) => {
    const item = { ...complaint, id: Date.now(), savedAt: new Date().toISOString() };
    setQueue(q => [...q, item]);
    return item;
  };

  const removeFromQueue = (id) => setQueue(q => q.filter(item => item.id !== id));

  return (
    <OfflineContext.Provider value={{ isOnline, queue, addToQueue, removeFromQueue }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);
