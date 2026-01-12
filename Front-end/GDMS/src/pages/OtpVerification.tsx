import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { userService } from '../services/user.services';

const OtpVerification = () => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [timeLeft, setTimeLeft] = useState(2 * 60); // 6 minutes in seconds
  const [canResendAt, setCanResendAt] = useState<number | null>(null);
  const [isResending, setIsResending] = useState(false);

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
    // Start countdown when component mounts or email changes
    setTimeLeft(2 * 60);
    setCanResendAt(Date.now() + 2 * 60 * 1000); // can resend after 2 minutes
  }, [location.search, navigate]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    setSuccess('');
    try {
      const result = await userService.sendOtp(email);
      if (!result?.success) {
        setError(result?.message || 'Failed to resend OTP');
        setIsResending(false);
        return;
      }
      setSuccess('OTP resent successfully');
      // Reset countdown: 6 minutes from now, can resend after 2 minutes
      setTimeLeft(6 * 60);
      setCanResendAt(Date.now() + 2 * 60 * 1000);
      setIsResending(false);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
      setIsResending(false);
    }
  };

  // Format remaining time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const now = Date.now();
  const showResend = canResendAt !== null && now >= canResendAt && timeLeft > 0;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await userService.verifyOtp(email, otp);
      if (!result?.success) {
        setError(result?.message || `OTP verification failed (HTTP ${result?.status ?? 'unknown'})`);
        setIsLoading(false);
        return;
      }

      setSuccess(result?.message || 'OTP verified successfully');
      setIsLoading(false);

      setTimeout(() => {
        navigate(`/change-password?email=${encodeURIComponent(email)}`);
      }, 800);
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

          <div className="mt-6 text-center text-sm">
            {timeLeft > 0 ? (
              <span className="text-gray-700/70">
                OTP expires in <span className="font-medium text-gray-900">{formatTime(timeLeft)}</span>
              </span>
            ) : (
              <span className="text-red-600 font-medium">OTP expired</span>
            )}
            {showResend && (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                className="ml-4 text-gray-900 underline underline-offset-4 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? 'Resending…' : 'Resend OTP'}
              </button>
            )}
          </div>

          <div className="mt-2 text-center text-sm text-gray-700/70">
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
