// API helper for Turf Tracker

const API_BASE = '/api';

export function getStoredToken() {
  return localStorage.getItem('turf_access_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('turf_access_token', token);
  } else {
    localStorage.removeItem('turf_access_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || data.message || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth
  login: async (email, password) => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.access_token) {
      setStoredToken(res.access_token);
    }
    return res;
  },

  signup: async (name, email, password) => {
    return request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  getMe: async () => {
    return request('/auth/me');
  },

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  // Sessions
  getSessions: async () => {
    return request('/sessions');
  },

  createSession: async (sessionData) => {
    return request('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  // Payments (User)
  getPaymentConfig: async () => {
    return request('/payments/config');
  },

  getMyPaymentStatus: async () => {
    return request('/payments/my-status');
  },

  uploadScreenshot: async (file) => {
    const token = getStoredToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/payments/upload-screenshot', {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to upload screenshot');
    }
    return data;
  },

  submitPayment: async ({ weeks_count, upi_ref, screenshot_url }) => {
    return request('/payments/submit', {
      method: 'POST',
      body: JSON.stringify({ weeks_count, upi_ref, screenshot_url }),
    });
  },

  rsvpSession: async (sessionId, attending) => {
    return request(`/payments/session/${sessionId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ attending }),
    });
  },

  updateSessionFee: async (sessionId, costPerPerson) => {
    return request(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ cost_per_person: Number(costPerPerson) }),
    });
  },

  // Admin
  getAdminOverview: async () => {
    return request('/admin/overview');
  },

  getSessionRoster: async (sessionId) => {
    return request(`/admin/session/${sessionId}/roster`);
  },

  confirmPayment: async (paymentId) => {
    return request(`/admin/payments/${paymentId}/confirm`, {
      method: 'POST',
    });
  },

  rejectPayment: async (paymentId) => {
    return request(`/admin/payments/${paymentId}/reject`, {
      method: 'POST',
    });
  },

  manualPay: async ({ user_id, session_id, amount, payment_method }) => {
    return request('/admin/manual-pay', {
      method: 'POST',
      body: JSON.stringify({ user_id, session_id, amount, payment_method }),
    });
  },

  updateSessionSquad: async (sessionId, playerIds) => {
    return request(`/admin/session/${sessionId}/squad`, {
      method: 'POST',
      body: JSON.stringify({ player_ids: playerIds }),
    });
  },

  removePlayerFromSquad: async (sessionId, userId) => {
    return request(`/admin/session/${sessionId}/remove-player/${userId}`, {
      method: 'POST',
    });
  },

  updatePaymentAmount: async (paymentId, { amount_paid, note, status }) => {
    return request(`/admin/payments/${paymentId}/update-amount`, {
      method: 'POST',
      body: JSON.stringify({ amount_paid, note, status }),
    });
  },

  clearBalance: async (paymentId) => {
    return request(`/admin/payments/${paymentId}/clear-balance`, {
      method: 'POST',
    });
  },

  createPlayerWithoutEmail: async ({ name, phone, role, add_to_current_squad, session_id }) => {
    return request('/admin/users/create', {
      method: 'POST',
      body: JSON.stringify({ name, phone, role, add_to_current_squad, session_id }),
    });
  },

  deleteUser: async (userId) => {
    return request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },
};

