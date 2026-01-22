export type ServiceResult<TData = any> = {
  success: boolean;
  status: number;
  message?: string;
  data?: TData;
  raw?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

const safeParseJson = (text: string): any | null => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const request = async <TData = any>(
  path: string,
  options: RequestInit = {}
): Promise<ServiceResult<TData>> => {
  let res: Response;

  try {
    const mergedHeaders = new Headers(options.headers || undefined);
    if (!mergedHeaders.has('Content-Type')) {
      mergedHeaders.set('Content-Type', 'application/json');
    }

    res = await fetch(buildUrl(path), {
      ...options,
      headers: mergedHeaders,
    });
  } catch (err: any) {
    return {
      success: false,
      status: 0,
      message:
        'Failed to reach API server. Check that your backend is running and that VITE_API_BASE_URL is correct.',
      data: null as any,
      raw: String(err?.message || err),
    };
  }

  const raw = await res.text();
  const json = safeParseJson(raw);

  if (!res.ok) {
    const rawSnippet = raw ? raw.slice(0, 200) : '';
    const extraError = json?.error ? ` (${String(json.error).slice(0, 200)})` : '';
    return {
      success: false,
      status: res.status,
      message:
        (json?.message ? `${json.message}${extraError}` : undefined) ||
        (rawSnippet
          ? `Request failed (HTTP ${res.status}): ${rawSnippet}`
          : `Request failed (HTTP ${res.status})`),
      data: json?.data,
      raw,
    };
  }

  if (json === null) {
    return {
      success: false,
      status: res.status,
      message: `Unexpected server response (HTTP ${res.status})`,
      data: null as any,
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
  login: (email: string, password: string) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    }),

  googleLogin: (idToken: string) =>
    request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        idToken,
      }),
    }),

  register: (payload: any) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        username: (payload?.username ?? '').toString().trim(),
        email: (payload?.email ?? '').toString().trim().toLowerCase(),
        password: (payload?.password ?? '').toString(),
      }),
    }),

  createMember: (token: string, payload: any) =>
    request('/api/auth/members', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({
        ...payload,
        username: (payload?.username ?? '').toString().trim(),
        email: (payload?.email ?? '').toString().trim().toLowerCase(),
        password: (payload?.password ?? '').toString(),
      }),
    }),

  profile: (token?: string) =>
    request('/api/auth/profile', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  sendOtp: (email: string) =>
    request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyOtp: (email: string, otp: string) =>
    request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  resetPassword: (
    email: string,
    newPassword: string,
    confirmPassword: string
  ) =>
    request('/api/auth/forget-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        newPassword,
        ConfirmPassword: confirmPassword,
      }),
    }),

  getAdminSummary: async (token: string) => {
    return request(`/api/auth/admin/summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getTeamOverview: async (token: string) => {
    return request(`/api/auth/team`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  assignClientManager: async (
    token: string,
    clientId: string,
    payload: { managerId?: string; managerEmail?: string }
  ) => {
    return request(`/api/auth/clients/${encodeURIComponent(clientId)}/manager`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload || {}),
    });
  },

  assignAdminSuperAdmin: async (
    token: string,
    adminId: string,
    payload: { superadminId?: string; superadminEmail?: string }
  ) => {
    return request(`/api/auth/admins/${encodeURIComponent(adminId)}/superadmin`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload || {}),
    });
  },

  assignManagerAdmin: async (
    token: string,
    managerId: string,
    payload: { adminId?: string; adminEmail?: string }
  ) => {
    return request(`/api/auth/managers/${encodeURIComponent(managerId)}/admin`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload || {}),
    });
  },
};
