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

const request = async <TData = any>(path: string, options: RequestInit = {}): Promise<ServiceResult<TData>> => {
  let res: Response;

  try {
    res = await fetch(buildUrl(path), {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
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
    return {
      success: false,
      status: res.status,
      message:
        json?.message ||
        (rawSnippet ? `Request failed (HTTP ${res.status}): ${rawSnippet}` : `Request failed (HTTP ${res.status})`),
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

export type DbUser = {
  _id: string;
  username?: string;
  email: string;
  role?: string;
  isActive?: boolean;
};

export const usersService = {
  list: (token: string, includeSelf?: boolean) => {
    const qs = includeSelf ? '?includeSelf=true' : '';
    return request<{ users: DbUser[] }>(`/api/users${qs}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
