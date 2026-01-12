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
  const res = await fetch(buildUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

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
};
