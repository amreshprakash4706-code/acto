/**
 * Atconiz API client — central fetch layer for the production backend.
 * All authenticated and public API calls should go through this module.
 */
(function (global) {
  'use strict';

  const BASE = ''; // same origin

  function getAccessToken() {
    try {
      return sessionStorage.getItem('atconiz_access_token') || null;
    } catch {
      return null;
    }
  }

  function setAccessToken(token) {
    try {
      if (token) sessionStorage.setItem('atconiz_access_token', token);
      else sessionStorage.removeItem('atconiz_access_token');
    } catch { /* ignore */ }
  }

  async function request(path, options = {}) {
    const headers = Object.assign(
      { 'Content-Type': 'application/json', Accept: 'application/json' },
      options.headers || {}
    );
    const token = getAccessToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    const res = await fetch(BASE + path, {
      ...options,
      headers,
      credentials: 'include',
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    });

    let payload = null;
    const text = await res.text();
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { success: false, error: { message: text || res.statusText } };
    }

    if (!res.ok) {
      const err = new Error(
        (payload && payload.error && payload.error.message) || res.statusText || 'Request failed'
      );
      err.status = res.status;
      err.code = payload?.error?.code || 'HTTP_ERROR';
      err.details = payload?.error?.details;
      throw err;
    }

    return payload;
  }

  const api = {
    getAccessToken,
    setAccessToken,

    // Auth
    register: (body) => request('/api/auth/register', { method: 'POST', body }),
    login: async (body) => {
      const data = await request('/api/auth/login', { method: 'POST', body });
      if (data?.data?.accessToken) setAccessToken(data.data.accessToken);
      return data;
    },
    logout: async () => {
      try {
        await request('/api/auth/logout', { method: 'POST', body: {} });
      } finally {
        setAccessToken(null);
      }
    },
    me: () => request('/api/auth/me'),
    refresh: async () => {
      const data = await request('/api/auth/refresh', { method: 'POST', body: {} });
      if (data?.data?.accessToken) setAccessToken(data.data.accessToken);
      return data;
    },

    // Properties
    listProperties: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') qs.set(k, v);
      });
      const q = qs.toString();
      return request('/api/properties' + (q ? '?' + q : ''));
    },
    getProperty: (id) => request('/api/properties/' + encodeURIComponent(id)),
    createProperty: (body) => request('/api/properties', { method: 'POST', body }),
    updateProperty: (id, body) =>
      request('/api/properties/' + encodeURIComponent(id), { method: 'PATCH', body }),
    deleteProperty: (id) =>
      request('/api/properties/' + encodeURIComponent(id), { method: 'DELETE' }),

    // Favorites
    listFavorites: () => request('/api/favorites'),
    addFavorite: (propertyId) =>
      request('/api/favorites', { method: 'POST', body: { propertyId } }),
    removeFavorite: (propertyId) =>
      request('/api/favorites/' + encodeURIComponent(propertyId), { method: 'DELETE' }),

    // Reviews
    listReviews: (propertyId) =>
      request('/api/reviews/property/' + encodeURIComponent(propertyId)),
    createReview: (body) => request('/api/reviews', { method: 'POST', body }),

    // Viewings
    listViewings: () => request('/api/viewings'),
    createViewing: (body) => request('/api/viewings', { method: 'POST', body }),
    updateViewing: (id, body) =>
      request('/api/viewings/' + encodeURIComponent(id), { method: 'PATCH', body }),

    // Contact
    createContact: (body) =>
      request('/api/contact-requests', { method: 'POST', body }),

    // AI
    chat: (body) => request('/api/ai/chat', { method: 'POST', body }),

    // Dashboards
    userDashboard: () => request('/api/dashboard/user'),
    agentDashboard: () => request('/api/dashboard/agent'),
    adminDashboard: () => request('/api/dashboard/admin'),

    // Health
    health: () => request('/api/health'),
    ready: () => request('/api/ready'),
  };

  global.AtconizAPI = api;
})(typeof window !== 'undefined' ? window : globalThis);
