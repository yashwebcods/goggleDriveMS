import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

import ChangePassword from '../pages/ChangePassword';
import Dashboard from '../pages/Dashboard';
import ForgotPassword from '../pages/ForgotPassword';
import Login from '../pages/Login';
import OtpVerification from '../pages/OtpVerification';
import Signup from '../pages/Signup';

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const token = localStorage.getItem('token') || '';
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/otp" element={<OtpVerification />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
