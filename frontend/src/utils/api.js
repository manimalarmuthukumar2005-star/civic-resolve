// BASE_URL:
//   Development (Vite): proxied via vite.config.js  → /api → http://localhost:5000/api
//   Production:         set VITE_API_URL env var     → https://your-backend.onrender.com/api
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
  async get(path, token) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let msg = 'Request failed';
      try { const d = await res.json(); msg = d.error || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },

  async post(path, body, token) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = 'Request failed';
      try { const d = await res.json(); msg = d.error || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },

  async postForm(path, formData, token) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      let msg = 'Request failed';
      try { const d = await res.json(); msg = d.error || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },

  async patch(path, body, token) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = 'Request failed';
      try { const d = await res.json(); msg = d.error || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },

  imageUrl(path) {
    if (!path) return null;
    const base = (import.meta.env.VITE_API_URL || '').replace('/api', '');
    return `${base}/api/complaints/uploads/${path}`;
  },

  async downloadBlob(path, token) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Download failed');
    return res;
  }
};
