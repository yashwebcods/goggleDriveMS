const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const buildUrl = (path) => `${API_BASE_URL}${path}`;

const safeParseJson = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const request = async (path, options = {}) => {
  let res;
  try {
    const { headers: optionHeaders, ...restOptions } = options;
    res = await fetch(buildUrl(path), {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(optionHeaders || {}),
      },
    });
  } catch (err) {
    return {
      success: false,
      status: 0,
      message:
        'Failed to reach API server. Check that your backend is running and that VITE_API_BASE_URL / VITE_API_PROXY_TARGET point to the correct host/port.',
      data: null,
      raw: String(err?.message || err),
    };
  }

  const raw = await res.text();
  const json = safeParseJson(raw);

  if (!res.ok) {
    const rawSnippet = raw ? raw.slice(0, 200) : '';
    return {
      success: false,
      status: res.status,
      message: json?.message || (rawSnippet ? `Request failed (HTTP ${res.status}): ${rawSnippet}` : `Request failed (HTTP ${res.status})`),
      data: json?.data,
      raw,
    };
  }

  if (json === null) {
    return {
      success: false,
      status: res.status,
      message: `Unexpected server response (HTTP ${res.status})`,
      data: null,
      raw,
    };
  }

  return {
    success: Boolean(json?.success ?? true),
    status: res.status,
    message: json?.message,
    data: json?.data,
    raw,
  };
};

export const userService = {
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (payload) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  profile: (token) =>
    request('/api/auth/profile', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  sendOtp: (email) =>
    request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyOtp: (email, otp) =>
    request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  resetPassword: (email, newPassword, confirmPassword) =>
    request('/api/auth/forget-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        newPassword,
        ConfirmPassword: confirmPassword,
      }),
    }),

  createMember: (token, payload) =>
    request('/api/auth/members', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({
        ...payload,
        username: (payload?.username ?? '').toString().trim(),
        email: (payload?.email ?? '').toString().trim().toLowerCase(),
        password: (payload?.password ?? '').toString(),
        role: (payload?.role ?? '').toString(),
      }),
    }),

  getTeamOverview: (token) =>
    request('/api/auth/team', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  getAdminSummary: (token) =>
    request('/api/auth/admin/summary', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
};
