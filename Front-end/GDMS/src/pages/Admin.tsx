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
  }, [navigate, token]);

  const counts = data?.counts || {};
  const admins: SummaryUser[] = data?.users?.admins || [];
  const managers: SummaryUser[] = data?.users?.managers || [];
  const clients: SummaryUser[] = data?.users?.clients || [];
  const superadmins: SummaryUser[] = data?.users?.superadmins || [];

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

                {renderTable('Admins', admins, false)}
                {renderTable('Managers', managers, false)}
                {renderTable('Clients', clients, true)}
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
