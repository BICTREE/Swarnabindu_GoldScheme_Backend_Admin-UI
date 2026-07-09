import apiClient from './apiClient';

export const adminApi = {
  // --- Auth ---
  login: (credentials) => 
    apiClient.post('/admin/auth/login', credentials),
  
  createAdmin: (adminData) => 
    apiClient.post('/admin/auth/create-admin', adminData),

  // --- Users & KYC ---
  getUsers: (params) => 
    apiClient.get('/admin/users', { params }),
  
  getUserById: (id) => 
    apiClient.get(`/admin/users/${id}`),
  
  banUser: (id, isBanned) => 
    apiClient.put(`/admin/users/${id}/ban`, { isBanned }),
  
  getPendingKyc: (params) => 
    apiClient.get('/admin/kyc/pending', { params }),
  
  approveKyc: (userId) => 
    apiClient.post(`/admin/kyc/${userId}/approve`),
  
  rejectKyc: (userId, reason) => 
    apiClient.post(`/admin/kyc/${userId}/reject`, { reason }),

  // --- Schemes Catalog ---
  getSchemes: (params) => 
    apiClient.get('/admin/schemes', { params }),
  
  createScheme: (schemeData) => 
    apiClient.post('/admin/schemes', schemeData),
  
  updateScheme: (id, schemeData) => 
    apiClient.put(`/admin/schemes/${id}`, schemeData),
  
  toggleSchemeActive: (id) => 
    apiClient.delete(`/admin/schemes/${id}`),
  
  getSubscriptions: (params) => 
    apiClient.get('/admin/schemes/subscriptions', { params }),

  // --- Payments ---
  getPayments: (params) => 
    apiClient.get('/admin/payments', { params }),
  
  reconcilePayment: (paymentId) => 
    apiClient.post(`/admin/payments/${paymentId}/reconcile`),

  // --- Gold Rate ---
  updateGoldRate: (rateData) => 
    apiClient.post('/admin/gold-rate/update', rateData),

  // --- Notifications ---
  broadcastAlert: (alertData) => 
    apiClient.post('/admin/notifications/broadcast', alertData),
  
  sendUserAlert: (userId, alertData) => 
    apiClient.post(`/admin/notifications/user/${userId}`, alertData),

  // --- Analytics & Diagnostics ---
  getDashboardStats: () => 
    apiClient.get('/admin/dashboard/stats'),
  
  getAuditLogs: (params) => 
    apiClient.get('/admin/audit-logs', { params })
};
