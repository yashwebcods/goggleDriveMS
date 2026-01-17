import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import TopHeader from '../components/dashboard/TopHeader';
import { driveService } from '../services/drive.services';
import { userService } from '../services/user.services';

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
};

type DbUser = {
  _id: string;
  username?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
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
  const [isSharing, setIsSharing] = useState(false);

  const ensureAuth = () => {
    if (!token) {
      navigate('/login', { replace: true });
      return false;
    }
    return true;
  };

  const loadUsers = async () => {
    if (!ensureAuth()) return;

    const flattenUsers = (data: any): DbUser[] => {
      const pools: any[] = [];
      const maybePush = (value: any) => {
        if (!value) return;
        if (Array.isArray(value)) {
          for (const v of value) pools.push(v);
          return;
        }
        pools.push(value);
      };

      if (data && typeof data === 'object') {
        maybePush(data.superadmins);
        maybePush(data.admins);
        maybePush(data.managers);
        maybePush(data.clients);
        maybePush(data.team);

        maybePush(data.superadmin);
        maybePush(data.admin);
        maybePush(data.manager);
        maybePush(data.client);
      }

      const byId = new Map<string, DbUser>();
      for (const raw of pools) {
        const id = raw?._id ? String(raw._id) : '';
        if (!id) continue;
        const next: DbUser = {
          _id: id,
          username: raw?.username ? String(raw.username) : undefined,
          email: raw?.email ? String(raw.email) : undefined,
          role: raw?.role ? String(raw.role) : undefined,
          isActive: typeof raw?.isActive === 'boolean' ? raw.isActive : undefined,
        };
        byId.set(id, next);
      }

      const currentUserId = user?._id ? String(user._id) : '';
      return Array.from(byId.values())
        .filter((u) => (u.email || '').trim())
        .filter((u) => (currentUserId ? u._id !== currentUserId : true));
    };

    const result = await userService.getTeamOverview(token);
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
    setDbUsers(flattenUsers(result?.data));
  };

  const loadDriveItems = async () => {
    if (!ensureAuth()) return;
    const result = await driveService.listFiles(token, undefined, 5000);
    if (!result?.success) {
      if (result?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
        return;
      }
      setError(result?.message || 'Failed to load Drive files');
      return;
    }

    const files = ((result?.data as any)?.files || []) as DriveItem[];
    setDriveItems(files);
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

    const dbUser = dbUsers.find((u) => u._id === selectedUserId);
    const email = (dbUser?.email || '').trim();
    if (!email) {
      setError('Selected user does not have a valid email');
      return;
    }

    setIsSharing(true);
    setError('');
    setMessage('');

    const result = await driveService.share(token, selectedFileId, email);
    setIsSharing(false);

    if (!result?.success) {
      setError(result?.message || 'Failed to share');
      return;
    }

    setMessage('Shared successfully');
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
                      setError('');
                      setMessage('');
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">-- Select --</option>
                    {driveItems.map((f) => (
                      <option key={f.id} value={f.id}>
                        {(f.name || f.id) + (f.mimeType === 'application/vnd.google-apps.folder' ? ' (folder)' : '')}
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
                    value="reader"
                    disabled
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="reader">reader</option>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileAccessControl;
