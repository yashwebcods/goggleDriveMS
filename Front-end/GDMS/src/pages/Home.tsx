import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-[#F6F8FB] text-gray-900">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">GDMS</h1>
          <p className="mt-3 max-w-2xl text-gray-600">
            Sign in to manage files, folders, and access control in your Google Drive workspace.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Create account
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="text-sm font-medium">Secure authentication</div>
              <div className="mt-1 text-sm text-gray-600">JWT-based login with role-based access.</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="text-sm font-medium">Drive integration</div>
              <div className="mt-1 text-sm text-gray-600">Connect Google Drive and manage uploads & shares.</div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link to="/privacy-policy" className="text-gray-700 hover:text-gray-900">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-gray-700 hover:text-gray-900">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
