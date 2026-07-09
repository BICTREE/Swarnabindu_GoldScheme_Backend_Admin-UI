import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  HelpCircle,
  Clock,
  XCircle,
  Unlock
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAuth } from '../../hooks/useAuth';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useToast } from '../../components/Toast';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';

export default function PaymentsList() {
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Reconciliation Confirmation Modal State
  const [reconPaymentId, setReconPaymentId] = useState(null);
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);

  // Fetch Payments Query
  const { data, isLoading } = useQuery({
    queryKey: ['adminPayments', { status, page }],
    queryFn: () => adminApi.getPayments({
      status: status || undefined,
      page,
      limit: 10
    })
  });

  const payments = data?.data?.payments || [];
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

  // --- RECONCILE MUTATION ---
  const reconcileMutation = useMutation({
    mutationFn: adminApi.reconcilePayment,
    onSuccess: () => {
      toast('Payment manually reconciled and gold weight credited.', 'success');
      queryClient.invalidateQueries(['adminPayments']);
      setIsReconModalOpen(false);
      setReconPaymentId(null);
    },
    onError: (err) => {
      toast(err.message || 'Manual reconciliation failed.', 'error');
    }
  });

  const handleOpenReconcile = (paymentId) => {
    if (!isSuperAdmin()) {
      toast('Access Denied: Only SUPER_ADMIN users can reconcile payments.', 'error');
      return;
    }
    setReconPaymentId(paymentId);
    setIsReconModalOpen(true);
  };

  const confirmReconcile = () => {
    if (!reconPaymentId) return;
    reconcileMutation.mutate(reconPaymentId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-obsidian-50 font-display tracking-tight">
          Financial Transactions Ledger
        </h1>
        <p className="text-xs text-obsidian-200 mt-1">
          Monitor system savings deposits, view Razorpay receipts, and manually credit pending payments.
        </p>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-obsidian-950 border border-obsidian-800">
        <div className="w-full sm:w-64">
          <select
            className="w-full bg-obsidian-900 border border-obsidian-800 rounded-lg px-3.5 py-2.5 text-xs text-obsidian-100 outline-none focus:border-gold transition-colors appearance-none cursor-pointer"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Payment Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="SUCCESSFUL">SUCCESSFUL</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        <div className="text-xs text-obsidian-200 font-semibold uppercase tracking-wider font-display pr-2">
          Total Transactions: {pagination.total} Records
        </div>
      </div>

      {/* Role Notice Card for non-Super Admins */}
      {!isSuperAdmin() && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-950/20 border border-amber-950/40 text-xs text-amber-200">
          <HelpCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold">Privilege Restriction Alert</span>: Manual payment reconciliation is restricted strictly to the <span className="font-bold underline">SUPER_ADMIN</span> role. Your moderator/support session is read-only for these actions.
          </div>
        </div>
      )}

      {/* Conditional Table or Card View */}
      {isMobile ? (
        // Mobile Cards
        <div className="space-y-4">
          {isLoading ? (
            [...Array(2)].map((_, i) => (
              <div key={i} className="glass-panel p-5 rounded-2xl animate-pulse space-y-3">
                <div className="h-4 bg-obsidian-800 rounded w-1/3" />
                <div className="h-4 bg-obsidian-800 rounded w-2/3" />
              </div>
            ))
          ) : payments.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-obsidian-200">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-obsidian-200/50" />
              No transactions registered.
            </div>
          ) : (
            payments.map((pay) => (
              <div key={pay._id} className="glass-panel p-5 rounded-2xl space-y-3 border-obsidian-800/80">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-sm text-obsidian-50 truncate max-w-[180px]">
                      {pay.transactionId || 'PENDING_ORDER'}
                    </h4>
                    <p className="text-xs text-obsidian-200 mt-0.5">{pay.userId?.mobileNumber || '---'}</p>
                  </div>
                  <Badge variant={
                    pay.status === 'SUCCESSFUL' ? 'success' :
                    pay.status === 'PENDING' ? 'warning' : 'danger'
                  }>
                    {pay.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs border-y border-obsidian-800/60 py-3">
                  <div>
                    <span className="text-obsidian-200 block mb-0.5">Amount</span>
                    <span className="font-medium text-obsidian-50">₹{pay.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-obsidian-200 block mb-0.5">Gold Gained</span>
                    <span className="font-semibold text-gold">{pay.goldGained ? `${pay.goldGained.toFixed(3)} g` : '---'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-obsidian-200 block mb-0.5">Paid Date</span>
                    <span className="font-medium text-obsidian-50">
                      {pay.paidAt ? new Date(pay.paidAt).toLocaleDateString() : '---'}
                    </span>
                  </div>
                </div>

                {pay.status === 'PENDING' && (
                  <Button
                    disabled={!isSuperAdmin()}
                    onClick={() => handleOpenReconcile(pay._id)}
                    variant="secondary"
                    className={`w-full py-3 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]
                      ${isSuperAdmin() 
                        ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/20' 
                        : 'opacity-40 cursor-not-allowed'}`}
                  >
                    <Unlock className="w-4 h-4" />
                    Reconcile
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        // Tablet & Desktop Tables
        <div className="glass-panel rounded-2xl overflow-hidden shadow-premium">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-obsidian-200">
              <thead>
                <tr className="border-b border-obsidian-800 bg-obsidian-950/50 text-xs font-semibold text-obsidian-200 uppercase tracking-wider font-display">
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Client Mobile</th>
                  <th className="px-6 py-4">Installment (₹)</th>
                  <th className="px-6 py-4">Gold Gained</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-800">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/2" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/3" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/4" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/4" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/3" /></td>
                      <td className="px-6 py-4"><div className="h-6 bg-obsidian-800 rounded-full w-20" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-8 bg-obsidian-800 rounded w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-obsidian-200">
                      <CreditCard className="w-10 h-10 mx-auto mb-3 text-obsidian-200/55" />
                      No transactions registered in log history.
                    </td>
                  </tr>
                ) : (
                  payments.map((pay) => (
                    <tr key={pay._id} className="hover:bg-obsidian-900/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-obsidian-50">{pay.transactionId || 'PENDING_ORDER'}</td>
                      <td className="px-6 py-4">{pay.userId?.mobileNumber || '---'}</td>
                      <td className="px-6 py-4">₹{pay.amount.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 font-semibold text-gold">
                        {pay.goldGained ? `${pay.goldGained.toFixed(3)} g` : '---'}
                      </td>
                      <td className="px-6 py-4">
                        {pay.paidAt 
                          ? new Date(pay.paidAt).toLocaleDateString()
                          : '---'
                        }
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          pay.status === 'SUCCESSFUL' ? 'success' :
                          pay.status === 'PENDING' ? 'warning' : 'danger'
                        }>
                          {pay.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {pay.status === 'PENDING' && (
                          <button
                            disabled={!isSuperAdmin()}
                            onClick={() => handleOpenReconcile(pay._id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-lg transition-all duration-200
                              ${isSuperAdmin()
                                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-obsidian-950'
                                : 'bg-obsidian-900 border-obsidian-800 text-obsidian-200 opacity-40 cursor-not-allowed'
                              }`}
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Reconcile
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {pagination.pages > 1 && (
        <div className="px-6 py-4 border-t border-obsidian-800 bg-obsidian-950/40 flex items-center justify-between rounded-xl">
          <span className="text-xs text-obsidian-200">
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === pagination.pages}
              onClick={() => setPage(prev => Math.min(prev + 1, pagination.pages))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Reconcile Confirmation Modal */}
      <Modal
        isOpen={isReconModalOpen}
        onClose={() => setIsReconModalOpen(false)}
        title="Confirm Payment Reconciliation"
      >
        <div className="space-y-4">
          <p className="text-sm text-obsidian-200">
            Are you sure you want to reconcile this pending transaction?
            Manual reconciliation forces the transaction status to <span className="font-semibold text-emerald-400">SUCCESSFUL</span>, calculates the gold weight purchased based on the current gold rate, and credits it directly to the user's active savings scheme.
          </p>
          <div className="flex justify-end gap-3 border-t border-obsidian-800 pt-4">
            <Button variant="secondary" onClick={() => setIsReconModalOpen(false)} className="min-h-[44px] px-5">Cancel</Button>
            <Button
              variant="primary"
              isLoading={reconcileMutation.isLoading}
              onClick={confirmReconcile}
              className="min-h-[44px] px-5"
            >
              Reconcile & Credit Gold
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
