import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { userService } from '../services/user.services';

const ChangePassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailFromQuery = params.get('email') || '';
    if (!emailFromQuery) {
      navigate('/forgot-password', { replace: true });
      return;
    }
    setEmail(emailFromQuery);
  }, [location.search, navigate]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await userService.resetPassword(email, password, confirm);
      if (!result?.success) {
        setError(result?.message || `Password update failed (HTTP ${result?.status ?? 'unknown'})`);
        setIsLoading(false);
        return;
      }

      setSuccess(result?.message || 'Password changed successfully');
      setIsLoading(false);

      setTimeout(() => {
        navigate(`/login?email=${encodeURIComponent(email)}`);
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
      setIsLoading(false);
    }
  };

  const backgroundSvg = encodeURIComponent(`
    <svg width="1440" height="900" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="720" y1="0" x2="720" y2="900" gradientUnits="userSpaceOnUse">
          <stop stop-color="#BEE9FF"/>
          <stop offset="1" stop-color="#F4FBFF"/>
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#g)"/>
    </svg>
  `);

  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(\"data:image/svg+xml,${backgroundSvg}\")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="relative bg-white/55 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/60">
        <div className="w-full p-8 sm:p-10 bg-white/40 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Change password</h2>
          <p className="text-gray-700/70 text-center mb-8 text-sm leading-relaxed">Set a new password for your account</p>

          <form onSubmit={handleSubmit}>
            {error ? (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
                {success}
              </div>
            ) : null}
            <div className="mb-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3.5 bg-transparent border-0 rounded-none text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0"
                  placeholder="New password"
                  required
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-black/50 group-focus-within:bg-black group-focus-within:h-0.5 transition-all duration-200" />
              </div>
            </div>

            <div className="mb-2">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 10h8v2H6v-2z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3.5 bg-transparent border-0 rounded-none text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0"
                  placeholder="Confirm password"
                  required
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-black/50 group-focus-within:bg-black group-focus-within:h-0.5 transition-all duration-200" />
              </div>
              {mismatch ? (
                <div className="mt-2 text-xs text-red-600">Passwords do not match</div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isLoading || mismatch}
              className="mt-6 w-full bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center"
            >
              {isLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-700/70">
            <Link to="/login" className="text-gray-900 underline underline-offset-4">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
