import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userService } from '../services/user.services';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await userService.sendOtp(email);
      if (!result?.success) {
        setError(result?.message || `Failed to send OTP (HTTP ${result?.status ?? 'unknown'})`);
        setIsLoading(false);
        return;
      }

      setSuccess(result?.message || 'Email verified successfully. OTP sent to your email.');
      setIsLoading(false);

      setTimeout(() => {
        const otpExpiresAt = (result as any)?.data?.otpExpiresAt;
        const expiresAtParam = otpExpiresAt ? `&expiresAt=${encodeURIComponent(String(otpExpiresAt))}` : '';
        navigate(`/otp?email=${encodeURIComponent(email)}${expiresAtParam}`);
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
        <path d="M110 720 C 110 690, 140 666, 175 672 C 188 640, 224 620, 262 632 C 282 604, 320 590, 356 602 C 382 572, 430 566, 462 594 C 488 578, 524 584, 540 608 C 582 602, 620 628, 624 664 C 660 674, 684 704, 676 736 C 676 770, 644 798, 604 796 L 188 796 C 144 798, 110 764, 110 720 Z" fill="#FFFFFF"/>
        <path d="M860 700 C 860 670, 892 646, 928 654 C 946 624, 982 606, 1018 620 C 1038 594, 1074 584, 1106 602 C 1134 578, 1176 578, 1206 602 C 1230 588, 1264 596, 1280 620 C 1318 618, 1350 644, 1352 676 C 1390 688, 1414 722, 1404 756 C 1404 792, 1370 822, 1328 820 L 942 820 C 896 822, 860 788, 860 700 Z" fill="#FFFFFF"/>
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
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Forgot password</h2>
          <p className="text-gray-700/70 text-center mb-8 text-sm leading-relaxed">Enter your email and we will send you a verification code</p>

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

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full bg-gray-900 hover:bg-black text-white font-semibold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center"
            >
              {isLoading ? 'Sending…' : 'Send OTP'}
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

export default ForgotPassword;
