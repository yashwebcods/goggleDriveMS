import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

import AddMember from '../pages/AddMember';
import ChangePassword from '../pages/ChangePassword';
import Dashboard from '../pages/Dashboard';
import FileAccessControl from '../pages/FileAccessControl';
import FolderDetail from '../pages/FolderDetail';
import ForgotPassword from '../pages/ForgotPassword';
import Home from '../pages/Home';
import Login from '../pages/Login';
import OtpVerification from '../pages/OtpVerification';
import PrivacyPolicy from '../pages/PrivacyPolicy';
import Signup from '../pages/Signup';
import Admin from '../pages/Admin';
import Team from '../pages/Team';
import TermsOfService from '../pages/TermsOfService';

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const token = localStorage.getItem('token') || '';
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RequireRole = ({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: ReactNode;
}) => {
  const raw = localStorage.getItem('user');
  let role = '';
  try {
    role = raw ? (JSON.parse(raw)?.role || '').toString() : '';
  } catch {
    role = '';
  }

  const normalizedRole = role.toLowerCase();
  const normalizedAllowed = allowedRoles.map((r) => String(r || '').toLowerCase());

  if (!normalizedAllowed.includes(normalizedRole)) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  const token = localStorage.getItem('token') || '';

  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
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
      <Route
        path="/folders/:folderId"
        element={
          <RequireAuth>
            <FolderDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/access-control"
        element={
          <RequireAuth>
            <RequireRole allowedRoles={["manager", "admin", "superadmin"]}>
              <FileAccessControl />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/add-member"
        element={
          <RequireAuth>
            <AddMember />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole allowedRoles={["admin", "superadmin"]}>
              <Admin />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/team"
        element={
          <RequireAuth>
            <Team />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
