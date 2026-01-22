import { useMemo } from 'react';
import { Link } from 'react-router-dom';

const safeParseJson = (value: string | null): any | null => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const Sidebar = () => {
  const user = useMemo(() => safeParseJson(localStorage.getItem('user')), []);
  const role = (user?.role || '').toString();
  const roleNormalized = role.toLowerCase();
  const canSeeAddMember =
    roleNormalized === 'admin' || roleNormalized === 'superadmin' || roleNormalized === 'manager';
  const canSeeTeam =
    roleNormalized === 'admin' ||
    roleNormalized === 'superadmin' ||
    roleNormalized === 'manager' ||
    roleNormalized === 'client';
  const canSeeAccessControl =
    roleNormalized === 'admin' || roleNormalized === 'superadmin' || roleNormalized === 'manager';
  const canSeeAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';

  return (
    <aside className="hidden md:flex md:w-58 md:shrink-0 bg-white border-r border-gray-200 h-full flex-col">
      <nav className="px-2 pb-4 pt-7 text-sm flex-1">
        <Link to="/dashboard" className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50">
          <div className="h-5 w-5 text-gray-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 4H10V10H4V4Z"
                stroke="#9CA3AF"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 4H20V10H14V4Z"
                stroke="#9CA3AF"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 14H10V20H4V14Z"
                stroke="#9CA3AF"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 14H20V20H14V14Z"
                stroke="#9CA3AF"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          Dashboard
        </Link>
        {canSeeTeam ? (
          <Link to="/team" className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50">
            <div className="h-5 w-5 text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 8H20V20H4V8Z" stroke="#9CA3AF" strokeWidth="1.7" />
                <path d="M8 8V4H16V8" stroke="#9CA3AF" strokeWidth="1.7" />
              </svg>
            </div>
            Team
          </Link>
        ) : null}
        {canSeeAddMember ? (
          <Link to="/add-member" className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50">
            <div className="h-5 w-5 text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M5 12H19" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            Add Member
          </Link>
        ) : null}
        {canSeeAccessControl ? (
          <Link to="/access-control" className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50">
            <div className="h-5 w-5 text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 11V14" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M9 11V14" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M15 11V14" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M20 10V17C20 19 18.5 20 16.5 20H7.5C5.5 20 4 19 4 17V10" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M7 10V7.5C7 5.6 8.6 4 10.5 4H13.5C15.4 4 17 5.6 17 7.5V10" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            Access Control
          </Link>
        ) : null}

        {canSeeAdmin ? (
          <Link to="/admin" className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50">
            <div className="h-5 w-5 text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3L4 7V12C4 16.4183 7.13401 20.449 11.5 21C15.866 20.449 19 16.4183 19 12V7L12 3Z" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 12L11 14L15 10" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            Admin
          </Link>
        ) : null}
      </nav>

      {/* Logout Button with Icon - Updated to match sidebar design */}
      <div className="mt-auto px-4 pb-6">
        <Link
          to="/login"
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }}
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="h-5 w-5 text-gray-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 17L21 12L16 7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 12H9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-medium">Logout</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;