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

const requestJson = async <TData = any>(
  path: string,
  options: RequestInit = {}
): Promise<ServiceResult<TData>> => {
  let res: Response;

  try {
    res = await fetch(buildUrl(path), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body,
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

const requestForm = async <TData = any>(
  path: string,
  formData: FormData,
  options: { token?: string } = {}
): Promise<ServiceResult<TData>> => {
  let res: Response;

  try {
    res = await fetch(buildUrl(path), {
      method: 'POST',
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: formData,
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

const parseFilenameFromContentDisposition = (value: string | null): string | null => {
  if (!value) return null;
  const match = /filename\*?=(?:UTF-8''|\")?([^;\"]+)/i.exec(value);
  const raw = match?.[1]?.trim();
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/^"|"$/g, ''));
  } catch {
    return raw.replace(/^"|"$/g, '');
  }
};

export const driveService = {
  getAuthUrl: (token: string) =>
    requestJson<{ url: string }>('/api/drive/auth-url', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),

  status: (token: string) =>
    requestJson<{ connected: boolean }>('/api/drive/status', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),

  listFiles: (token: string, parentId?: string, pageSize?: number) => {
    const params = new URLSearchParams();
    if (parentId) params.set('parentId', parentId);
    if (pageSize) params.set('pageSize', String(pageSize));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return requestJson<any>(`/api/drive/files${qs}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  createFolder: (token: string, name: string, parentId?: string) =>
    requestJson<any>('/api/drive/folders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, parentId }),
    }),

  uploadFile: (token: string, file: File | File[], parentId?: string) => {
    const formData = new FormData();
    const files = Array.isArray(file) ? file : [file];
    for (const f of files) {
      formData.append('file', f);
    }
    if (parentId) formData.append('parentId', parentId);
    return requestForm<any>('/api/drive/upload', formData, { token });
  },

  rename: (token: string, fileId: string, name: string) =>
    requestJson<any>(`/api/drive/files/${encodeURIComponent(fileId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    }),

  delete: (token: string, fileId: string) =>
    requestJson<any>(`/api/drive/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  share: (token: string, fileId: string, email?: string) =>
    requestJson<any>(`/api/drive/files/${encodeURIComponent(fileId)}/share`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email }),
    }),

  downloadFile: async (token: string, fileId: string) => {
    const res = await fetch(buildUrl(`/api/drive/download/${encodeURIComponent(fileId)}`), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const raw = await res.text();
      throw new Error(raw || `Download failed (HTTP ${res.status})`);
    }

    const blob = await res.blob();
    const filename =
      parseFilenameFromContentDisposition(res.headers.get('content-disposition')) ||
      `file-${fileId}`;

    return { blob, filename };
  },
};
