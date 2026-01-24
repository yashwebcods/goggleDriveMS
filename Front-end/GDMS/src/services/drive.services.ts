import { toast } from '../utils/toast';
import { getFriendlyRequestMessages } from '../utils/friendlyRequestMessage';

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
  const method = (options.method || 'GET').toString().toUpperCase();
  const labels = getFriendlyRequestMessages(method, path);

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
    const rawMessage = String(err?.message || err);
    toast.error(labels.error);
    return {
      success: false,
      status: 0,
      message:
        `Failed to reach API server. Check that your backend is running and that VITE_API_BASE_URL is correct. (${rawMessage})`,
      data: null as any,
      raw: rawMessage,
    };
  }

  const raw = await res.text();
  const json = safeParseJson(raw);

  if (!res.ok) {
    const rawSnippet = raw ? raw.slice(0, 200) : '';
    const errMsg =
      json?.message ||
      (rawSnippet
        ? `Request failed (HTTP ${res.status}): ${rawSnippet}`
        : `Request failed (HTTP ${res.status})`);
    toast.error(json?.message || errMsg || labels.error);
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
    toast.error(labels.error);
    return {
      success: false,
      status: res.status,
      message: `Unexpected server response (HTTP ${res.status})`,
      data: null as any,
      raw,
    };
  }

  const successFlag = Boolean(json?.success ?? true);
  if (!successFlag) {
    toast.error(json?.message || labels.error);
  } else if (method !== 'GET') {
    toast.success(json?.message || labels.success);
  }

  return {
    success: successFlag,
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
  const labels = getFriendlyRequestMessages('POST', path);

  try {
    res = await fetch(buildUrl(path), {
      method: 'POST',
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: formData,
    });
  } catch (err: any) {
    const rawMessage = String(err?.message || err);
    toast.error(labels.error);
    return {
      success: false,
      status: 0,
      message:
        `Failed to reach API server. Check that your backend is running and that VITE_API_BASE_URL is correct. (${rawMessage})`,
      data: null as any,
      raw: rawMessage,
    };
  }

  const raw = await res.text();
  const json = safeParseJson(raw);

  if (!res.ok) {
    const rawSnippet = raw ? raw.slice(0, 200) : '';
    const errMsg =
      json?.message ||
      (rawSnippet
        ? `Request failed (HTTP ${res.status}): ${rawSnippet}`
        : `Request failed (HTTP ${res.status})`);
    toast.error(json?.message || errMsg || labels.error);
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
    toast.error(labels.error);
    return {
      success: false,
      status: res.status,
      message: `Unexpected server response (HTTP ${res.status})`,
      data: null as any,
      raw,
    };
  }

  const successFlag = Boolean(json?.success ?? true);
  if (!successFlag) {
    toast.error(json?.message || labels.error);
  } else {
    toast.success(json?.message || labels.success);
  }

  return {
    success: successFlag,
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

  disconnect: (token: string) =>
    requestJson<{ disconnected: boolean }>('/api/drive/disconnect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  status: (token: string) =>
    requestJson<{ connected: boolean }>('/api/drive/status', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),

  listFiles: (token: string, parentId?: string, pageSize?: number, scope?: string, gdmsOnly?: boolean) => {
    const params = new URLSearchParams();
    if (parentId) params.set('parentId', parentId);
    if (pageSize) params.set('pageSize', String(pageSize));
    if (scope) params.set('scope', scope);
    if (gdmsOnly) params.set('gdmsOnly', 'true');
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
    requestJson<any>(`/api/drive/files/${encodeURIComponent(fileId)}/rename`, {
      method: 'POST',
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

  shareToUser: (token: string, fileId: string, targetUserId: string, role: 'reader' | 'commenter' | 'writer') =>
    requestJson<any>(`/api/drive/files/${encodeURIComponent(fileId)}/share`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUserId, role }),
    }),

  listPermissions: (token: string, fileId: string) =>
    requestJson<{ permissions: any[] }>(`/api/drive/files/${encodeURIComponent(fileId)}/permissions`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),

  removePermission: (token: string, fileId: string, permissionId: string) =>
    requestJson<any>(
      `/api/drive/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permissionId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    ),

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
