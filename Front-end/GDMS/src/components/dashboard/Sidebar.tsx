import { Link } from 'react-router-dom';

const Sidebar = () => {
  let role = '';
  try {
    const raw = localStorage.getItem('user');
    const parsed = raw ? JSON.parse(raw) : null;
    role = (parsed?.role || '').toString();
  } catch {
    role = '';
  }

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="p-4">
        <Link
          to="/add-member"
          className="w-full h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center gap-3 px-4 hover:bg-gray-50"
        >
          <div className="h-6 w-6 rounded-full bg-[#E8F0FE] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M5 12H19" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-sm font-medium text-gray-700">New</div>
        </Link>
      </div>

      <nav className="px-2 pb-4 text-sm flex-1">
        <div className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50">
          <div className="h-5 w-5 text-gray-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 4H17V20H7V4Z" stroke="#9CA3AF" strokeWidth="1.7" />
              <path d="M9 8H15" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>
          Priority
        </div>
        <div className="px-3 py-2 text-gray-700 flex items-center gap-3 rounded-lg bg-[#E8F0FE]">
          <div className="h-5 w-5 text-blue-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 7H20" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M4 17H20" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M6 7V17" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>
          My Drive
        </div>
        <Link to="/team" className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50">
          <div className="h-5 w-5 text-gray-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 8H20V20H4V8Z" stroke="#9CA3AF" strokeWidth="1.7" />
              <path d="M8 8V4H16V8" stroke="#9CA3AF" strokeWidth="1.7" />
            </svg>
          </div>
          Team
        </Link>

        {role === 'admin' || role === 'superadmin' ? (
          <Link to="/admin" className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50">
            <div className="h-5 w-5 text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3L20 7V12C20 16.418 16.418 20 12 21C7.582 20 4 16.418 4 12V7L12 3Z" stroke="#9CA3AF" strokeWidth="1.7" />
                <path d="M9 12L11 14L15 10" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            Admin
          </Link>
        ) : null}

        {role === 'admin' || role === 'superadmin' || role === 'manager' ? (
          <Link
            to="/file-access-control"
            className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50"
          >
            <div className="h-5 w-5 text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3L20 7V12C20 16.418 16.418 20 12 21C7.582 20 4 16.418 4 12V7L12 3Z" stroke="#9CA3AF" strokeWidth="1.7" />
                <path d="M9 12H15" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M9 16H13" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            File Access Control
          </Link>
        ) : null}
        <div className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50">
          <div className="h-5 w-5 text-gray-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 8C16 10.209 14.209 12 12 12C9.791 12 8 10.209 8 8C8 5.791 9.791 4 12 4C14.209 4 16 5.791 16 8Z" stroke="#9CA3AF" strokeWidth="1.7" />
              <path d="M4 20C5.2 16.5 8 14.5 12 14.5C16 14.5 18.8 16.5 20 20" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>
          Shared with me
        </div>
        <div className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50">
          <div className="h-5 w-5 text-gray-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12L15 14" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M20 12C20 16.418 16.418 20 12 20C7.582 20 4 16.418 4 12C4 7.582 7.582 4 12 4C16.418 4 20 7.582 20 12Z" stroke="#9CA3AF" strokeWidth="1.7" />
            </svg>
          </div>
          Recent
        </div>
        <div className="px-3 py-2 text-gray-600 flex items-center gap-3 rounded-lg hover:bg-gray-50">
          <div className="h-5 w-5 text-gray-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 4H17V20H7V4Z" stroke="#9CA3AF" strokeWidth="1.7" />
              <path d="M9 7H15" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M9 10H15" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>
          Trash
        </div>
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