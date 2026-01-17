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

type TeamClient = {
  _id?: string;
  username?: string;
  email?: string;
  role?: string;
  createdAt?: string;
};

type TeamManager = {
  _id?: string;
  username?: string;
  email?: string;
  role?: string;
  createdAt?: string;
};

type TeamGroupedItem = {
  manager: TeamManager;
  clients: Array<TeamClient & { createdBy?: TeamManager }>;
};

type TeamAdmin = {
  _id?: string;
  username?: string;
  email?: string;
  role?: string;
  createdAt?: string;
};

const Team = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token') || '';
  const user = useMemo(() => safeParseJson(localStorage.getItem('user')), []);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      setIsLoading(true);
      setError('');
      const result = await userService.getTeamOverview(token);
      if (!result?.success) {
        setError(result?.message || 'Failed to load team');
        setIsLoading(false);
        return;
      }
      setData(result?.data);
      setIsLoading(false);
    };

    load();
  }, [navigate, token]);

  const content = useMemo(() => {
    if (isLoading) return <div className="text-sm text-gray-600">Loading...</div>;
    if (error) return <div className="text-sm text-red-700">{error}</div>;
    if (!data) return null;

    const renderCounts = (counts: any) => (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {'superadmins' in counts ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold text-gray-600">Super Admins</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{counts.superadmins ?? 0}</div>
          </div>
        ) : null}
        {'admins' in counts ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold text-gray-600">Admins</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{counts.admins ?? 0}</div>
          </div>
        ) : null}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-600">Managers</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{counts.managers ?? 0}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-600">Clients</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{counts.clients ?? 0}</div>
        </div>
      </div>
    );

    const renderClientTable = (rows: TeamClient[]) => (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">Clients</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-2">Name</th>
                <th className="text-left font-medium px-4 py-2">Email</th>
                <th className="text-left font-medium px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c: TeamClient) => (
                <tr key={c._id || c.email} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-900">{c.username}</td>
                  <td className="px-4 py-2 text-gray-700">{c.email}</td>
                  <td className="px-4 py-2 text-gray-700">{c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-500" colSpan={3}>
                    No records
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    );

    // Superadmin view shape: { counts, groups: [{ admin, managers: [{ manager, clients }], clients: [] }], ... }
    if (data?.counts && Array.isArray(data?.groups)) {
      const groups: Array<{
        admin?: TeamAdmin;
        managers?: Array<TeamGroupedItem>;
        clients?: TeamClient[];
      }> = data.groups;

      return (
        <div className="space-y-4">
          {renderCounts(data.counts)}

          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.admin?._id || g.admin?.email} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">
                    Admin: {g.admin?.username} ({g.admin?.email})
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Managers: {g.managers?.length || 0}</div>
                </div>

                <div className="p-4 space-y-4">
                  {(g.managers || []).map((mg) => (
                    <div key={mg.manager?._id || mg.manager?.email} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="text-sm font-semibold text-gray-900">
                          Manager: {mg.manager?.username} ({mg.manager?.email})
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Clients: {mg.clients?.length || 0}</div>
                      </div>
                      <div className="p-4">{renderClientTable(mg.clients || [])}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Admin view shape: { counts, superadmin, admin, groups: [{ manager, clients }], clients: [] }
    if (data?.admin && Array.isArray(data?.groups)) {
      return (
        <div className="space-y-4">
          {data?.counts ? renderCounts(data.counts) : null}

          {data?.superadmin?.email ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">Super Admin</div>
              <div className="text-sm text-gray-700 mt-1">
                {data.superadmin?.username} ({data.superadmin?.email})
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            {(data.groups || []).map((mg: TeamGroupedItem) => (
              <div key={mg.manager?._id || mg.manager?.email} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">
                    Manager: {mg.manager?.username} ({mg.manager?.email})
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Clients: {mg.clients?.length || 0}</div>
                </div>
                <div className="p-4">{renderClientTable(mg.clients || [])}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Manager view shape: { admin, manager, clients }
    if (data?.manager && Array.isArray(data?.clients)) {
      return (
        <div className="space-y-4">
          {data?.admin?.email ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">Admin</div>
              <div className="text-sm text-gray-700 mt-1">
                {data.admin?.username} ({data.admin?.email})
              </div>
            </div>
          ) : null}
          {renderClientTable(data.clients || [])}
        </div>
      );
    }

    // Client view shape: { manager, client, team }
    if (data?.client && Array.isArray(data?.team)) {
      return (
        <div className="space-y-4">
          {data?.manager?.email ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">Manager</div>
              <div className="text-sm text-gray-700 mt-1">
                {data.manager?.username} ({data.manager?.email})
              </div>
            </div>
          ) : null}
          {renderClientTable(data.team || [])}
        </div>
      );
    }

    return <div className="text-sm text-gray-600">No data available.</div>;
  }, [data, error, isLoading]);

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
              <div className="text-lg font-semibold text-gray-900">Team</div>
            </div>

            {content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;
