import React, { createContext, useContext, useState, useEffect } from 'react';

const PointsContext = createContext();

export const BADGES = [
  { id: 'first_report',   icon: '🌱', label: 'First Reporter',   desc: 'Submit your first complaint',      points: 0,   condition: (p, c) => c >= 1 },
  { id: 'active_citizen', icon: '⭐', label: 'Active Citizen',   desc: 'Submit 5 complaints',              points: 50,  condition: (p, c) => c >= 5 },
  { id: 'civic_hero',     icon: '🏆', label: 'Civic Hero',       desc: 'Submit 10 complaints',             points: 100, condition: (p, c) => c >= 10 },
  { id: 'point_100',      icon: '💯', label: 'Century Scorer',   desc: 'Earn 100 points',                  points: 100, condition: (p) => p >= 100 },
  { id: 'point_500',      icon: '🚀', label: 'Change Maker',     desc: 'Earn 500 points',                  points: 500, condition: (p) => p >= 500 },
  { id: 'sos_reporter',   icon: '🆘', label: 'Emergency Ranger', desc: 'Report an emergency complaint',    points: 0,   condition: (p, c, e) => e >= 1 },
];

export function PointsProvider({ children }) {
  const [points, setPoints]       = useState(() => parseInt(localStorage.getItem('points') || '0'));
  const [totalComplaints, setTC]  = useState(() => parseInt(localStorage.getItem('totalComplaints') || '0'));
  const [emergencies, setEmerg]   = useState(() => parseInt(localStorage.getItem('emergencies') || '0'));
  const [newBadge, setNewBadge]   = useState(null);

  useEffect(() => { localStorage.setItem('points', points); }, [points]);
  useEffect(() => { localStorage.setItem('totalComplaints', totalComplaints); }, [totalComplaints]);
  useEffect(() => { localStorage.setItem('emergencies', emergencies); }, [emergencies]);

  const earnPoints = (amt, isEmergency = false) => {
    const prevPoints = points;
    const prevComplaints = totalComplaints;
    const prevEmerg = emergencies;
    const newPoints = prevPoints + amt;
    const newComplaints = prevComplaints + 1;
    const newEmerg = isEmergency ? prevEmerg + 1 : prevEmerg;
    setPoints(newPoints);
    setTC(newComplaints);
    if (isEmergency) setEmerg(newEmerg);
    // Check for new badges
    const earned = BADGES.filter(b => {
      const wasBefore = b.condition(prevPoints, prevComplaints, prevEmerg);
      const isNow = b.condition(newPoints, newComplaints, newEmerg);
      return !wasBefore && isNow;
    });
    if (earned.length > 0) setNewBadge(earned[0]);
  };

  const unlockedBadges = BADGES.filter(b => b.condition(points, totalComplaints, emergencies));
  const clearNewBadge = () => setNewBadge(null);

  return (
    <PointsContext.Provider value={{ points, totalComplaints, emergencies, earnPoints, unlockedBadges, newBadge, clearNewBadge }}>
      {children}
    </PointsContext.Provider>
  );
}

export const usePoints = () => useContext(PointsContext);
