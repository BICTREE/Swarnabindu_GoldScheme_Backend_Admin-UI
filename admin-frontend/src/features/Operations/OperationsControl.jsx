import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Bell, 
  Coins, 
  FileText, 
  Send, 
  RefreshCw, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAuth } from '../../hooks/useAuth';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';

// Validation Schemas
const rateSchema = z.object({
  rate22K_per_g: z.coerce.number().min(1000, 'Gold rate per gram must be realistic'),
  rate24K_per_8g: z.coerce.number().min(10000, '8g Sovereign rate must be realistic')
});

const broadcastSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  message: z.string().min(5, 'Message must be at least 5 characters')
});

const targetedSchema = z.object({
  userId: z.string().min(10, 'Please provide a valid client user MongoDB ID'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  message: z.string().min(5, 'Message must be at least 5 characters')
});

export default function OperationsControl() {
  const { isSuperAdmin, isModerator } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();
  const queryClient = useQueryClient();

  const location = useLocation();
  
  // Tabs: 'rates' | 'broadcast' | 'audit'
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('notifications')) return 'broadcast';
    if (location.pathname.includes('audit-logs')) return 'audit';
    return 'rates';
  });

  // Sync tab if route changes
  useEffect(() => {
    if (location.pathname.includes('notifications')) {
      setActiveTab('broadcast');
    } else if (location.pathname.includes('audit-logs')) {
      setActiveTab('audit');
    } else {
      setActiveTab('rates');
    }
  }, [location.pathname]);

  const [auditPage, setAuditPage] = useState(1);

  // Fetch Audit Logs Query (only enabled on audit tab + super admin check)
  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ['adminAuditLogs', { page: auditPage }],
    queryFn: () => adminApi.getAuditLogs({ page: auditPage, limit: 15 }),
    enabled: activeTab === 'audit' && isSuperAdmin()
  });

  const auditLogs = auditData?.data?.logs || [];
  const pagination = auditData?.data?.pagination || { page: 1, pages: 1, total: 0 };

  // --- FORMS ---
  const {
    register: regRate,
    handleSubmit: handleRateSubmit,
    reset: resetRate,
    formState: { errors: rateErrors }
  } = useForm({ resolver: zodResolver(rateSchema) });

  const {
    register: regBroadcast,
    handleSubmit: handleBroadcastSubmit,
    reset: resetBroadcast,
    formState: { errors: broadcastErrors }
  } = useForm({ resolver: zodResolver(broadcastSchema) });

  const {
    register: regTargeted,
    handleSubmit: handleTargetedSubmit,
    reset: resetTargeted,
    formState: { errors: targetedErrors }
  } = useForm({ resolver: zodResolver(targetedSchema) });

  // --- MUTATIONS ---
  const rateMutation = useMutation({
    mutationFn: adminApi.updateGoldRate,
    onSuccess: (res) => {
      toast('Live gold rate overrides updated and broadcasted.', 'success');
      resetRate();
    },
    onError: (err) => {
      toast(err.message || 'Failed to update gold rate.', 'error');
    }
  });

  const broadcastMutation = useMutation({
    mutationFn: adminApi.broadcastAlert,
    onSuccess: (res) => {
      toast(`Alert broadcasted successfully. Queued for delivery.`, 'success');
      resetBroadcast();
    },
    onError: (err) => {
      toast(err.message || 'Failed to broadcast notification.', 'error');
    }
  });

  const targetedMutation = useMutation({
    mutationFn: ({ userId, data }) => adminApi.sendUserAlert(userId, data),
    onSuccess: () => {
      toast('Targeted user alert notification sent successfully.', 'success');
      resetTargeted();
    },
    onError: (err) => {
      toast(err.message || 'Failed to dispatch targeted alert.', 'error');
    }
  });

  // Submit Handlers
  const onRateSubmit = (data) => {
    rateMutation.mutate(data);
  };

  const onBroadcastSubmit = (data) => {
    broadcastMutation.mutate(data);
  };

  const onTargetedSubmit = (data) => {
    const { userId, ...rest } = data;
    targetedMutation.mutate({ userId, data: rest });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-obsidian-50 font-display tracking-tight">
          Operations Control Panel
        </h1>
        <p className="text-xs text-obsidian-200 mt-1">
          Adjust live pricing, dispatch mobile alerts, and audit administrative actions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-obsidian-800">
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider font-display border-b-2 transition-all flex items-center gap-2
            ${activeTab === 'rates' ? 'border-gold text-gold font-bold' : 'border-transparent text-obsidian-200 hover:text-obsidian-50'}`}
        >
          <Coins className="w-4 h-4" />
          Gold Rate Override
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider font-display border-b-2 transition-all flex items-center gap-2
            ${activeTab === 'broadcast' ? 'border-gold text-gold font-bold' : 'border-transparent text-obsidian-200 hover:text-obsidian-50'}`}
        >
          <Bell className="w-4 h-4" />
          Push Announcements
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider font-display border-b-2 transition-all flex items-center gap-2
            ${activeTab === 'audit' ? 'border-gold text-gold font-bold' : 'border-transparent text-obsidian-200 hover:text-obsidian-50'}`}
        >
          <FileText className="w-4 h-4" />
          System Audit Logs
        </button>
      </div>

      {/* Tab content: Gold rates */}
      {activeTab === 'rates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-obsidian-50 uppercase tracking-wider font-display mb-1">
                  Manual Gold Rate Adjustment
                </h3>
                <p className="text-xs text-obsidian-200">
                  Override the dynamic daily API gold prices. Overrides directly affect gold purchase calculations during user installment checks.
                </p>
              </div>

              <form onSubmit={handleRateSubmit(onRateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="22K Gold Rate (per gram in ₹)"
                    type="number"
                    placeholder="7012.5"
                    error={rateErrors.rate22K_per_g?.message}
                    {...regRate('rate22K_per_g')}
                  />
                  <Input
                    label="24K Gold Rate (per 8g sovereign in ₹)"
                    type="number"
                    placeholder="56100"
                    error={rateErrors.rate24K_per_8g?.message}
                    {...regRate('rate24K_per_8g')}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={!isModerator()}
                    isLoading={rateMutation.isLoading}
                    className="flex gap-2 text-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Apply Rate Override
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-sm font-semibold text-obsidian-50 uppercase tracking-wider font-display">
                Pricing Parameters
              </h3>
              <p className="text-xs text-obsidian-200 leading-relaxed">
                By default, the platform uses automated price feeds. Manually overriding prices locks the rates until next midnight or until cleared. Ensure standard market checks before updating.
              </p>
            </div>
            {!isModerator() && (
              <div className="text-xs text-rose-400 mt-4">
                Moderator or Super Admin role is required to submit rate overrides.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab content: Push Announcements */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Broadcast Form */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-obsidian-50 uppercase tracking-wider font-display mb-1">
                Global Alert Broadcast
              </h3>
              <p className="text-xs text-obsidian-200">
                Dispatches a high-priority system-wide push notification to all active client devices.
              </p>
            </div>

            <form onSubmit={handleBroadcastSubmit(onBroadcastSubmit)} className="space-y-4">
              <Input
                label="Notification Title"
                placeholder="Platform Maintenance / Gold Price Drops"
                error={broadcastErrors.title?.message}
                {...regBroadcast('title')}
              />

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-obsidian-200 uppercase tracking-wider font-display">
                  Message Body
                </label>
                <textarea
                  placeholder="Type alert contents here..."
                  rows={4}
                  className="w-full bg-obsidian-950 border text-sm text-obsidian-50 rounded-lg px-3.5 py-2.5 outline-none border-obsidian-700 focus:border-gold focus:ring-1 focus:ring-gold"
                  {...regBroadcast('message')}
                />
                {broadcastErrors.message && (
                  <span className="text-xs text-rose-500 font-medium">{broadcastErrors.message.message}</span>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!isModerator()}
                  isLoading={broadcastMutation.isLoading}
                  className="flex gap-2 text-xs"
                >
                  <Send className="w-4 h-4" />
                  Broadcast Alert
                </Button>
              </div>
            </form>
          </div>

          {/* Targeted Form */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-obsidian-50 uppercase tracking-wider font-display mb-1">
                Targeted User Alert
              </h3>
              <p className="text-xs text-obsidian-200">
                Dispatches a direct push notification alert to a specific client user by their profile database ID.
              </p>
            </div>

            <form onSubmit={handleTargetedSubmit(onTargetedSubmit)} className="space-y-4">
              <Input
                label="Client User MongoDB ID"
                placeholder="609b1a2b3c4d5e6f7a8b9c0d"
                error={targetedErrors.userId?.message}
                {...regTargeted('userId')}
              />

              <Input
                label="Notification Title"
                placeholder="KYC Correction Needed / Payment Outstanding"
                error={targetedErrors.title?.message}
                {...regTargeted('title')}
              />

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-obsidian-200 uppercase tracking-wider font-display">
                  Message Body
                </label>
                <textarea
                  placeholder="Provide targeted remarks..."
                  rows={3}
                  className="w-full bg-obsidian-950 border text-sm text-obsidian-50 rounded-lg px-3.5 py-2.5 outline-none border-obsidian-700 focus:border-gold focus:ring-1 focus:ring-gold"
                  {...regTargeted('message')}
                />
                {targetedErrors.message && (
                  <span className="text-xs text-rose-500 font-medium">{targetedErrors.message.message}</span>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!isModerator()}
                  isLoading={targetedMutation.isLoading}
                  className="flex gap-2 text-xs"
                >
                  <Send className="w-4 h-4" />
                  Send Targeted Alert
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab content: System Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {!isSuperAdmin() ? (
            <div className="glass-panel p-12 text-center rounded-2xl max-w-lg mx-auto border-rose-500/20">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="text-base font-bold font-display text-obsidian-50">Privileged Logs Locked</h3>
              <p className="text-xs text-obsidian-200 mt-2">
                System-level diagnosis and administrator audit logs are restricted exclusively to the <span className="font-bold">SUPER_ADMIN</span> role to preserve system security policies.
              </p>
            </div>
          ) : (
            <>
              {isMobile ? (
                // Mobile Audit Log Cards
                <div className="space-y-4">
                  {isAuditLoading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="glass-panel p-5 rounded-2xl animate-pulse space-y-3">
                        <div className="h-4 bg-obsidian-800 rounded w-1/4" />
                        <div className="h-4 bg-obsidian-800 rounded w-2/3" />
                      </div>
                    ))
                  ) : auditLogs.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-8 text-center text-obsidian-200">
                      No administrative audit logs recorded.
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log._id} className="glass-panel p-5 rounded-2xl space-y-3 border-obsidian-800/80">
                        <div className="flex justify-between items-start">
                          <Badge variant="gold">{log.action}</Badge>
                          <span className="text-[10px] text-obsidian-200">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs border-t border-obsidian-800/60 pt-3">
                          <div>
                            <span className="text-obsidian-200 block mb-0.5">Admin Agent</span>
                            <span className="font-semibold text-obsidian-50">{log.adminId?.name || 'Super Admin'}</span>
                          </div>
                          <div>
                            <span className="text-obsidian-200 block mb-0.5">Resource Target</span>
                            <span className="font-medium text-obsidian-50">{log.targetEntity}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                // Tablet/Desktop Audit Log Table
                <div className="glass-panel rounded-2xl overflow-hidden shadow-premium">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm text-obsidian-200">
                      <thead>
                        <tr className="border-b border-obsidian-800 bg-obsidian-950/50 text-xs font-semibold text-obsidian-200 uppercase tracking-wider font-display">
                          <th className="px-6 py-4">Action</th>
                          <th className="px-6 py-4">Admin Agent</th>
                          <th className="px-6 py-4">Admin Email</th>
                          <th className="px-6 py-4">Target Resource</th>
                          <th className="px-6 py-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-obsidian-800">
                        {isAuditLoading ? (
                          [...Array(5)].map((_, i) => (
                            <tr key={i} className="animate-pulse">
                              <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-2/3" /></td>
                              <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/2" /></td>
                              <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/2" /></td>
                              <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/4" /></td>
                              <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/3" /></td>
                            </tr>
                          ))
                        ) : auditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-obsidian-200">
                              No administrative audit logs recorded.
                            </td>
                          </tr>
                        ) : (
                          auditLogs.map((log) => (
                            <tr key={log._id} className="hover:bg-obsidian-900/20 transition-colors">
                              <td className="px-6 py-4 font-semibold text-obsidian-50">
                                <Badge variant="gold">{log.action}</Badge>
                              </td>
                              <td className="px-6 py-4">{log.adminId?.name || 'Super Admin'}</td>
                              <td className="px-6 py-4">{log.adminId?.email || '---'}</td>
                              <td className="px-6 py-4 text-obsidian-200 font-medium">{log.targetEntity}</td>
                              <td className="px-6 py-4">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-obsidian-800 bg-obsidian-950/40 flex items-center justify-between rounded-xl mt-4">
                  <span className="text-xs text-obsidian-200">
                    Page {auditPage} of {pagination.pages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={auditPage === 1}
                      onClick={() => setAuditPage(prev => Math.max(prev - 1, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={auditPage === pagination.pages}
                      onClick={() => setAuditPage(prev => Math.min(prev + 1, pagination.pages))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
