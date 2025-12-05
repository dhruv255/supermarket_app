import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, TrendingUp, AlertTriangle, Wallet, Wand2 } from 'lucide-react';
import { Customer, Transaction, TransactionType } from '../types';
import { analyzeStoreHealth } from '../services/geminiService';

interface DashboardProps {
  customers: Customer[];
  transactions: Transaction[];
  onNavigate: (page: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ customers, transactions, onNavigate }) => {
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  const totalOutstanding = customers.reduce((acc, curr) => acc + (curr.totalBorrowed - curr.totalPaid), 0);
  const totalCollected = customers.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const activeCustomers = customers.filter(c => (c.totalBorrowed - c.totalPaid) > 0).length;
  
  const chartData = React.useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        // Normalize date to YYYY-MM-DD for comparison
        d.setHours(0,0,0,0);
        
        const dayTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            tDate.setHours(0,0,0,0);
            return tDate.getTime() === d.getTime();
        });

        const borrowed = dayTransactions.filter(t => t.type === TransactionType.BORROW).reduce((acc, t) => acc + t.amount, 0);
        const collected = dayTransactions.filter(t => t.type === TransactionType.PAYMENT).reduce((acc, t) => acc + t.amount, 0);

        return {
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          borrowed,
          collected
        };
    });
  }, [transactions]);

  const pieData = React.useMemo(() => [
      { name: 'Collected', value: totalCollected, color: '#2ECC71' },
      { name: 'Outstanding', value: totalOutstanding, color: '#FF3B30' }
  ], [totalCollected, totalOutstanding]);

  const getInsight = async () => {
    setLoadingInsight(true);
    const insight = await analyzeStoreHealth(totalOutstanding, totalCollected, customers.length);
    setAiInsight(insight);
    setLoadingInsight(false);
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 pb-6 bg-surface dark:bg-darkSurface transition-colors duration-200 overflow-y-auto h-full overscroll-contain">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
           <p className="text-sm text-gray-500 dark:text-gray-400">Mahalaxmi Supermarket Overview</p>
        </div>
        <button 
            onClick={getInsight}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl shadow-md text-sm hover:scale-[1.02] active:scale-95 transition-all"
        >
            <Wand2 size={16} />
            {loadingInsight ? 'Analyzing...' : 'AI Insights'}
        </button>
      </header>

      {aiInsight && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 p-4 rounded-xl text-indigo-800 dark:text-indigo-200 text-sm animate-fade-in">
            <h3 className="font-semibold flex items-center gap-2 mb-1"><Wand2 size={14}/> Gemini Analysis</h3>
            {aiInsight}
        </div>
      )}

      {/* KPI Cards - 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-darkCard p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 min-w-0">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Wallet size={18} className="text-red-500 flex-shrink-0" />
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Outstanding</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400 truncate">₹{totalOutstanding.toLocaleString()}</p>
          <p className="text-[10px] md:text-xs text-gray-400 mt-1 font-medium truncate">To Collect</p>
        </div>

        <div className="bg-white dark:bg-darkCard p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 min-w-0">
          <div className="flex items-center gap-2 text-success mb-2">
            <TrendingUp size={18} className="text-green-500 flex-shrink-0" />
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Received</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400 truncate">₹{totalCollected.toLocaleString()}</p>
          <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-400 mt-1 truncate">Cash In Hand</p>
        </div>

        <div className="bg-white dark:bg-darkCard p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 min-w-0">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Users size={18} className="flex-shrink-0" />
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Customers</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">{customers.length}</p>
          <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{activeCustomers} active</p>
        </div>
        
        <div className="bg-white dark:bg-darkCard p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 min-w-0">
            <div className="flex items-center gap-2 text-pending mb-2">
                <AlertTriangle size={18} className="text-orange-500 flex-shrink-0" />
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Overdue</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {customers.filter(c => (c.totalBorrowed - c.totalPaid) > 0 && new Date(c.lastTransactionDate).getTime() < Date.now() - (30 * 24 * 60 * 60 * 1000)).length}
            </p>
            <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">&gt; 30 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart Section - Trend */}
          <div className="bg-white dark:bg-darkCard p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-80 md:h-96 flex flex-col min-w-0">
            <h3 className="text-base md:text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Weekly Trend</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:opacity-20" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} width={30} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-content-bg, #fff)' }}
                    />
                    <Line type="monotone" dataKey="borrowed" stroke="#FF3B30" strokeWidth={3} dot={false} activeDot={{r: 6}} name="Given" />
                    <Line type="monotone" dataKey="collected" stroke="#2ECC71" strokeWidth={3} dot={false} activeDot={{r: 6}} name="Collected" />
                </LineChart>
                </ResponsiveContainer>
            </div>
          </div>

          {/* Chart Section - Distribution */}
          <div className="bg-white dark:bg-darkCard p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-80 md:h-96 flex flex-col min-w-0">
             <h3 className="text-base md:text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Payment Distribution</h3>
             <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend 
                          iconSize={10} 
                          verticalAlign="bottom" 
                          height={36}
                          wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} 
                        />
                    </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-base md:text-lg font-semibold text-gray-700 dark:text-gray-200">Recent Transactions</h3>
            <button onClick={() => onNavigate('CUSTOMERS')} className="text-xs md:text-sm text-primary font-medium hover:underline p-2">View All</button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {transactions.slice(0, 5).map(t => (
                <div key={t.id} className="p-3 md:p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex gap-3 items-center overflow-hidden">
                        <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-bold text-[10px] md:text-sm ${t.type === TransactionType.BORROW ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'}`}>
                            {t.type === TransactionType.BORROW ? 'OUT' : 'IN'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.items || (t.type === 'PAYMENT' ? 'Payment Received' : 'Groceries')}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{new Date(t.date).toLocaleDateString()} • {customers.find(c => c.id === t.customerId)?.name || 'Unknown'}</p>
                        </div>
                    </div>
                    <span className={`font-bold ml-2 text-sm md:text-base whitespace-nowrap ${t.type === TransactionType.BORROW ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {t.type === TransactionType.BORROW ? '-' : '+'}₹{t.amount}
                    </span>
                </div>
            ))}
            {transactions.length === 0 && (
                <div className="p-8 text-center text-gray-400">No transactions yet.</div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;