
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Package, AlertCircle, ShoppingBag, ChevronRight, DollarSign, Calendar, Building2, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Product, Transaction, CooperativeAccount } from '../types';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
  lowStock: Product[];
  accounts?: CooperativeAccount[];
  activeAccountId?: string;
  setActiveAccountId?: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ products, transactions, lowStock, accounts, activeAccountId, setActiveAccountId }) => {
  // Date range filter state
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [lowStockPage, setLowStockPage] = useState(1);
  const LOW_STOCK_PER_PAGE = 5;

  const activeAccount = accounts?.find(a => a.id === activeAccountId);

  const stats = useMemo(() => {
    // Filter transactions by date range
    const filteredTransactions = transactions.filter(t => {
      const transDate = t.date.split('T')[0];
      return transDate >= startDate && transDate <= endDate;
    });
    
    // GROSS SALES = Total penjualan pada tanggal yang dipilih
    const grossSales = filteredTransactions.reduce((acc, curr) => acc + curr.total, 0);

    // GROSS PROFIT = Jumlah profit dari semua item yang terjual
    // Profit per item = (price - cost) * quantity
    const grossProfit = filteredTransactions.reduce((acc, trans) => {
      const transactionProfit = trans.items.reduce((itemAcc, item) => {
        const profit = (item.price - item.cost) * item.quantity;
        return itemAcc + profit;
      }, 0);
      return acc + transactionProfit;
    }, 0);

    // Calculate previous period sales for performance comparison
    // Previous period = same duration, ending the day before startDate
    const startD = new Date(startDate);
    const endD = new Date(endDate);
    const periodDays = Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays + 1);
    
    const prevStartStr = prevStartDate.toISOString().split('T')[0];
    const prevEndStr = prevEndDate.toISOString().split('T')[0];
    
    const previousPeriodSales = transactions
      .filter(t => {
        const transDate = t.date.split('T')[0];
        return transDate >= prevStartStr && transDate <= prevEndStr;
      })
      .reduce((acc, curr) => acc + curr.total, 0);

    // Calculate performance status
    let performanceStatus: 'up' | 'stable' | 'down';
    let performancePercent = 0;
    
    if (previousPeriodSales === 0 && grossSales === 0) {
      performanceStatus = 'stable';
    } else if (previousPeriodSales === 0) {
      performanceStatus = 'up';
      performancePercent = 100;
    } else {
      performancePercent = ((grossSales - previousPeriodSales) / previousPeriodSales) * 100;
      if (performancePercent > 5) {
        performanceStatus = 'up';
      } else if (performancePercent < -5) {
        performanceStatus = 'down';
      } else {
        performanceStatus = 'stable';
      }
    }

    // Dynamic messages based on performance
    const performanceMessages = {
      up: [
        "Performa toko hari ini cemerlang, terus melaju naik! 🚀",
        "Bisnis sedang dalam momentum positif — luar biasa!",
        "Grafik penjualan menunjukkan tren kenaikan yang menggembirakan.",
        "Hari ini toko tampil prima, pertumbuhan terasa nyata!",
      ],
      stable: [
        "Performa toko hari ini terpantau stabil dan konsisten.",
        "Operasional berjalan lancar, semuanya terkendali dengan baik.",
        "Kondisi bisnis dalam keadaan seimbang dan terjaga.",
        "Toko bergerak steady, siap menghadapi tantangan baru.",
      ],
      down: [
        "Performa hari ini sedikit melambat, tetap semangat!",
        "Ada sedikit penurunan, saatnya evaluasi strategi.",
        "Tren penjualan menurun — mari cari peluang baru!",
        "Hari menantang, tapi setiap badai pasti berlalu.",
      ],
    };

    const messages = performanceMessages[performanceStatus];
    const randomIndex = Math.floor(Math.random() * messages.length);
    const performanceMessage = messages[randomIndex];
    
    // Chart data based on date range
    const chartData: { name: string; profit: number }[] = [];
    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);
    
    while (currentDate <= finalDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayTransactions = transactions.filter(t => t.date.split('T')[0] === dateStr);
      
      const dayProfit = dayTransactions.reduce((acc, t) => {
        const transProfit = t.items.reduce((itemAcc, item) => itemAcc + (item.price - item.cost) * item.quantity, 0);
        return acc + transProfit;
      }, 0);
      
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const dayName = dayNames[currentDate.getDay()];
      const dayNum = currentDate.getDate();
      
      chartData.push({
        name: `${dayName} ${dayNum}`,
        profit: dayProfit
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Transaction count for selected date
    const transactionCount = filteredTransactions.length;

    return { 
      grossSales,
      grossProfit,
      transactionCount,
      chartData, 
      performanceStatus, 
      performancePercent: Math.abs(performancePercent).toFixed(1),
      performanceMessage 
    };
  }, [transactions, startDate, endDate]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Format date for display
  const formatDateDisplay = (start: string, end: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (start === end && start === todayStr) return 'Hari Ini';
    if (start === end) {
      const date = new Date(start);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const startFormatted = new Date(start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const endFormatted = new Date(end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startFormatted} - ${endFormatted}`;
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header with Branch Switcher and Date Filter */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-none">Ringkasan Bisnis</h1>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            {stats.performanceStatus === 'up' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-full">
                <TrendingUp size={14} className="text-amber-600" />
                <span className="text-[10px] font-bold text-amber-600">+{stats.performancePercent}%</span>
              </div>
            )}
            {stats.performanceStatus === 'down' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded-full">
                <TrendingDown size={14} className="text-red-500" />
                <span className="text-[10px] font-bold text-red-500">-{stats.performancePercent}%</span>
              </div>
            )}
            {stats.performanceStatus === 'stable' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-full">
                <Minus size={14} className="text-blue-500" />
                <span className="text-[10px] font-bold text-blue-500">Stabil</span>
              </div>
            )}
          </div>
          <p className={`text-sm font-medium mt-2 italic ${
            stats.performanceStatus === 'up' ? 'text-amber-600' : 
            stats.performanceStatus === 'down' ? 'text-red-500' : 
            'text-slate-500'
          }`}>
            {stats.performanceMessage}
          </p>
        </div>
        
        {/* Date Range Filter & Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Calendar size={16} className="text-amber-600" />
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              />
              <span className="text-slate-400 text-xs font-bold">—</span>
              <input 
                type="date" 
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Sistem Online</span>
          </div>
        </div>
      </div>

      {/* Date Label */}
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        Data untuk: {formatDateDisplay(startDate, endDate)}
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard 
          title="Gross Sales" 
          value={formatCurrency(stats.grossSales)} 
          icon={<TrendingUp size={22} />} 
          color="amber"
        />
        <StatCard 
          title="Gross Profit" 
          value={formatCurrency(stats.grossProfit)} 
          icon={<DollarSign size={22} />} 
          color="blue"
        />
        <StatCard 
          title="Total Transaksi" 
          value={stats.transactionCount.toString()} 
          icon={<ShoppingBag size={22} />} 
          color="purple"
        />
        <StatCard 
          title="Restock Dibutuhkan" 
          value={lowStock.length.toString()} 
          icon={<AlertCircle size={22} />} 
          color={lowStock.length > 0 ? "red" : "slate"}
          isCritical={lowStock.length > 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart Area */}
        <div className="xl:col-span-2 bg-white p-5 lg:p-7 rounded-[32px] shadow-sm border border-amber-100 flex flex-col">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-6 sm:mb-8">
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-[11px] sm:text-xs">Tren Gross Profit</h3>
            <div className="flex">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] sm:text-[10px] font-black uppercase">Gross Profit</div>
            </div>
          </div>
          <div className="h-56 xs:h-64 sm:h-72 lg:h-80 w-full font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} interval={stats.chartData.length > 14 ? 'preserveStartEnd' : 0} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc', radius: 10}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', padding: '12px'}}
                />
                <Bar dataKey="profit" radius={[6, 6, 6, 6]} barSize={stats.chartData.length > 14 ? 12 : stats.chartData.length > 7 ? 16 : 24}>
                  {stats.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === stats.chartData.length - 1 ? '#059669' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock List */}
        <div className="bg-white p-5 lg:p-7 rounded-[32px] shadow-sm border border-amber-100 flex flex-col h-full max-h-[500px] xl:max-h-none">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Peringatan Stok</h3>
            <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-[10px] font-black">{lowStock.length} ITEM</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {lowStock.length > 0 ? (
              <>
                {lowStock.slice((lowStockPage - 1) * LOW_STOCK_PER_PAGE, lowStockPage * LOW_STOCK_PER_PAGE).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3.5 bg-amber-50 rounded-2xl border border-amber-100 group hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 font-black text-xs shrink-0 group-hover:border-amber-200 transition-colors">
                        {p.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-red-600 font-black">SISA: {p.stock}</span>
                          <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{p.category}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 shrink-0 group-hover:text-amber-500 transition-colors" />
                  </div>
                ))}
                
                {lowStock.length > LOW_STOCK_PER_PAGE && (
                  <div className="flex items-center justify-between pt-4 pb-2">
                    <button 
                      onClick={() => setLowStockPage(p => Math.max(1, p - 1))}
                      disabled={lowStockPage === 1}
                      className="p-2 text-slate-400 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={18} className="rotate-180" />
                    </button>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Halaman {lowStockPage} dari {Math.ceil(lowStock.length / LOW_STOCK_PER_PAGE)}
                    </span>
                    <button 
                      onClick={() => setLowStockPage(p => Math.min(Math.ceil(lowStock.length / LOW_STOCK_PER_PAGE), p + 1))}
                      disabled={lowStockPage === Math.ceil(lowStock.length / LOW_STOCK_PER_PAGE)}
                      className="p-2 text-slate-400 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-[24px] flex items-center justify-center mb-4">
                  <Package size={32} />
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Semua Stok<br/>Tersedia Aman</p>
              </div>
            )}
          </div>
          {lowStock.length > 0 && (
            <Link to="/inventory" className="mt-6 w-full py-3 bg-stone-100 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest text-center hover:bg-slate-200 transition-colors">
              Buka Inventaris
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, color: string, isCritical?: boolean }> = ({ 
  title, value, icon, color, isCritical 
}) => {
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-600 border-amber-50',
    blue: 'bg-blue-100 text-blue-600 border-blue-50',
    purple: 'bg-purple-100 text-purple-600 border-purple-50',
    red: 'bg-red-100 text-red-600 border-red-50',
    slate: 'bg-stone-100 text-slate-400 border-amber-50'
  };

  return (
    <div className={`p-4 lg:p-6 rounded-[28px] bg-white border ${isCritical ? 'border-red-200 shadow-md shadow-red-50' : 'border-amber-100'} shadow-sm flex flex-col justify-between transition-all hover:shadow-md h-fit`}>
      <div className="flex items-start justify-between mb-4 lg:mb-6">
        <p className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</p>
        <div className={`p-2 lg:p-3 rounded-2xl ${colorMap[color]} shrink-0 shadow-inner`}>
          {icon}
        </div>
      </div>
      <div className="mt-auto">
        <h2 className="text-lg lg:text-2xl font-black text-slate-900 leading-none truncate tracking-tight">{value}</h2>
      </div>
    </div>
  );
};

export default Dashboard;
