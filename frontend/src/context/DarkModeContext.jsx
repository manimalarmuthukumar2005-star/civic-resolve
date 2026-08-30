import React, { createContext, useContext, useState, useEffect } from 'react';
const DarkModeContext = createContext();
export function DarkModeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('darkMode', dark);
  }, [dark]);
  const toggleDark = () => setDark(d => !d);
  return <DarkModeContext.Provider value={{ dark, toggleDark }}>{children}</DarkModeContext.Provider>;
}
export const useDark = () => useContext(DarkModeContext);
