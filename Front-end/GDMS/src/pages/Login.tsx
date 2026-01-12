import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../index.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: any) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            alert(`Sign in attempt with:\nEmail: ${email}\nPassword: ${password}`);
        }, 1500);
    };

    // Password show/hide toggle function
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
                backgroundImage: `url("data:image/svg+xml,${backgroundSvg}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="hidden absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                <div className="hidden absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000"></div>
                <div className="hidden absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000"></div>

                {/* Animated Grid Pattern */}
                <div className="hidden absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    animation: 'gridMove 20s linear infinite'
                }}></div>
            </div>

            {/* Main Card */}
            <div className="relative bg-white/55 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/60 animate-fadeIn">
                <div className="flex flex-col md:flex-row">
                    {/* Login Form */}
                    <div className="w-full p-8 sm:p-10 bg-white/40 backdrop-blur-sm">
                        <div className="animate-slideInRight">
                            <div className="flex justify-center mb-5">

                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Sign in with email</h2>
                            <p className="text-gray-700/70 text-center mb-8 text-sm leading-relaxed">Make a new doc to bring your data, the latest progress for free</p>

                            <form onSubmit={handleSubmit}>
                                {/* Email Input */}
                                <div className="mb-4">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" fill="currentColor" viewBox="0 0 20 20">
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
                                        <div className="absolute bottom-0 left-0 right-0 h-px bg-black/50 group-focus-within:bg-black group-focus-within:h-0.5 transition-all duration-200"></div>
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div className="mb-2">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"} // यहाँ type change होगा
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-10 pr-11 py-3.5 bg-transparent border-0 rounded-none text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0"
                                            placeholder="Password"
                                            required
                                        />

                                        {/* Password visibility toggle button */}
                                        <button
                                            type="button"
                                            onClick={togglePasswordVisibility} // यहाँ function add किया
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? (
                                                // Eye with slash icon (when password is visible)
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M2 12C4.5 7 8 4.5 12 4.5C16 4.5 19.5 7 22 12C19.5 17 16 19.5 12 19.5C8 19.5 4.5 17 2 12Z" stroke="currentColor" strokeWidth="1.5" />
                                                    <path d="M12 15.25C10.205 15.25 8.75 13.795 8.75 12C8.75 10.205 10.205 8.75 12 8.75C13.795 8.75 15.25 10.205 15.25 12C15.25 13.795 13.795 15.25 12 15.25Z" stroke="currentColor" strokeWidth="1.5" />
                                                </svg>

                                            ) : (
                                                // Eye icon (when password is hidden)
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M3 3L21 21M10.5 10.677C10.1841 10.9957 10 11.4284 10 12C10 13.1046 10.8954 14 12 14C12.5716 14 13.0043 13.8159 13.323 13.5M21 12C19.5 7 16 4.5 12 4.5C10.8325 4.5 9.7115 4.71531 8.6565 5.10023M4.5 7C3.645 8.247 3 9.64 3 12C4.5 17 8 19.5 12 19.5C13.757 19.5 15.4295 18.9845 17 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 h-px bg-black/50 group-focus-within:bg-black group-focus-within:h-0.5 transition-all duration-200"></div>
                                    </div>
                                </div>

                                <div className="flex justify-end mb-6 mt-6">
                                    <Link to="/forgot-password" className="text-xs text-gray-700/70 hover:text-gray-900 underline underline-offset-4">
                                        Forgot password?
                                    </Link>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Signing in...
                                        </>
                                    ) : (
                                        <>
                                            <Link to="/dashboard">
                                                Login Now
                                            </Link>
                                        </>
                                    )}
                                </button>

                                <div className="mt-6 text-center">
                                    <p className="text-gray-600">
                                        Don't have an account?{' '}
                                        <Link to="/signup" className="text-black hover:text-black font-medium">
                                            Sign up
                                        </Link>
                                    </p>
                                </div>
                            </form>

                            <div className="mt-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-gray-900/10" />
                                    <div className="text-xs text-gray-700/60">or sign in with</div>
                                    <div className="h-px flex-1 bg-gray-900/10" />
                                </div>
                                <div className="mt-4 flex items-center justify-center gap-4">
                                    <button type="button" className="h-10 w-10 rounded-full bg-white/70 border border-white/70 shadow-sm hover:shadow transition flex items-center justify-center">
                                        <div className="flex justify-center space-x-4">
                                            {/* Google Icon */}
                                            <button className="p-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
                                                <svg width="24" height="24" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                                    <path fill="#EA4335" d="M24 9.5c3.3 0 6.3 1.1 8.6 3.3l6.4-6.4C34.9 2.7 29.8 0.5 24 0.5 14.6 0.5 6.5 5.9 2.7 13.8l7.5 5.8C12 13.6 17.6 9.5 24 9.5z" />
                                                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v7.8h12.7c-.3 2-1.7 5-4.9 7l7.4 5.7c4.3-4 7.3-10 7.3-17.4z" />
                                                    <path fill="#FBBC05" d="M10.2 28.4c-.6-1.8-1-3.7-1-5.9s.4-4.1 1-5.9l-7.5-5.8C1.2 14.1.3 19.1.3 24.5s.9 10.4 2.4 14.7l7.5-5.8z" />
                                                    <path fill="#34A853" d="M24 47.5c5.8 0 10.7-1.9 14.3-5.2l-7.4-5.7c-2 1.4-4.7 2.4-6.9 2.4-6.4 0-12-4.1-13.9-9.9l-7.5 5.8C6.5 42.1 14.6 47.5 24 47.5z" />
                                                </svg>
                                            </button>

                                            {/* GitHub Icon */}
                                            <button className="p-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.09.682-.22.682-.48 0-.24-.01-.87-.013-1.71-2.782.6-3.369-1.34-3.369-1.34-.455-1.16-1.11-1.47-1.11-1.47-.908-.62.07-.61.07-.61 1.004.07 1.532 1.03 1.532 1.03.892 1.53 2.341 1.09 2.91.83.09-.65.35-1.09.634-1.34-2.22-.25-4.555-1.11-4.555-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48C19.14 20.17 22 16.42 22 12c0-5.523-4.477-10-10-10z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="hidden mt-8 pt-8 border-t border-gray-200">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group">
                                        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">Create Account</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group">
                                        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">Quick Sign</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;