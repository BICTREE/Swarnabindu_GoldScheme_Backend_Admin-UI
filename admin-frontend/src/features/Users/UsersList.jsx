import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Ban, 
  CheckCircle, 
  XCircle, 
  Eye, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAuth } from '../../hooks/useAuth';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useToast } from '../../components/Toast';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { SheetDrawer } from '../../components/SheetDrawer';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function UsersList() {
  const { isModerator } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();
  const queryClient = useQueryClient();

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [kycStatus, setKycStatus] = useState('');
  const [isBanned, setIsBanned] = useState('');
  const [page, setPage] = useState(1);

  // Detail Drawer & Confirm Dialog States
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [banUserObj, setBanUserObj] = useState(null); // { id, isBanned }
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);

  const [rejectUserId, setRejectUserId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Fetch Users List Query
  const { data, isLoading } = useQuery({
    queryKey: ['usersList', { search, kycStatus, isBanned, page }],
    queryFn: () => adminApi.getUsers({
      search: search || undefined,
      kycStatus: kycStatus || undefined,
      isBanned: isBanned !== '' ? isBanned : undefined,
      page,
      limit: 10
    })
  });

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

  // --- MUTATIONS ---
  const banMutation = useMutation({
    mutationFn: ({ id, banned }) => adminApi.banUser(id, banned),
    onSuccess: (res) => {
      toast(res.message || 'User ban status updated successfully.', 'success');
      queryClient.invalidateQueries(['usersList']);
      setIsBanModalOpen(false);
      setBanUserObj(null);
      if (selectedUser && selectedUser._id === banUserObj.id) {
        setIsDetailOpen(false);
      }
    },
    onError: (err) => {
      toast(err.message || 'Failed to update ban status.', 'error');
    }
  });

  const approveKycMutation = useMutation({
    mutationFn: adminApi.approveKyc,
    onSuccess: () => {
      toast('Client KYC verified and approved successfully.', 'success');
      queryClient.invalidateQueries(['usersList']);
      setIsDetailOpen(false);
    },
    onError: (err) => {
      toast(err.message || 'Failed to approve KYC.', 'error');
    }
  });

  const rejectKycMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.rejectKyc(id, reason),
    onSuccess: () => {
      toast('Client KYC request rejected and notification sent.', 'success');
      queryClient.invalidateQueries(['usersList']);
      setIsRejectModalOpen(false);
      setIsDetailOpen(false);
      setRejectReason('');
    },
    onError: (err) => {
      toast(err.message || 'Failed to reject KYC.', 'error');
    }
  });

  // Action Helpers
  const handleOpenDetail = async (userId) => {
    try {
      const res = await adminApi.getUserById(userId);
      setSelectedUser(res.data.user);
      setIsDetailOpen(true);
    } catch (e) {
      toast('Unable to fetch client profile details.', 'error');
    }
  };

  const confirmBan = (id, currentBanStatus) => {
    setBanUserObj({ id, isBanned: !currentBanStatus });
    setIsBanModalOpen(true);
  };

  const handleApprove = () => {
    if (!selectedUser) return;
    approveKycMutation.mutate(selectedUser._id);
  };

  const handleReject = () => {
    if (!selectedUser) return;
    setRejectUserId(selectedUser._id);
    setIsRejectModalOpen(true);
  };

  const submitReject = () => {
    if (!rejectReason.trim()) {
      toast('Please supply a reason for rejecting the KYC request.', 'error');
      return;
    }
    rejectKycMutation.mutate({ id: rejectUserId, reason: rejectReason });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-obsidian-50 font-display tracking-tight">
          Accounts & KYC Verification
        </h1>
        <p className="text-xs text-obsidian-200 mt-1">
          Review user profiles, verify upload credentials, and toggle account restrictions.
        </p>
      </div>

      {/* Filter panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-obsidian-950 border border-obsidian-800">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-obsidian-200" />
          <input
            type="text"
            placeholder="Search phone or email..."
            className="w-full bg-obsidian-900 border border-obsidian-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-obsidian-100 placeholder-obsidian-200 outline-none focus:border-gold transition-colors"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="relative">
          <select
            className="w-full bg-obsidian-900 border border-obsidian-800 rounded-lg px-3.5 py-2.5 text-xs text-obsidian-100 outline-none focus:border-gold transition-colors appearance-none cursor-pointer"
            value={kycStatus}
            onChange={(e) => { setKycStatus(e.target.value); setPage(1); }}
          >
            <option value="">All KYC Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div className="relative">
          <select
            className="w-full bg-obsidian-900 border border-obsidian-800 rounded-lg px-3.5 py-2.5 text-xs text-obsidian-100 outline-none focus:border-gold transition-colors appearance-none cursor-pointer"
            value={isBanned}
            onChange={(e) => { setIsBanned(e.target.value); setPage(1); }}
          >
            <option value="">All Banned States</option>
            <option value="true">Banned</option>
            <option value="false">Active</option>
          </select>
        </div>

        <div className="flex items-center justify-start sm:justify-end text-xs text-obsidian-200 font-semibold uppercase tracking-wider font-display pr-2">
          Total: {pagination.total} Records
        </div>
      </div>

      {/* Conditional Rendering: Mobile Cards vs Desktop Table */}
      {isMobile ? (
        // MOBILE CARD LIST VIEW
        <div className="space-y-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="glass-panel p-5 rounded-2xl animate-pulse space-y-3">
                <div className="h-4 bg-obsidian-800 rounded w-1/3" />
                <div className="h-4 bg-obsidian-800 rounded w-2/3" />
                <div className="h-10 bg-obsidian-800 rounded-lg w-full mt-2" />
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-obsidian-200">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-obsidian-200/50" />
              No registered clients found.
            </div>
          ) : (
            users.map((user) => (
              <div key={user._id} className="glass-panel p-5 rounded-2xl space-y-4 border-obsidian-800/80">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-obsidian-50">{user.mobileNumber}</span>
                  <Badge variant={
                    user.kycStatus === 'APPROVED' ? 'success' :
                    user.kycStatus === 'SUBMITTED' ? 'warning' :
                    user.kycStatus === 'REJECTED' ? 'danger' : 'muted'
                  }>
                    {user.kycStatus}
                  </Badge>
                </div>

                {/* Details list */}
                <div className="grid grid-cols-2 gap-3 text-xs border-y border-obsidian-800/60 py-3">
                  <div>
                    <span className="text-obsidian-200 block mb-0.5">Name</span>
                    <span className="font-medium text-obsidian-50 truncate block">
                      {user.kycDetails?.personalInfo?.fullName || '---'}
                    </span>
                  </div>
                  <div>
                    <span className="text-obsidian-200 block mb-0.5">Account Status</span>
                    <Badge variant={user.isBanned ? 'danger' : 'success'} className="mt-0.5">
                      {user.isBanned ? 'Banned' : 'Active'}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <Button
                  onClick={() => handleOpenDetail(user._id)}
                  variant="secondary"
                  className="w-full py-3 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Eye className="w-4 h-4" />
                  Inspect Profile
                </Button>
              </div>
            ))
          )}
        </div>
      ) : (
        // DESKTOP & TABLET TABLE VIEW
        <div className="glass-panel rounded-2xl overflow-hidden shadow-premium">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-obsidian-200">
              <thead>
                <tr className="border-b border-obsidian-800 bg-obsidian-950/50 text-xs font-semibold text-obsidian-200 uppercase tracking-wider font-display">
                  <th className="px-6 py-4">Client Mobile</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">KYC State</th>
                  <th className="px-6 py-4">Account Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-800">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-2/3" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/2" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-4/5" /></td>
                      <td className="px-6 py-4"><div className="h-6 bg-obsidian-800 rounded-full w-20" /></td>
                      <td className="px-6 py-4"><div className="h-6 bg-obsidian-800 rounded-full w-16" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-8 bg-obsidian-800 rounded w-12 ml-auto" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-obsidian-200">
                      <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-obsidian-200/55" />
                      No registered clients found matching criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="hover:bg-obsidian-900/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-obsidian-50">{user.mobileNumber}</td>
                      <td className="px-6 py-4">{user.kycDetails?.personalInfo?.fullName || '---'}</td>
                      <td className="px-6 py-4">{user.kycDetails?.personalInfo?.email || '---'}</td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          user.kycStatus === 'APPROVED' ? 'success' :
                          user.kycStatus === 'SUBMITTED' ? 'warning' :
                          user.kycStatus === 'REJECTED' ? 'danger' : 'muted'
                        }>
                          {user.kycStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.isBanned ? 'danger' : 'success'}>
                          {user.isBanned ? 'Banned' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(user._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-obsidian-800 border border-obsidian-700 text-xs font-semibold rounded-lg text-gold hover:bg-gold hover:text-obsidian-950 transition-all duration-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </button>
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

      {/* --- DRAWERS & MODALS --- */}

      {/* User Detailed Inspection Sheet */}
      <SheetDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Client Profile Vault"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Quick Profile Summary */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-obsidian-900 border border-obsidian-800">
              <div className="w-12 h-12 rounded-full bg-obsidian-800 border border-obsidian-700 flex items-center justify-center text-lg font-bold text-gold uppercase shrink-0">
                {selectedUser.kycDetails?.personalInfo?.fullName ? selectedUser.kycDetails.personalInfo.fullName.slice(0, 2) : 'CL'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-obsidian-50 truncate">
                  {selectedUser.kycDetails?.personalInfo?.fullName || 'John Doe'}
                </h4>
                <p className="text-xs text-obsidian-200 truncate">{selectedUser.mobileNumber}</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <Badge variant={selectedUser.kycStatus === 'APPROVED' ? 'success' : selectedUser.kycStatus === 'SUBMITTED' ? 'warning' : 'muted'}>
                    KYC: {selectedUser.kycStatus}
                  </Badge>
                  <Badge variant={selectedUser.isBanned ? 'danger' : 'success'}>
                    State: {selectedUser.isBanned ? 'Banned' : 'Active'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Step 1: Personal Info */}
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-gold uppercase tracking-wider font-display">Personal Information</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3.5 rounded-xl bg-obsidian-900 border border-obsidian-800">
                <div>
                  <span className="text-obsidian-200 block mb-1">Email Address</span>
                  <span className="font-semibold text-obsidian-50 break-all">{selectedUser.kycDetails?.personalInfo?.email || '---'}</span>
                </div>
                <div>
                  <span className="text-obsidian-200 block mb-1">Gender</span>
                  <span className="font-semibold text-obsidian-50">{selectedUser.kycDetails?.personalInfo?.gender || '---'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-obsidian-200 block mb-1">Date of Birth</span>
                  <span className="font-semibold text-obsidian-50">
                    {selectedUser.kycDetails?.personalInfo?.dob 
                      ? new Date(selectedUser.kycDetails.personalInfo.dob).toLocaleDateString()
                      : '---'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2: Address Info */}
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-gold uppercase tracking-wider font-display">Residential Address</h5>
              <div className="text-xs p-3.5 rounded-xl bg-obsidian-900 border border-obsidian-800 space-y-1">
                <p className="font-semibold text-obsidian-50">
                  {selectedUser.kycDetails?.addressInfo?.houseName}, {selectedUser.kycDetails?.addressInfo?.street}
                </p>
                <p className="text-obsidian-200">
                  {selectedUser.kycDetails?.addressInfo?.city}, {selectedUser.kycDetails?.addressInfo?.state} - {selectedUser.kycDetails?.addressInfo?.pinCode}
                </p>
              </div>
            </div>

            {/* Step 3: Bank Details */}
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-gold uppercase tracking-wider font-display">Settlement Bank Account</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3.5 rounded-xl bg-obsidian-900 border border-obsidian-800">
                <div>
                  <span className="text-obsidian-200 block mb-1">Account Holder</span>
                  <span className="font-semibold text-obsidian-50">{selectedUser.kycDetails?.bankDetails?.accountHolderName || '---'}</span>
                </div>
                <div>
                  <span className="text-obsidian-200 block mb-1">Bank Name</span>
                  <span className="font-semibold text-obsidian-50">{selectedUser.kycDetails?.bankDetails?.bankName || '---'}</span>
                </div>
                <div>
                  <span className="text-obsidian-200 block mb-1">Account Number</span>
                  <span className="font-semibold text-obsidian-50">{selectedUser.kycDetails?.bankDetails?.accountNumber || '---'}</span>
                </div>
                <div>
                  <span className="text-obsidian-200 block mb-1">IFSC Code</span>
                  <span className="font-semibold text-obsidian-50">{selectedUser.kycDetails?.bankDetails?.ifscCode || '---'}</span>
                </div>
              </div>
            </div>

            {/* Step 4: Verification uploads */}
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-gold uppercase tracking-wider font-display">Document Uploads Verification</h5>
              <div className="space-y-2">
                {[
                  { label: 'Aadhaar Front', path: selectedUser.kycDetails?.identityVerification?.aadhaarFront },
                  { label: 'Aadhaar Back', path: selectedUser.kycDetails?.identityVerification?.aadhaarBack },
                  { label: 'PAN Card Photo', path: selectedUser.kycDetails?.identityVerification?.panCardPhoto },
                  { label: 'Profile Selfie', path: selectedUser.kycDetails?.selfieVerification?.selfiePath }
                ].map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-obsidian-800 text-xs">
                    <span className="font-medium text-obsidian-100">{doc.label}</span>
                    {doc.path ? (
                      <a
                        href={`${BASE_URL}${doc.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-gold hover:underline font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View
                      </a>
                    ) : (
                      <span className="text-obsidian-200">Not Uploaded</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar (KYC Moderation / Account Ban) */}
            <div className="border-t border-obsidian-800 pt-6 space-y-3">
              {selectedUser.kycStatus === 'SUBMITTED' && isModerator() && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="primary"
                    onClick={handleApprove}
                    isLoading={approveKycMutation.isLoading}
                    className="flex gap-2 min-h-[44px]"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleReject}
                    isLoading={rejectKycMutation.isLoading}
                    className="flex gap-2 min-h-[44px]"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              )}

              <Button
                variant={selectedUser.isBanned ? 'secondary' : 'danger'}
                onClick={() => confirmBan(selectedUser._id, selectedUser.isBanned)}
                className="w-full flex gap-2 min-h-[44px]"
              >
                <Ban className="w-4 h-4" />
                {selectedUser.isBanned ? 'Lift Account Ban' : 'Restrict Account'}
              </Button>
            </div>
          </div>
        )}
      </SheetDrawer>

      {/* Ban / Unban Confirmation Modal */}
      <Modal
        isOpen={isBanModalOpen}
        onClose={() => setIsBanModalOpen(false)}
        title="Confirm Administrative Restriction"
      >
        <div className="space-y-4">
          <p className="text-sm text-obsidian-200">
            Are you sure you want to {banUserObj?.isBanned ? 'ban' : 'unban'} this user account?
            {banUserObj?.isBanned && ' Banned users cannot authenticate via OTP or access active gold schemes.'}
          </p>
          <div className="flex justify-end gap-3 border-t border-obsidian-800 pt-4">
            <Button variant="secondary" onClick={() => setIsBanModalOpen(false)} className="min-h-[44px] px-5">Cancel</Button>
            <Button
              variant={banUserObj?.isBanned ? 'danger' : 'primary'}
              isLoading={banMutation.isLoading}
              onClick={() => banMutation.mutate(banUserObj)}
              className="min-h-[44px] px-5"
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* KYC Rejection Modal with input reason */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="KYC Rejection Parameters"
      >
        <div className="space-y-4">
          <Input
            label="Reason for KYC Rejection"
            placeholder="e.g. Aadhaar upload is blurry, please submit again."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-3 border-t border-obsidian-800 pt-4">
            <Button variant="secondary" onClick={() => setIsRejectModalOpen(false)} className="min-h-[44px] px-5">Cancel</Button>
            <Button
              variant="danger"
              isLoading={rejectKycMutation.isLoading}
              onClick={submitReject}
              className="min-h-[44px] px-5"
            >
              Submit Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
