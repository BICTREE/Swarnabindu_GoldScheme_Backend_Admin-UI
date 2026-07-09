import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users as UsersIcon, 
  TrendingUp, 
  Coins, 
  Activity,
  FileCheck,
  Ban
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { adminApi } from '../../api/adminApi';
import { Card, CardTitle, CardValue, CardDesc } from '../../components/Card';
import { Badge } from '../../components/Badge';

// Mock historical trend data for visualization matching backend states
const mockChartData = [
  { month: 'Jan', revenue: 5000, goldReserve: 0.8 },
  { month: 'Feb', revenue: 12000, goldReserve: 1.7 },
  { month: 'Mar', revenue: 18000, goldReserve: 2.5 },
  { month: 'Apr', revenue: 27000, goldReserve: 3.8 },
  { month: 'May', revenue: 32000, goldReserve: 4.5 },
  { month: 'Jun', revenue: 45000, goldReserve: 6.2 },
  { month: 'Jul', revenue: 58000, goldReserve: 8.4 }
];

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: adminApi.getDashboardStats,
    refetchInterval: 15000 // auto-refresh dashboard stats every 15s
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-8 bg-obsidian-800 rounded w-1/4" />

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-obsidian-800 border border-obsidian-700/50 rounded-2xl" />
          ))}
        </div>

        {/* Chart Area Skeleton */}
        <div className="h-[400px] bg-obsidian-800 border border-obsidian-700/50 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel border-rose-500/30 rounded-2xl p-6 text-center text-rose-400">
        <ShieldAlert className="w-10 h-10 mx-auto mb-3" />
        <h3 className="font-bold text-lg">Metrics Aggregation Error</h3>
        <p className="text-xs text-obsidian-200 mt-1">{error.message || 'Unable to sync platform statistics.'}</p>
      </div>
    );
  }

  const stats = data?.data || {
    users: { total: 0, banned: 0, kyc: { approved: 0, submitted: 0, pending: 0 } },
    schemes: { catalogTemplates: 0, activeSubscriptions: 0 },
    financials: { totalRevenueReceived: 0, totalGoldReserveLiabilities: 0, currentGoldLiabilityValue: 0 }
  };

  const metricCards = [
    {
      title: 'Total Registrations',
      value: stats.users.total,
      desc: `${stats.users.kyc.pending} pending onboarding`,
      icon: UsersIcon,
      colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    },
    {
      title: 'KYC Verified Users',
      value: stats.users.kyc.approved,
      desc: `${stats.users.kyc.submitted} awaiting moderator review`,
      icon: FileCheck,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Total Revenue Collected',
      value: `₹${stats.financials.totalRevenueReceived.toLocaleString('en-IN')}`,
      desc: `Across ${stats.schemes.activeSubscriptions} active savings plans`,
      icon: TrendingUp,
      colorClass: 'text-gold bg-gold/10 border-gold/20'
    },
    {
      title: 'Gold Reserve Liabilities',
      value: `${stats.financials.totalGoldReserveLiabilities.toFixed(3)} g`,
      desc: `Valued at ₹${Math.round(stats.financials.currentGoldLiabilityValue).toLocaleString('en-IN')}`,
      icon: Coins,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl font-bold text-obsidian-50 font-display tracking-tight">
          System Overview
        </h1>
        <p className="text-xs text-obsidian-200 mt-1">
          Real-time aggregates of user subscriptions, KYC verifications, and financial reserves.
        </p>
      </div>

      {/* Metrics Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{card.title}</CardTitle>
                <CardValue>{card.value}</CardValue>
                <CardDesc>{card.desc}</CardDesc>
              </div>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${card.colorClass}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Analytics Chart & Sub-Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Area Chart */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-obsidian-50 uppercase tracking-wider font-display">
                Reserves & Revenue Trends
              </h3>
              <p className="text-xs text-obsidian-200 mt-0.5">
                Simulated month-on-month accumulation of asset liabilities and payments.
              </p>
            </div>
            <Badge variant="gold">Last 6 Months</Badge>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D2D35" vertical={false} />
                <XAxis dataKey="month" stroke="#A1A1AA" fontSize={11} tickLine={false} />
                <YAxis stroke="#A1A1AA" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C1C1E', borderColor: '#2D2D35', borderRadius: '12px' }}
                  labelStyle={{ color: '#F5F5F7', fontWeight: 600 }}
                />
                <Area 
                  name="Total Cash (₹)" 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#D4AF37" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* KYC & Platform Health Stats */}
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-obsidian-50 uppercase tracking-wider font-display mb-4">
              KYC & Catalog Health
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-950 border border-obsidian-800">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-obsidian-100">KYC Approval Rate</span>
                </div>
                <span className="text-sm font-bold text-emerald-400">
                  {stats.users.total > 0 
                    ? `${Math.round((stats.users.kyc.approved / stats.users.total) * 100)}%`
                    : '100%'
                  }
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-950 border border-obsidian-800">
                <div className="flex items-center gap-3">
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-semibold text-obsidian-100">Banned Accounts</span>
                </div>
                <span className="text-sm font-bold text-rose-400">{stats.users.banned}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-950 border border-obsidian-800">
                <div className="flex items-center gap-3">
                  <Coins className="w-4 h-4 text-gold" />
                  <span className="text-xs font-semibold text-obsidian-100">Catalog Schemes Active</span>
                </div>
                <span className="text-sm font-bold text-gold">{stats.schemes.catalogTemplates} Templates</span>
              </div>
            </div>
          </div>

          <div className="border-t border-obsidian-800 pt-4 mt-6 text-[11px] text-obsidian-200">
            Platform updates are processed asynchronously. Live rates fluctuate +/-0.5% every 30s.
          </div>
        </Card>
      </div>
    </div>
  );
}
