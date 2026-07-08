import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './routes/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';

// Features lazy/direct loading
import Login from './features/Auth/Login';
import Dashboard from './features/Dashboard/Dashboard';
import UsersList from './features/Users/UsersList';
import SchemesCatalog from './features/Schemes/SchemesCatalog';
import PaymentsList from './features/Payments/PaymentsList';
import OperationsControl from './features/Operations/OperationsControl';
import NotFound from './features/Errors/NotFound';
import Unauthorized from './features/Errors/Unauthorized';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Protected Admin Routes */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="users" element={<UsersList />} />
                <Route path="schemes" element={<SchemesCatalog />} />
                <Route path="payments" element={<PaymentsList />} />
                <Route path="notifications" element={<OperationsControl />} />
                <Route path="audit-logs" element={<OperationsControl />} />
                <Route path="rates" element={<OperationsControl />} />
              </Route>

              {/* Fallbacks */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
