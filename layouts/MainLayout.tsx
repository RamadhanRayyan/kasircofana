
import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  History, 
  Settings as SettingsIcon, 
  Bell, 
  Menu, 
  LogOut, 
  MapPin,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Building2,
  X
} from 'lucide-react';
import { CooperativeAccount, Product } from '../types';

import { supabase } from '../lib/supabaseClient';
import GlobalModal from '../components/GlobalModal';


interface MainLayoutProps {
  activeAccount: CooperativeAccount;
  lowStockProducts: Product[];
  accounts: CooperativeAccount[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  activeAccount, 
  lowStockProducts,
  accounts,
  activeAccountId,
  setActiveAccountId
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1280);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string) => {
    setModal({ isOpen: true, type: 'alert', title, message, onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })) });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModal({ 
      isOpen: true, 
      type: 'confirm', 
      title, 
      message, 
      onConfirm: () => {
        onConfirm();
        setModal(prev => ({ ...prev, isOpen: false }));
      } 
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    showConfirm(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari sistem?',
      async () => {
        await supabase.auth.signOut();
        navigate('/login');
      }
    );
  };

  return (
    <div className="flex h-screen bg-amber-50 overflow-hidden relative">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[60] lg:hidden no-print transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar - Integrated Responsive Design */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-[100] transition-all duration-300 bg-amber-900 text-white flex flex-col no-print
        ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}
      `}>
        <div className="p-5 flex items-center justify-between h-16 shrink-0 border-b border-amber-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center font-black text-amber-900 shrink-0 shadow-lg shadow-amber-950/20">CS</div>
            {(isSidebarOpen || isMobileMenuOpen) && <span className="text-xl font-black tracking-tight whitespace-nowrap">Cofana Shop</span>}
          </div>
          <button className="lg:hidden p-1.5 hover:bg-amber-800 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1.5 overflow-y-auto">
          <SidebarItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
          <SidebarItem to="/pos" icon={<ShoppingCart size={20} />} label="Kasir (POS)" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
          <SidebarItem to="/inventory" icon={<Package size={20} />} label="Inventaris" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
          <SidebarItem to="/reports" icon={<BarChart3 size={20} />} label="Laporan" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
          <SidebarItem to="/history" icon={<History size={20} />} label="Riwayat" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
        </nav>

        <div className="p-3 border-t border-amber-800 space-y-1">
          <SidebarItem to="/settings" icon={<SettingsIcon size={20} />} label="Pengaturan" expanded={isSidebarOpen || isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)} />
          <button 
            onClick={handleLogout}
            className={`flex items-center gap-4 px-3 py-2.5 w-full text-amber-300 hover:text-white hover:bg-amber-800 rounded-xl transition-all ${!isSidebarOpen && !isMobileMenuOpen ? 'justify-center' : ''}`}
          >
            <LogOut size={20} />
            {(isSidebarOpen || isMobileMenuOpen) && <span className="text-sm font-semibold">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 no-print shrink-0 relative ${isNotificationOpen ? 'z-[80]' : 'z-[10]'}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => {
                if (window.innerWidth < 1024) setIsMobileMenuOpen(true);
                else setIsSidebarOpen(!isSidebarOpen);
              }}
              className="p-2 hover:bg-stone-100 rounded-xl text-slate-500 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="relative" ref={accountDropdownRef}>
              <button 
                onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all max-w-[140px] xs:max-w-[200px] sm:max-w-none ${
                  isAccountDropdownOpen ? 'bg-amber-100 border-amber-300' : 'bg-amber-50 border-amber-100 hover:bg-amber-100'
                }`}
              >
                <MapPin size={14} className="text-amber-600 shrink-0" />
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[8px] sm:text-[9px] font-bold text-amber-500 uppercase leading-none truncate">Cabang Aktif</span>
                  <span className="text-[10px] sm:text-xs font-bold text-amber-900 truncate">{activeAccount.name}</span>
                </div>
                {accounts.length > 1 && (
                  <ChevronDown size={14} className={`text-amber-600 transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {isAccountDropdownOpen && accounts.length > 1 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-amber-100 py-2 z-[100] animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-amber-50 mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Cabang</p>
                  </div>
                  {accounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => {
                        setActiveAccountId(account.id);
                        setIsAccountDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-center gap-3 ${
                        account.id === activeAccountId ? 'bg-amber-50' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        account.id === activeAccountId ? 'bg-amber-600 text-white' : 'bg-stone-100 text-slate-400'
                      }`}>
                        <Building2 size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${account.id === activeAccountId ? 'text-amber-700' : 'text-slate-800'}`}>
                          {account.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{account.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-4">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`p-2 rounded-xl transition-all relative ${isNotificationOpen ? 'bg-amber-50 text-amber-600' : 'hover:bg-stone-100 text-slate-500'}`}
              >
                <Bell size={18} className="sm:w-5 sm:h-5" />
                {lowStockProducts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              {isNotificationOpen && (
                <div className="absolute right-0 mt-3 w-64 sm:w-80 bg-white rounded-2xl shadow-2xl border border-amber-100 py-2 z-[999] animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-2 border-b border-amber-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">Notifikasi</h3>
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full">{lowStockProducts.length} Stok Menipis</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {lowStockProducts.length > 0 ? (
                      lowStockProducts.map(product => (
                        <Link 
                          key={product.id} 
                          to="/inventory"
                          onClick={() => setIsNotificationOpen(false)}
                          className="px-4 py-3 hover:bg-amber-50 transition-colors flex items-start gap-3 border-b border-amber-50 last:border-0"
                        >
                          <div className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0">
                            <Package size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{product.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Stok tersisa: <span className="text-red-600 font-bold">{product.stock}</span></p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <p className="text-xs text-slate-400">Tidak ada notifikasi baru</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 pl-1.5 sm:pl-4 border-l border-amber-100">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-wider">SUPER ADMIN</p>
                <p className="text-[8px] sm:text-[10px] text-amber-600 font-black tracking-widest uppercase">Full Access</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 text-amber-700 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-xs sm:text-sm border-2 border-amber-50 shrink-0">SA</div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-amber-50/50">
          <Outlet />
        </div>
      </main>
      <GlobalModal 
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

const SidebarItem: React.FC<{ to: string, icon: React.ReactNode, label: string, expanded: boolean, onClick?: () => void }> = ({ to, icon, label, expanded, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
        isActive 
          ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/20' 
          : 'text-amber-100/80 hover:bg-amber-800 hover:text-white'
      } ${!expanded ? 'justify-center' : ''}`}
    >
      <span className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'scale-105' : ''}`}>{icon}</span>
      {expanded && <span className="font-bold text-sm tracking-wide whitespace-nowrap">{label}</span>}
    </Link>
  );
};

export default MainLayout;
