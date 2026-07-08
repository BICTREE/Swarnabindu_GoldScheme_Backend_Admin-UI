import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CreditCard, 
  Bell, 
  FileText, 
  LogOut, 
  Menu, 
  X, 
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Badge } from '../components/Badge';
import { useToast } from '../components/Toast';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  // Mobile Hamburger Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast('Logged out of administrative session.', 'info');
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'MODERATOR', 'SUPPORT'] },
    { label: 'Users & KYC', path: '/users', icon: Users, roles: ['SUPER_ADMIN', 'MODERATOR', 'SUPPORT'] },
    { label: 'Schemes Catalog', path: '/schemes', icon: BookOpen, roles: ['SUPER_ADMIN', 'MODERATOR', 'SUPPORT'] },
    { label: 'Payments', path: '/payments', icon: CreditCard, roles: ['SUPER_ADMIN', 'MODERATOR', 'SUPPORT'] },
    { label: 'Announcements', path: '/notifications', icon: Bell, roles: ['SUPER_ADMIN', 'MODERATOR'] },
    { label: 'Audit Logs', path: '/audit-logs', icon: FileText, roles: ['SUPER_ADMIN'] }
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col md:flex-row text-obsidian-100 overflow-x-hidden">
      
      {/* ────────────────────────────────────────────────────────
          1. DESKTOP VIEWPORT (>1024px) - Full Sidebar
          ──────────────────────────────────────────────────────── */}
      {isDesktop && (
        <aside className="w-64 border-r border-obsidian-800 bg-obsidian-950 flex flex-col shrink-0 relative z-20">
          <div className="px-6 py-6 border-b border-obsidian-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center shadow-gold-glow">
              <UserCheck className="w-4.5 h-4.5 text-gold" />
            </div>
            <div>
              <h1 className="text-base font-bold font-display tracking-tight text-obsidian-50">
                Swarna Bindu
              </h1>
              <span className="text-[10px] text-gold uppercase tracking-wider font-semibold">
                Admin Portal
              </span>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                    ${isActive 
                      ? 'bg-gold/10 text-gold border-l-2 border-gold font-semibold shadow-gold-glow/5' 
                      : 'text-obsidian-200 hover:text-obsidian-50 hover:bg-obsidian-900/60'
                    }`}
                >
                  <item.icon className={`w-4.5 h-4.5 ${isActive ? 'text-gold' : 'text-obsidian-200 group-hover:text-obsidian-50'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-obsidian-800 bg-obsidian-950/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-obsidian-800 border border-obsidian-700 flex items-center justify-center text-sm font-bold text-gold uppercase">
                {user?.name ? user.name.slice(0, 2) : 'AD'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-obsidian-50 truncate">{user?.name || 'Admin'}</p>
                <Badge variant={user?.role === 'SUPER_ADMIN' ? 'gold' : user?.role === 'MODERATOR' ? 'warning' : 'info'}>
                  {user?.role}
                </Badge>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-obsidian-900 border border-obsidian-800 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 hover:border-rose-900/30 transition-all active:scale-[0.98]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Terminate Vault
            </button>
          </div>
        </aside>
      )}

      {/* ────────────────────────────────────────────────────────
          2. TABLET VIEWPORT (640px-1024px) - Slim Icon Rail
          ──────────────────────────────────────────────────────── */}
      {isTablet && (
        <aside className="w-20 border-r border-obsidian-800 bg-obsidian-950 flex flex-col items-center shrink-0 py-6 relative z-20">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center shadow-gold-glow mb-8">
            <UserCheck className="w-5 h-5 text-gold" />
          </div>

          <nav className="flex-1 w-full px-2 space-y-4 flex flex-col items-center">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all relative group
                    ${isActive 
                      ? 'bg-gold/10 text-gold border-l-2 border-gold shadow-gold-glow/5' 
                      : 'text-obsidian-200 hover:text-obsidian-50 hover:bg-obsidian-900/60'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  
                  {/* Floating Hover Tooltip */}
                  <div className="absolute left-16 px-3 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-800 text-xs text-obsidian-50 font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-premium">
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-obsidian-900 border border-obsidian-800 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 hover:border-rose-900/30 transition-all group"
            title="Terminate Vault"
          >
            <LogOut className="w-5 h-5" />
            <div className="absolute left-16 px-3 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-800 text-xs text-rose-400 font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Log Out
            </div>
          </button>
        </aside>
      )}

      {/* ────────────────────────────────────────────────────────
          3. MAIN CONTAINER (Shared header and viewport router)
          ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-obsidian-800 bg-obsidian-950/40 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-semibold text-obsidian-200 font-display uppercase tracking-wider">
              {isMobile ? 'Secure Vault' : 'Secure Connection Verified'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-obsidian-200 hidden sm:inline">Role:</span>
              <Badge variant={user?.role === 'SUPER_ADMIN' ? 'gold' : user?.role === 'MODERATOR' ? 'warning' : 'info'}>
                {user?.role}
              </Badge>
            </div>
          </div>
        </header>

        {/* Dynamic Viewport Layout */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-obsidian-900">
          <div className="max-w-7xl mx-auto fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ────────────────────────────────────────────────────────
          4. MOBILE VIEWPORT (<640px) - Bottom Nav + Drawer
          ──────────────────────────────────────────────────────── */}
      {isMobile && (
        <>
          {/* Bottom Tab Bar */}
          <nav className="fixed bottom-0 inset-x-0 h-16 bg-obsidian-950/90 backdrop-blur-md border-t border-obsidian-800 flex items-center justify-around z-30 px-2">
            <Link
              to="/"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors
                ${location.pathname === '/' ? 'text-gold' : 'text-obsidian-200'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Overview</span>
            </Link>

            <Link
              to="/users"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors
                ${location.pathname === '/users' ? 'text-gold' : 'text-obsidian-200'}`}
            >
              <Users className="w-5 h-5" />
              <span>Users</span>
            </Link>

            <Link
              to="/payments"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors
                ${location.pathname === '/payments' ? 'text-gold' : 'text-obsidian-200'}`}
            >
              <CreditCard className="w-5 h-5" />
              <span>Payments</span>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex flex-col items-center gap-1 text-[10px] font-medium text-obsidian-200 hover:text-gold"
            >
              <Menu className="w-5 h-5" />
              <span>More</span>
            </button>
          </nav>

          {/* Left Slide-in hamburger Overlay Drawer */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-40 flex">
              {/* Overlay Backdrop */}
              <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Menu Container */}
              <div 
                className="relative w-4/5 max-w-sm bg-obsidian-950 border-r border-obsidian-800 flex flex-col p-6 z-10"
                style={{ animation: 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-obsidian-800">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-gold" />
                    <span className="text-sm font-bold text-obsidian-50">Control Menu</span>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 rounded-lg text-obsidian-200 hover:text-obsidian-50 hover:bg-obsidian-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 py-6 space-y-2.5 overflow-y-auto">
                  {filteredNavItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3.5 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider font-display transition-all
                          ${isActive 
                            ? 'bg-gold/10 text-gold font-bold border-l-2 border-gold shadow-gold-glow/5' 
                            : 'text-obsidian-200 hover:text-obsidian-50 hover:bg-obsidian-900/60'
                          }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                {/* Footer Profiles */}
                <div className="border-t border-obsidian-800 pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-obsidian-800 border border-obsidian-700 flex items-center justify-center text-sm font-bold text-gold uppercase">
                      {user?.name ? user.name.slice(0, 2) : 'AD'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-obsidian-50 truncate">{user?.name || 'Admin'}</p>
                      <p className="text-[10px] text-obsidian-200 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-obsidian-900 border border-obsidian-800 text-xs font-bold uppercase tracking-wider font-display text-rose-400 hover:bg-rose-950/20"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Terminate Session
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
