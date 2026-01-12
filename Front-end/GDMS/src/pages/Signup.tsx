import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = (e: any) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      navigate('/login');
    }, 900);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const backgroundSvg = encodeURIComponent(`
    <svg width="1440" height="900" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="720" y1="0" x2="720" y2="900" gradientUnits="userSpaceOnUse">
          <stop stop-color="#BEE9FF"/>
          <stop offset="1" stop-color="#F4FBFF"/>
        </linearGradient>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox">
          <feGaussianBlur stdDeviation="20"/>
        </filter>
      </defs>
      <rect width="1440" height="900" fill="url(#g)"/>

      <path d="M-40 540 C 220 420, 480 620, 760 520 C 1040 420, 1220 560, 1500 480" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="2"/>
      <path d="M-60 610 C 220 500, 520 720, 820 600 C 1120 480, 1260 660, 1500 560" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="2"/>

      <g filter="url(#blur)" opacity="0.95">
        <path d="M110 720 C 110 690, 140 666, 175 672 C 188 640, 224 620, 262 632 C 282 604, 320 590, 356 602 C 382 572, 430 566, 462 594 C 488 578, 524 584, 540 608 C 582 602, 620 628, 624 664 C 660 674, 684 704, 676 736 C 676 770, 644 798, 604 796 L 188 796 C 144 798, 110 764, 110 720 Z" fill="#FFFFFF"/>
        <path d="M860 700 C 860 670, 892 646, 928 654 C 946 624, 982 606, 1018 620 C 1038 594, 1074 584, 1106 602 C 1134 578, 1176 578, 1206 602 C 1230 588, 1264 596, 1280 620 C 1318 618, 1350 644, 1352 676 C 1390 688, 1414 722, 1404 756 C 1404 792, 1370 822, 1328 820 L 942 820 C 896 822, 860 788, 860 700 Z" fill="#FFFFFF"/>
        <path d="M360 250 C 360 222, 388 200, 420 206 C 438 178, 472 162, 504 174 C 520 154, 550 144, 578 154 C 604 136, 638 138, 660 160 C 684 150, 714 160, 726 182 C 760 186, 788 210, 788 238 C 820 250, 838 280, 828 312 C 828 344, 800 370, 764 368 L 442 368 C 396 372, 360 336, 360 250 Z" fill="#FFFFFF" fill-opacity="0.9"/>
      </g>
    </svg>
  `);

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
          <div className="flex justify-center mb-5">
            <div className="w-10 h-10 rounded-xl bg-white/70 border border-white/70 shadow-sm flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="#111827" strokeWidth="1.5"/>
                <path d="M5 20C6.2 16.5 8.8 14.5 12 14.5C15.2 14.5 17.8 16.5 19 20" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Create your account</h2>
          <p className="text-gray-700/70 text-center mb-8 text-sm leading-relaxed">Sign up to start using your dashboard and manage your progress</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0H3z" />
                  </svg>
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3.5 bg-transparent border-0 rounded-none text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0"
                  placeholder="Full name"
                  required
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-black/50 group-focus-within:bg-black group-focus-within:h-0.5 transition-all duration-200" />
              </div>
            </div>

            <div className="mb-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3.5 bg-transparent border-0 rounded-none text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0"
                  placeholder="Email"
                  required
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-black/50 group-focus-within:bg-black group-focus-within:h-0.5 transition-all duration-200" />
              </div>
            </div>

            <div className="mb-2">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-11 py-3.5 bg-transparent border-0 rounded-none text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12C4.5 7 8 4.5 12 4.5C16 4.5 19.5 7 22 12C19.5 17 16 19.5 12 19.5C8 19.5 4.5 17 2 12Z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M12 15.25C10.205 15.25 8.75 13.795 8.75 12C8.75 10.205 10.205 8.75 12 8.75C13.795 8.75 15.25 10.205 15.25 12C15.25 13.795 13.795 15.25 12 15.25Z" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M10.5 10.677C10.1841 10.9957 10 11.4284 10 12C10 13.1046 10.8954 14 12 14C12.5716 14 13.0043 13.8159 13.323 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M21 12C19.5 7 16 4.5 12 4.5C10.8325 4.5 9.7115 4.71531 8.6565 5.10023" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M4.5 7C3.645 8.247 3 9.64 3 12C4.5 17 8 19.5 12 19.5C13.757 19.5 15.4295 18.9845 17 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-black/50 group-focus-within:bg-black group-focus-within:h-0.5 transition-all duration-200" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full bg-gray-900 hover:bg-black text-white font-semibold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center"
            >
              {isLoading ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-700/70">
            Already have an account?{' '}
            <Link to="/login" className="text-gray-900 underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
