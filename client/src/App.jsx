import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Replace placeholder divs with your actual dashboard components when ready:
// import AdminDashboard from './pages/AdminDashboard';
// import RecruiterDashboard from './pages/RecruiterDashboard';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;       
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/recruiter'} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, userRole } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/recruiter'} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Firebase redirects here with ?oobCode=... after user clicks the reset email link */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <div className="p-8 text-xl font-bold">Admin Dashboard</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
            <div className="p-8 text-xl font-bold">Recruiter Dashboard</div>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;