import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Users, 
  BookOpen, 
  Info,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAuth } from '../../hooks/useAuth';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useToast } from '../../components/Toast';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { SheetDrawer } from '../../components/SheetDrawer';
import { Input } from '../../components/Input';

const schemeSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  monthlyInvestment: z.coerce.number().min(100, 'Monthly investment must be at least 100'),
  durationMonths: z.coerce.number().min(1, 'Duration must be at least 1 month'),
  maturityBenefitPercent: z.coerce.number().min(0, 'Benefit percent cannot be negative'),
  minGoldGram: z.coerce.number().min(0, 'Minimum gold gram cannot be negative'),
  termsAndConditions: z.string().min(5, 'Terms must be at least 5 characters')
});

export default function SchemesCatalog() {
  const { isModerator } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();
  const queryClient = useQueryClient();

  // Tab State: 'catalog' or 'subscriptions'
  const [activeTab, setActiveTab] = useState('catalog');

  // Sheet Drawer States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);

  // Fetch Catalog Templates Query
  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['adminSchemes'],
    queryFn: () => adminApi.getSchemes(),
    enabled: activeTab === 'catalog'
  });

  // Fetch Subscriptions Query
  const { data: subData, isLoading: isSubLoading } = useQuery({
    queryKey: ['adminSubscriptions'],
    queryFn: () => adminApi.getSubscriptions(),
    enabled: activeTab === 'subscriptions'
  });

  const schemes = catalogData?.data?.schemes || [];
  const subscriptions = subData?.data?.subscriptions || [];

  // Form Setup
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schemeSchema)
  });

  // --- MUTATIONS ---
  const createMutation = useMutation({
    mutationFn: adminApi.createScheme,
    onSuccess: () => {
      toast('New gold scheme created successfully.', 'success');
      queryClient.invalidateQueries(['adminSchemes']);
      setIsFormOpen(false);
      reset();
    },
    onError: (err) => {
      toast(err.message || 'Failed to create scheme.', 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateScheme(id, data),
    onSuccess: () => {
      toast('Gold scheme parameters updated successfully.', 'success');
      queryClient.invalidateQueries(['adminSchemes']);
      setIsFormOpen(false);
      setEditingScheme(null);
      reset();
    },
    onError: (err) => {
      toast(err.message || 'Failed to update scheme.', 'error');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: adminApi.toggleSchemeActive,
    onSuccess: (res) => {
      toast(res.message || 'Scheme status toggled successfully.', 'success');
      queryClient.invalidateQueries(['adminSchemes']);
    },
    onError: (err) => {
      toast(err.message || 'Failed to toggle scheme status.', 'error');
    }
  });

  // Action Helpers
  const handleOpenCreate = () => {
    setEditingScheme(null);
    reset({
      name: '',
      description: '',
      monthlyInvestment: '',
      durationMonths: 11,
      maturityBenefitPercent: 8,
      minGoldGram: 5,
      termsAndConditions: '1. Standard terms apply.'
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (scheme) => {
    setEditingScheme(scheme);
    setValue('name', scheme.name);
    setValue('description', scheme.description);
    setValue('monthlyInvestment', scheme.monthlyInvestment);
    setValue('durationMonths', scheme.durationMonths);
    setValue('maturityBenefitPercent', scheme.maturityBenefitPercent);
    setValue('minGoldGram', scheme.minGoldGram);
    setValue('termsAndConditions', scheme.termsAndConditions || '');
    setIsFormOpen(true);
  };

  const handleToggleActive = (id) => {
    toggleActiveMutation.mutate(id);
  };

  const onSubmit = (data) => {
    if (editingScheme) {
      updateMutation.mutate({ id: editingScheme._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-obsidian-50 font-display tracking-tight">
            Schemes & Subscriptions
          </h1>
          <p className="text-xs text-obsidian-200 mt-1">
            Manage your gold saving options and monitor user payment progress.
          </p>
        </div>
        {activeTab === 'catalog' && isModerator() && (
          <Button onClick={handleOpenCreate} className="flex gap-2 text-xs py-3 min-h-[44px] sm:py-2.5">
            <Plus className="w-4 h-4" />
            Add Scheme Template
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-obsidian-800">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wider font-display border-b-2 transition-all flex items-center gap-2
            ${activeTab === 'catalog'
              ? 'border-gold text-gold font-bold'
              : 'border-transparent text-obsidian-200 hover:text-obsidian-50'
            }`}
        >
          <BookOpen className="w-4 h-4" />
          Catalog Templates
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wider font-display border-b-2 transition-all flex items-center gap-2
            ${activeTab === 'subscriptions'
              ? 'border-gold text-gold font-bold'
              : 'border-transparent text-obsidian-200 hover:text-obsidian-50'
            }`}
        >
          <Users className="w-4 h-4" />
          Active Subscriptions
        </button>
      </div>

      {/* Tab Contents: Catalog Templates */}
      {activeTab === 'catalog' && (
        isMobile ? (
          // Mobile Catalog Cards
          <div className="space-y-4">
            {isCatalogLoading ? (
              [...Array(2)].map((_, i) => (
                <div key={i} className="glass-panel p-5 rounded-2xl animate-pulse space-y-3">
                  <div className="h-4 bg-obsidian-800 rounded w-1/3" />
                  <div className="h-4 bg-obsidian-800 rounded w-2/3" />
                  <div className="h-10 bg-obsidian-800 rounded-lg w-full mt-2" />
                </div>
              ))
            ) : schemes.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center text-obsidian-200">
                <Info className="w-8 h-8 mx-auto mb-2 text-obsidian-200/50" />
                No schemes templates defined in catalog yet.
              </div>
            ) : (
              schemes.map((scheme) => (
                <div key={scheme._id} className="glass-panel p-5 rounded-2xl space-y-4 border-obsidian-800/80">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-obsidian-50">{scheme.name}</h4>
                      <p className="text-[11px] text-obsidian-200 mt-1 leading-relaxed">{scheme.description}</p>
                    </div>
                    <Badge variant={scheme.isActive ? 'success' : 'muted'}>
                      {scheme.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-y border-obsidian-800/60 py-3">
                    <div>
                      <span className="text-obsidian-200 block mb-0.5">Installment</span>
                      <span className="font-semibold text-obsidian-50">₹{scheme.monthlyInvestment.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-obsidian-200 block mb-0.5">Duration</span>
                      <span className="font-semibold text-obsidian-50">{scheme.durationMonths} Months</span>
                    </div>
                    <div>
                      <span className="text-obsidian-200 block mb-0.5">Maturity Yield</span>
                      <span className="font-semibold text-emerald-400">{scheme.maturityBenefitPercent}%</span>
                    </div>
                    <div>
                      <span className="text-obsidian-200 block mb-0.5">Target Weight</span>
                      <span className="font-semibold text-obsidian-50">{scheme.minGoldGram} g</span>
                    </div>
                  </div>

                  {isModerator() && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleOpenEdit(scheme)}
                        variant="secondary"
                        className="py-3 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
                      >
                        <Edit className="w-4 h-4" />
                        Edit parameters
                      </Button>
                      <Button
                        onClick={() => handleToggleActive(scheme._id)}
                        variant="secondary"
                        className={`py-3 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]
                          ${scheme.isActive ? 'text-rose-400' : 'text-emerald-400'}`}
                      >
                        {scheme.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        {scheme.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          // Tablet/Desktop Catalog Table
          <div className="glass-panel rounded-2xl overflow-hidden shadow-premium">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-obsidian-200">
                <thead>
                  <tr className="border-b border-obsidian-800 bg-obsidian-950/50 text-xs font-semibold text-obsidian-200 uppercase tracking-wider font-display">
                    <th className="px-6 py-4">Scheme Name</th>
                    <th className="px-6 py-4">Installment (₹)</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Bonus Yield</th>
                    <th className="px-6 py-4">Target Weight</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-800">
                  {isCatalogLoading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-2/3" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/3" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/2" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/4" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/4" /></td>
                        <td className="px-6 py-4"><div className="h-6 bg-obsidian-800 rounded-full w-16" /></td>
                        <td className="px-6 py-4 text-right"><div className="h-8 bg-obsidian-800 rounded w-20 ml-auto" /></td>
                      </tr>
                    ))
                  ) : schemes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-obsidian-200">
                        <Info className="w-10 h-10 mx-auto mb-3 text-obsidian-200/55" />
                        No schemes templates defined in catalog yet.
                      </td>
                    </tr>
                  ) : (
                    schemes.map((scheme) => (
                      <tr key={scheme._id} className="hover:bg-obsidian-900/20 transition-colors">
                        <td className="px-6 py-4 font-semibold text-obsidian-50">{scheme.name}</td>
                        <td className="px-6 py-4">₹{scheme.monthlyInvestment.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4">{scheme.durationMonths} Months</td>
                        <td className="px-6 py-4 text-emerald-400 font-semibold">{scheme.maturityBenefitPercent}%</td>
                        <td className="px-6 py-4">{scheme.minGoldGram} g</td>
                        <td className="px-6 py-4">
                          <Badge variant={scheme.isActive ? 'success' : 'muted'}>
                            {scheme.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {isModerator() && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(scheme)}
                                className="p-2 bg-obsidian-800 border border-obsidian-700 text-obsidian-200 rounded-lg hover:text-gold hover:bg-gold/5 transition-all"
                                title="Edit Parameters"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(scheme._id)}
                                className={`p-2 bg-obsidian-800 border border-obsidian-700 rounded-lg transition-all
                                  ${scheme.isActive 
                                    ? 'text-emerald-400 hover:bg-emerald-950/20' 
                                    : 'text-obsidian-200 hover:text-emerald-400 hover:bg-emerald-950/10'}`}
                                title={scheme.isActive ? 'Deactivate Scheme' : 'Activate Scheme'}
                              >
                                {scheme.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Tab Contents: Subscriptions list */}
      {activeTab === 'subscriptions' && (
        isMobile ? (
          // Mobile Subscriptions Cards
          <div className="space-y-4">
            {isSubLoading ? (
              [...Array(2)].map((_, i) => (
                <div key={i} className="glass-panel p-5 rounded-2xl animate-pulse space-y-3">
                  <div className="h-4 bg-obsidian-800 rounded w-1/3" />
                  <div className="h-4 bg-obsidian-800 rounded w-2/3" />
                </div>
              ))
            ) : subscriptions.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center text-obsidian-200">
                <Users className="w-8 h-8 mx-auto mb-2 text-obsidian-200/50" />
                No client subscriptions registered.
              </div>
            ) : (
              subscriptions.map((sub) => (
                <div key={sub._id} className="glass-panel p-5 rounded-2xl space-y-3 border-obsidian-800/80">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm text-obsidian-50">
                        {sub.userId?.kycDetails?.personalInfo?.fullName || 'John Mathew'}
                      </h4>
                      <p className="text-xs text-obsidian-200 mt-0.5">{sub.userId?.mobileNumber || '---'}</p>
                    </div>
                    <Badge variant={sub.status === 'ACTIVE' ? 'success' : 'muted'}>
                      {sub.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-obsidian-800/60 pt-3">
                    <div>
                      <span className="text-obsidian-200 block mb-0.5">Scheme</span>
                      <span className="font-medium text-obsidian-50">{sub.schemeId?.name || '---'}</span>
                    </div>
                    <div>
                      <span className="text-obsidian-200 block mb-0.5">Total Paid</span>
                      <span className="font-medium text-obsidian-50">₹{sub.totalPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-obsidian-200 block mb-0.5">Gold Accumulated</span>
                      <span className="font-semibold text-gold">{sub.goldAccumulated.toFixed(3)} g</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Tablet/Desktop Subscriptions Table
          <div className="glass-panel rounded-2xl overflow-hidden shadow-premium">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-obsidian-200">
                <thead>
                  <tr className="border-b border-obsidian-800 bg-obsidian-950/50 text-xs font-semibold text-obsidian-200 uppercase tracking-wider font-display">
                    <th className="px-6 py-4">Subscriber Mobile</th>
                    <th className="px-6 py-4">Client Name</th>
                    <th className="px-6 py-4">Subscribed Scheme</th>
                    <th className="px-6 py-4">Total Paid (₹)</th>
                    <th className="px-6 py-4">Gold Accumulated</th>
                    <th className="px-6 py-4">Plan Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-800">
                  {isSubLoading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-2/3" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/2" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-3/5" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/4" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-obsidian-800 rounded w-1/4" /></td>
                        <td className="px-6 py-4"><div className="h-6 bg-obsidian-800 rounded-full w-16" /></td>
                      </tr>
                    ))
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-obsidian-200">
                        <Users className="w-10 h-10 mx-auto mb-3 text-obsidian-200/55" />
                        No client subscriptions registered on the platform yet.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => (
                      <tr key={sub._id} className="hover:bg-obsidian-900/20 transition-colors">
                        <td className="px-6 py-4 font-semibold text-obsidian-50">
                          {sub.userId?.mobileNumber || '---'}
                        </td>
                        <td className="px-6 py-4">
                          {sub.userId?.kycDetails?.personalInfo?.fullName || 'John Mathew'}
                        </td>
                        <td className="px-6 py-4">{sub.schemeId?.name || '---'}</td>
                        <td className="px-6 py-4">₹{sub.totalPaid.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4 font-semibold text-gold">{sub.goldAccumulated.toFixed(3)} g</td>
                        <td className="px-6 py-4">
                          <Badge variant={sub.status === 'ACTIVE' ? 'success' : 'muted'}>
                            {sub.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* --- FORM DRAWER SHEET --- */}
      <SheetDrawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingScheme ? 'Edit Gold Scheme Template' : 'Create New Gold Scheme'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Scheme Name"
            placeholder="Swarna Bindu Popular"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Description / Marketing Text"
            placeholder="Standard monthly savings plan for..."
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Installment Amount (₹)"
              type="number"
              placeholder="5000"
              error={errors.monthlyInvestment?.message}
              {...register('monthlyInvestment')}
            />

            <Input
              label="Duration (Months)"
              type="number"
              placeholder="11"
              error={errors.durationMonths?.message}
              {...register('durationMonths')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Maturity Bonus (%)"
              type="number"
              step="0.1"
              placeholder="8"
              error={errors.maturityBenefitPercent?.message}
              {...register('maturityBenefitPercent')}
            />

            <Input
              label="Minimum Target Gold (g)"
              type="number"
              step="0.01"
              placeholder="10"
              error={errors.minGoldGram?.message}
              {...register('minGoldGram')}
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-obsidian-200 uppercase tracking-wider font-display">
              Terms & Conditions
            </label>
            <textarea
              placeholder="1. Monthly installments must be paid before the 10th of every month..."
              rows={4}
              className="w-full bg-obsidian-950 border text-sm text-obsidian-50 rounded-lg px-3.5 py-2.5 outline-none transition-all duration-200 border-obsidian-700 focus:border-gold focus:ring-1 focus:ring-gold focus:shadow-gold-glow"
              {...register('termsAndConditions')}
            />
            {errors.termsAndConditions && (
              <span className="text-xs text-rose-500 font-medium">
                {errors.termsAndConditions.message}
              </span>
            )}
          </div>

          <Button
            type="submit"
            isLoading={createMutation.isLoading || updateMutation.isLoading}
            className="w-full mt-4 py-3 min-h-[44px]"
          >
            {editingScheme ? 'Update Parameters' : 'Publish Scheme Template'}
          </Button>
        </form>
      </SheetDrawer>
    </div>
  );
}
