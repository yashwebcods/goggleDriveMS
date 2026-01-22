import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import TopHeader from '../components/dashboard/TopHeader';
import { userService } from '../services/user.services';

const safeParseJson = (value: string | null): any | null => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

type SummaryUser = {
  _id?: string;
  username?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: {
    _id?: string;
    username?: string;
    email?: string;
    role?: string;
  };
};

const Admin = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token') || '';
  const user = useMemo(() => safeParseJson(localStorage.getItem('user')), []);
  const role = (user?.role || '').toString();
  const canAccess = role === 'admin' || role === 'superadmin';
  const canManageAdmins = role === 'superadmin';
  const canManageManagers = role === 'superadmin';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [clientManager, setClientManager] = useState<Record<string, string>>({});
  const [savingClientId, setSavingClientId] = useState<string>('');
  const [actionMessage, setActionMessage] = useState('');
  const [adminSuperAdmin, setAdminSuperAdmin] = useState<Record<string, string>>({});
  const [savingAdminId, setSavingAdminId] = useState<string>('');
  const [managerAdmin, setManagerAdmin] = useState<Record<string, string>>({});
  const [savingManagerId, setSavingManagerId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      if (!canAccess) {
        setError('Not authorized');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      const result = await userService.getAdminSummary(token);
      if (!result?.success) {
        setError(result?.message || 'Failed to load admin summary');
        setIsLoading(false);
        return;
      }
      setData(result?.data);
      setIsLoading(false);
    };

    load();
  }, [canAccess, navigate, token]);

  const counts = data?.counts || {};
  const admins: SummaryUser[] = data?.users?.admins || [];
  const managers: SummaryUser[] = data?.users?.managers || [];
  const clients: SummaryUser[] = data?.users?.clients || [];
  const superadmins: SummaryUser[] = data?.users?.superadmins || [];

  const managerClientsCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of clients) {
      const mid = (c?.createdBy?._id || '').toString();
      if (!mid) continue;
      map[mid] = (map[mid] || 0) + 1;
    }
    return map;
  }, [clients]);

  const managersByAdminId = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const m of managers) {
      const aid = (m?.createdBy?._id || '').toString();
      const mid = (m?._id || '').toString();
      if (!aid || !mid) continue;
      if (!map[aid]) map[aid] = [];
      map[aid].push(mid);
    }
    return map;
  }, [managers]);

  useEffect(() => {
    if (!clients.length) return;
    const next: Record<string, string> = {};
    for (const c of clients) {
      const id = (c?._id || '').toString();
      const mId = (c?.createdBy?._id || '').toString();
      if (id) next[id] = mId;
    }
    setClientManager(next);
  }, [clients]);

  useEffect(() => {
    if (!admins.length) return;
    const next: Record<string, string> = {};
    for (const a of admins) {
      const id = (a?._id || '').toString();
      const sId = (a?.createdBy?._id || '').toString();
      if (id) next[id] = sId;
    }
    setAdminSuperAdmin(next);
  }, [admins]);

  useEffect(() => {
    if (!managers.length) return;
    const next: Record<string, string> = {};
    for (const m of managers) {
      const id = (m?._id || '').toString();
      const aId = (m?.createdBy?._id || '').toString();
      if (id) next[id] = aId;
    }
    setManagerAdmin(next);
  }, [managers]);

  const renderTable = (title: string, rows: SummaryUser[], showCreatedBy: boolean) => (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500 mt-1">Total: {rows.length}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left font-medium px-4 py-2">Name</th>
              <th className="text-left font-medium px-4 py-2">Email</th>
              <th className="text-left font-medium px-4 py-2">Role</th>
              {showCreatedBy ? <th className="text-left font-medium px-4 py-2">Manager</th> : null}
              <th className="text-left font-medium px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id || r.email} className="border-t border-gray-100">
                <td className="px-4 py-2 text-gray-900">{r.username}</td>
                <td className="px-4 py-2 text-gray-700">{r.email}</td>
                <td className="px-4 py-2 text-gray-700">{r.role}</td>
                {showCreatedBy ? (
                  <td className="px-4 py-2 text-gray-700">
                    {r.createdBy?.email ? `${r.createdBy.username || ''} (${r.createdBy.email})` : '-'}
                  </td>
                ) : null}
                <td className="px-4 py-2 text-gray-700">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-500" colSpan={showCreatedBy ? 5 : 4}>
                  No records
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAdminsAssignment = () => (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900">Admins (Assign Super Admin)</div>
        <div className="text-xs text-gray-500 mt-1">Total: {admins.length}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left font-medium px-4 py-2">Name</th>
              <th className="text-left font-medium px-4 py-2">Email</th>
              <th className="text-left font-medium px-4 py-2">Managers</th>
              <th className="text-left font-medium px-4 py-2">Clients</th>
              <th className="text-left font-medium px-4 py-2">Super Admin</th>
              <th className="text-left font-medium px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => {
              const adminId = (a?._id || '').toString();
              const selected = adminId ? adminSuperAdmin[adminId] || '' : '';
              const disabled = !adminId || savingAdminId === adminId;
              const mids = adminId ? managersByAdminId[adminId] || [] : [];
              const mCount = mids.length;
              const cCount = mids.reduce((acc, mid) => acc + (managerClientsCount[mid] || 0), 0);
              return (
                <tr key={adminId || a.email} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-900">{a.username}</td>
                  <td className="px-4 py-2 text-gray-700">{a.email}</td>
                  <td className="px-4 py-2 text-gray-700">{mCount}</td>
                  <td className="px-4 py-2 text-gray-700">{cCount}</td>
                  <td className="px-4 py-2 text-gray-700">
                    <select
                      className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
                      value={selected}
                      onChange={(e) => {
                        if (!adminId) return;
                        setAdminSuperAdmin((prev) => ({ ...prev, [adminId]: e.target.value }));
                      }}
                      disabled={disabled}
                    >
                      <option value="">Select super admin</option>
                      {superadmins.map((s) => (
                        <option key={s._id || s.email} value={(s._id || '').toString()}>
                          {(s.username || '').toString()} {(s.email ? `(${s.email})` : '')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      disabled={disabled || !selected}
                      onClick={async () => {
                        if (!adminId) return;
                        setActionMessage('');
                        setError('');
                        setSavingAdminId(adminId);
                        const result = await userService.assignAdminSuperAdmin(token, adminId, {
                          superadminId: selected,
                        });
                        setSavingAdminId('');
                        if (!result?.success) {
                          setError(result?.message || 'Failed to update super admin');
                          return;
                        }
                        setActionMessage('Admin super admin updated');

                        setData((prev: any) => {
                          const prevAdmins: SummaryUser[] = prev?.users?.admins || [];
                          const updated = prevAdmins.map((x) =>
                            String(x?._id || '') === adminId ? (result?.data as any) : x
                          );
                          return {
                            ...(prev || {}),
                            users: { ...(prev?.users || {}), admins: updated },
                          };
                        });
                      }}
                    >
                      {savingAdminId === adminId ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!admins.length ? (
              <tr className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-500" colSpan={6}>
                  No records
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderManagersAssignment = () => (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900">Managers (Assign Admin)</div>
        <div className="text-xs text-gray-500 mt-1">Total: {managers.length}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left font-medium px-4 py-2">Name</th>
              <th className="text-left font-medium px-4 py-2">Email</th>
              <th className="text-left font-medium px-4 py-2">Clients</th>
              <th className="text-left font-medium px-4 py-2">Admin</th>
              <th className="text-left font-medium px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {managers.map((m) => {
              const managerId = (m?._id || '').toString();
              const selected = managerId ? managerAdmin[managerId] || '' : '';
              const disabled = !managerId || savingManagerId === managerId;
              const cCount = managerId ? managerClientsCount[managerId] || 0 : 0;
              return (
                <tr key={managerId || m.email} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-900">{m.username}</td>
                  <td className="px-4 py-2 text-gray-700">{m.email}</td>
                  <td className="px-4 py-2 text-gray-700">{cCount}</td>
                  <td className="px-4 py-2 text-gray-700">
                    <select
                      className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
                      value={selected}
                      onChange={(e) => {
                        if (!managerId) return;
                        setManagerAdmin((prev) => ({ ...prev, [managerId]: e.target.value }));
                      }}
                      disabled={disabled}
                    >
                      <option value="">Select admin</option>
                      {admins.map((a) => (
                        <option key={a._id || a.email} value={(a._id || '').toString()}>
                          {(a.username || '').toString()} {(a.email ? `(${a.email})` : '')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      disabled={disabled || !selected}
                      onClick={async () => {
                        if (!managerId) return;
                        setActionMessage('');
                        setError('');
                        setSavingManagerId(managerId);
                        const result = await userService.assignManagerAdmin(token, managerId, {
                          adminId: selected,
                        });
                        setSavingManagerId('');
                        if (!result?.success) {
                          setError(result?.message || 'Failed to update admin');
                          return;
                        }
                        setActionMessage('Manager admin updated');

                        setData((prev: any) => {
                          const prevManagers: SummaryUser[] = prev?.users?.managers || [];
                          const updated = prevManagers.map((x) =>
                            String(x?._id || '') === managerId ? (result?.data as any) : x
                          );
                          return {
                            ...(prev || {}),
                            users: { ...(prev?.users || {}), managers: updated },
                          };
                        });
                      }}
                    >
                      {savingManagerId === managerId ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!managers.length ? (
              <tr className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-500" colSpan={5}>
                  No records
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderClients = () => (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900">Clients</div>
        <div className="text-xs text-gray-500 mt-1">Total: {clients.length}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left font-medium px-4 py-2">Name</th>
              <th className="text-left font-medium px-4 py-2">Email</th>
              <th className="text-left font-medium px-4 py-2">Manager</th>
              <th className="text-left font-medium px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const clientId = (c?._id || '').toString();
              const selected = clientId ? clientManager[clientId] || '' : '';
              const disabled = !clientId || savingClientId === clientId;
              return (
                <tr key={clientId || c.email} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-900">{c.username}</td>
                  <td className="px-4 py-2 text-gray-700">{c.email}</td>
                  <td className="px-4 py-2 text-gray-700">
                    <select
                      className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
                      value={selected}
                      onChange={(e) => {
                        if (!clientId) return;
                        setClientManager((prev) => ({ ...prev, [clientId]: e.target.value }));
                      }}
                      disabled={disabled}
                    >
                      <option value="">Select manager</option>
                      {managers.map((m) => (
                        <option key={m._id || m.email} value={(m._id || '').toString()}>
                          {(m.username || '').toString()} {(m.email ? `(${m.email})` : '')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      disabled={disabled || !selected}
                      onClick={async () => {
                        if (!clientId) return;
                        setActionMessage('');
                        setError('');
                        setSavingClientId(clientId);
                        const result = await userService.assignClientManager(token, clientId, {
                          managerId: selected,
                        });
                        setSavingClientId('');
                        if (!result?.success) {
                          setError(result?.message || 'Failed to update manager');
                          return;
                        }
                        setActionMessage('Manager updated');

                        setData((prev: any) => {
                          const prevClients: SummaryUser[] = prev?.users?.clients || [];
                          const updated = prevClients.map((x) =>
                            String(x?._id || '') === clientId ? (result?.data as any) : x
                          );
                          return {
                            ...(prev || {}),
                            users: { ...(prev?.users || {}), clients: updated },
                          };
                        });
                      }}
                    >
                      {savingClientId === clientId ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!clients.length ? (
              <tr className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-500" colSpan={4}>
                  No records
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );

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
          <div className="max-w-6xl mx-auto px-6 pt-6 pb-10">
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <div className="text-lg font-semibold text-gray-900">Admin</div>
            </div>

            {isLoading ? <div className="text-sm text-gray-600">Loading...</div> : null}
            {error ? <div className="text-sm text-red-700">{error}</div> : null}
            {actionMessage ? <div className="text-sm text-green-700">{actionMessage}</div> : null}

            {data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-xs font-semibold text-gray-600">Admins</div>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">{counts.admins ?? 0}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-xs font-semibold text-gray-600">Managers</div>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">{counts.managers ?? 0}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-xs font-semibold text-gray-600">Clients</div>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">{counts.clients ?? 0}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-xs font-semibold text-gray-600">Super Admins</div>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">{counts.superadmins ?? 0}</div>
                  </div>
                </div>

                {canManageAdmins ? renderAdminsAssignment() : renderTable('Admins', admins, false)}
                {canManageManagers ? renderManagersAssignment() : renderTable('Managers', managers, false)}
                {renderClients()}
                {renderTable('Super Admins', superadmins, false)}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
