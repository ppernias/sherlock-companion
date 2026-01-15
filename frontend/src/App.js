import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { CircularProgress, Box } from '@mui/material';
import theme from './styles/theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PinPage from './pages/PinPage';
import LoginPage from './pages/LoginPage';
import GameMode from './pages/GameMode';
import AdminPanel from './pages/AdminPanel';

// Protected Route for Game Access
function GameRoute({ children }) {
  const { isGameAccess, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!isGameAccess) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Protected Route for Admin Access
function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function AppRoutes() {
  const { isGameAccess, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Routes>
      {/* PIN Page (Home) */}
      <Route
        path="/"
        element={isGameAccess ? <Navigate to="/game" replace /> : <PinPage />}
      />

      {/* Game Mode */}
      <Route
        path="/game"
        element={
          <GameRoute>
            <GameMode />
          </GameRoute>
        }
      />

      {/* Admin Login */}
      <Route
        path="/admin"
        element={isAdmin ? <Navigate to="/admin/dashboard" replace /> : <LoginPage />}
      />

      {/* Admin Dashboard */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
