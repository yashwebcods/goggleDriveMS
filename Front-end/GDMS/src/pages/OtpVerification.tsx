import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const OtpVerification = () => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = (e: any) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      navigate('/change-password');
    }, 900);
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
      <g filter="url(#blur)" opacity="0.95">
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
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">OTP verification</h2>
          <p className="text-gray-700/70 text-center mb-8 text-sm leading-relaxed">Enter the 6-digit code sent to your email</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-2">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4h12v12H4V4zm2 2v2h2V6H6zm0 4v2h2v-2H6zm4-4v2h2V6h-2zm0 4v2h2v-2h-2zm4-4v2h2V6h-2zm0 4v2h2v-2h-2z" />
                  </svg>
                </div>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  className="block w-full pl-10 pr-3 py-3.5 bg-transparent border-0 rounded-none text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0"
                  placeholder="Enter OTP"
                  required
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-black/50 group-focus-within:bg-black group-focus-within:h-0.5 transition-all duration-200" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full bg-gray-900 hover:bg-black text-white font-semibold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center"
            >
              {isLoading ? 'Verifying…' : 'Verify OTP'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-700/70">
            <Link to="/forgot-password" className="text-gray-900 underline underline-offset-4">
              Change email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
