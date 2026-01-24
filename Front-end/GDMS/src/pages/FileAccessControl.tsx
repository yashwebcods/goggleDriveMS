import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import TopHeader from '../components/dashboard/TopHeader';
import { driveService } from '../services/drive.services';
import { usersService, type DbUser } from '../services/users.services';

const safeParseJson = (value: string | null): any | null => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

type DriveItem = {
  id: string;
  name?: string;
  mimeType?: string;
  source?: 'gdms' | 'shared';
};

type DrivePermission = {
  id: string;
  type?: string;
  role?: string;
  emailAddress?: string;
  displayName?: string;
  domain?: string;
};

const FileAccessControl = () => {
  const navigate = useNavigate();

  const token = localStorage.getItem('token') || '';
  const user = useMemo(() => safeParseJson(localStorage.getItem('user')), []);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const [dbUsers, setDbUsers] = useState<DbUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'reader' | 'commenter' | 'writer'>('reader');

  const [permissions, setPermissions] = useState<DrivePermission[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [isRefreshingPermissions, setIsRefreshingPermissions] = useState(false);

  const ensureAuth = () => {
    if (!token) {
      navigate('/login', { replace: true });
      return false;
    }
    return true;
  };

  const loadUsers = async () => {
    if (!ensureAuth()) return;
    const result = await usersService.list(token);
    if (!result?.success) {
      if (result?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
        return;
      }
      setError(result?.message || 'Failed to load users');
      return;
    }
    setDbUsers((result?.data?.users || []) as DbUser[]);
  };

  const loadDriveItems = async () => {
    if (!ensureAuth()) return;
    const fetchAll = async (opts: { scope?: string; gdmsOnly?: boolean; max: number }) => {
      const all: DriveItem[] = [];
      let pageToken: string | undefined = undefined;
      while (true) {
        const res = await driveService.listFiles(token, undefined, 1000, opts.scope, opts.gdmsOnly, pageToken);
        if (!res?.success) return { ok: false as const, res };
        const batch = (((res?.data as any)?.files || []) as DriveItem[]) || [];
        all.push(...batch);
        if (all.length >= opts.max) return { ok: true as const, files: all.slice(0, opts.max) };
        const next = ((res?.data as any)?.nextPageToken || null) as string | null;
        if (!next) break;
        pageToken = String(next);
      }
      return { ok: true as const, files: all };
    };

    const gdms = await fetchAll({ gdmsOnly: true, max: 5000 });
    if (!gdms.ok) {
      if ((gdms as any)?.res?.status === 401) {
        setError((gdms as any)?.res?.message || 'Google Drive permissions are outdated. Please reconnect Google Drive.');
        return;
      }
      setError((gdms as any)?.res?.message || 'Failed to load Drive files');
      return;
    }

    const shared = await fetchAll({ scope: 'sharedWithMe', gdmsOnly: false, max: 5000 });
    if (!shared.ok) {
      if ((shared as any)?.res?.status === 401) {
        setError((shared as any)?.res?.message || 'Google Drive permissions are outdated. Please reconnect Google Drive.');
        return;
      }
      setError((shared as any)?.res?.message || 'Failed to load shared files');
      return;
    }

    const merged = new Map<string, DriveItem>();
    for (const f of gdms.files) {
      if (!f?.id) continue;
      merged.set(String(f.id), { ...f, source: 'gdms' });
    }
    for (const f of shared.files) {
      if (!f?.id) continue;
      if (!merged.has(String(f.id))) {
        merged.set(String(f.id), { ...f, source: 'shared' });
      }
    }

    setDriveItems(Array.from(merged.values()));
  };

  const loadPermissions = async (fileId: string) => {
    if (!ensureAuth()) return;
    if (!fileId) return;

    try {
      setIsRefreshingPermissions(true);
      const result = await driveService.listPermissions(token, fileId);
      if (!result?.success) {
        if (result?.status === 401) {
          setError(result?.message || 'Google Drive permissions are outdated. Please reconnect Google Drive.');
          return;
        }
        setError(result?.message || 'Failed to load permissions');
        return;
      }
      setPermissions(((result?.data as any)?.permissions || []) as DrivePermission[]);
    } finally {
      setIsRefreshingPermissions(false);
    }
  };

  const shareToSelectedUser = async () => {
    if (!ensureAuth()) return;
    if (!selectedFileId) {
      setError('Please select a file or folder');
      return;
    }
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    setIsSharing(true);
    setError('');
    setMessage('');

    const result = await driveService.shareToUser(token, selectedFileId, selectedUserId, selectedRole);
    setIsSharing(false);

    if (!result?.success) {
      if (result?.status === 401) {
        setError(result?.message || 'Google Drive permissions are outdated. Please reconnect Google Drive.');
        return;
      }
      setError(result?.message || 'Failed to share');
      return;
    }

    setMessage('Shared successfully');
    await loadPermissions(selectedFileId);
  };

  const unsharePermission = async (permissionId: string) => {
    if (!ensureAuth()) return;
    if (!selectedFileId) return;

    setError('');
    setMessage('');

    const result = await driveService.removePermission(token, selectedFileId, permissionId);
    if (!result?.success) {
      if (result?.status === 401) {
        setError(result?.message || 'Google Drive permissions are outdated. Please reconnect Google Drive.');
        return;
      }
      setError(result?.message || 'Failed to unshare');
      return;
    }

    setMessage('Access removed');
    await loadPermissions(selectedFileId);
  };

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError('');
      setMessage('');
      await loadUsers();
      await loadDriveItems();
      setIsLoading(false);
    };

    run();
  }, [navigate]);

  const selectedUsersById = useMemo(() => {
    const map = new Map<string, DbUser>();
    for (const u of dbUsers) map.set(u._id, u);
    return map;
  }, [dbUsers]);

  const permissionRows = useMemo(() => {
    return (permissions || []).map((p) => {
      const email = (p.emailAddress || '').toLowerCase();
      const matchingDbUser = dbUsers.find((u) => (u.email || '').toLowerCase() === email);
      return { ...p, matchingDbUser } as any;
    });
  }, [permissions, dbUsers]);

  return (
    <div className="h-screen bg-[#F6F8FB] text-gray-900 flex flex-col overflow-hidden">
      <TopHeader
        user={user}
        onLogout={() => {
          navigate('/login', { replace: true });
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 pt-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <div className="text-lg font-semibold text-gray-900">File Access Control</div>
                <div className="text-xs text-gray-600 mt-1">Share / Unshare your Google Drive files and folders with users from your database.</div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setError('');
                  setMessage('');
                  await loadUsers();
                  await loadDriveItems();
                  if (selectedFileId) await loadPermissions(selectedFileId);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>

            {isLoading ? <div className="text-sm text-gray-600">Loading...</div> : null}

            {error ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            ) : null}

            {message ? (
              <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-xs font-semibold text-gray-600">Select file / folder</div>
                <div className="mt-2">
                  <select
                    value={selectedFileId}
                    onChange={async (e) => {
                      const id = e.target.value;
                      setSelectedFileId(id);
                      const item = driveItems.find((x) => x.id === id);
                      setSelectedFileName(item?.name || id);
                      setPermissions([]);
                      setError('');
                      setMessage('');
                      if (id) await loadPermissions(id);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">-- Select --</option>
                    {driveItems.map((f) => (
                      <option key={f.id} value={f.id}>
                        {(f.name || f.id)
                          + (f.mimeType === 'application/vnd.google-apps.folder' ? ' (folder)' : '')
                          + (f.source === 'shared' ? ' (shared)' : '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 text-xs text-gray-600">Selected: {selectedFileName || '—'}</div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-xs font-semibold text-gray-600">Share with DB user</div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setError('');
                      setMessage('');
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">-- Select user --</option>
                    {dbUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {(u.username ? `${u.username} - ` : '') + u.email}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value as any);
                      setError('');
                      setMessage('');
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="reader">reader</option>
                    <option value="commenter">commenter</option>
                    <option value="writer">writer</option>
                  </select>

                  <button
                    type="button"
                    onClick={shareToSelectedUser}
                    disabled={isSharing || !selectedFileId || !selectedUserId}
                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
                  >
                    {isSharing ? 'Sharing...' : 'Share'}
                  </button>

                  {selectedUserId ? (
                    <div className="text-xs text-gray-600">
                      User: {selectedUsersById.get(selectedUserId)?.email || '—'}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-600">Current permissions</div>
                <div className="text-xs text-gray-500">
                  {isRefreshingPermissions ? 'Refreshing...' : permissions.length ? `${permissions.length}` : '—'}
                </div>
              </div>

              {!selectedFileId ? (
                <div className="mt-3 text-sm text-gray-600">Select a file/folder to view its access list.</div>
              ) : permissions.length ? (
                <div className="mt-3 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                  <div className="grid grid-cols-12 px-4 py-3 text-[11px] text-gray-500">
                    <div className="col-span-4">User</div>
                    <div className="col-span-3">Email</div>
                    <div className="col-span-2">Role</div>
                    <div className="col-span-1">Type</div>
                    <div className="col-span-2 text-right">Action</div>
                  </div>
                  <div className="h-px bg-gray-100" />

                  {permissionRows.map((p: any) => (
                    <div key={p.id} className="grid grid-cols-12 px-4 py-3 text-sm items-center border-t border-gray-50 bg-white">
                      <div className="col-span-4 min-w-0">
                        <div className="truncate text-gray-800">{p.displayName || p.matchingDbUser?.username || '—'}</div>
                        {p.matchingDbUser?.role ? (
                          <div className="text-xs text-gray-500 truncate">DB role: {p.matchingDbUser.role}</div>
                        ) : null}
                      </div>
                      <div className="col-span-3 min-w-0">
                        <div className="truncate text-xs text-gray-600">{p.emailAddress || p.domain || '—'}</div>
                      </div>
                      <div className="col-span-2 text-xs text-gray-600">{p.role || '—'}</div>
                      <div className="col-span-1 text-xs text-gray-600">{p.type || '—'}</div>
                      <div className="col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => unsharePermission(p.id)}
                          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-600">No permissions found (or you don’t have access to view them).</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileAccessControl;
