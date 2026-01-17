import { useMemo, useState } from 'react';
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

const AddMember = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token') || '';
  const user = useMemo(() => safeParseJson(localStorage.getItem('user')), []);

  const creatorRole = (user?.role || '').toString();
  const allowedRoles = useMemo(() => {
    if (creatorRole === 'superadmin') return ['superadmin', 'admin', 'manager', 'client'] as const;
    if (creatorRole === 'admin') return ['admin', 'manager', 'client'] as const;
    if (creatorRole === 'manager') return ['client'] as const;
    return [] as const;
  }, [creatorRole]);

  type Role = (typeof allowedRoles)[number];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>((allowedRoles?.[0] || 'client') as Role);
  const [managerEmail, setManagerEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const ensureAuth = () => {
    if (!token) {
      navigate('/login', { replace: true });
      return false;
    }
    return true;
  };

  const onSubmit = async (e: any) => {
    e.preventDefault();
    if (!ensureAuth()) return;

    if (!allowedRoles.length) {
      setError('Not authorized to add members');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      username: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      managerEmail: role === 'client' && (creatorRole === 'admin' || creatorRole === 'superadmin') ? managerEmail.trim().toLowerCase() : undefined,
    };

    try {
      const result = await userService.createMember(token, payload);
      if (!result?.success) {
        setError(result?.message || `Failed to add member (HTTP ${result?.status ?? 'unknown'})`);
        setIsLoading(false);
        return;
      }

      setSuccess('Member added successfully.');
      setName('');
      setEmail('');
      setPassword('');
      setManagerEmail('');
      setRole((allowedRoles?.[0] || 'client') as Role);
      setIsLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
      setIsLoading(false);
    }
  };

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
          <div className="max-w-4xl mx-auto px-6 pt-6 pb-10">
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <div className="text-lg font-semibold text-gray-900">Add Member</div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="text-sm font-semibold text-gray-900">Create a new member</div>
                <div className="text-xs text-gray-500 mt-1">Fill in the details and click Create.</div>
              </div>

              <form onSubmit={onSubmit} className="p-5">
                {error ? (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
                ) : null}

                {success ? (
                  <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Name</div>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Full name"
                      required
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-600">Email</div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="someone@example.com"
                      required
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-600">Password</div>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Temporary password"
                      required
                      minLength={6}
                    />
                  </div>

                  {allowedRoles.length > 1 ? (
                    <div>
                      <div className="text-xs font-semibold text-gray-600">Role</div>
                      <select
                        value={role as string}
                        onChange={(e) => setRole(e.target.value as Role)}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                        required
                      >
                        {allowedRoles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>

                {role === 'client' && (creatorRole === 'admin' || creatorRole === 'superadmin') ? (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-600">Manager Email</div>
                    <input
                      type="email"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="manager@example.com"
                      required
                    />
                    <div className="mt-1 text-xs text-gray-500">Clients must be assigned to a manager.</div>
                  </div>
                ) : null}

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
                  >
                    {isLoading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMember;
