import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, LogOut, ChevronRight, Save, X, Download, FileText, Upload, Database, Palette, AlertTriangle, Menu } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

import Dashboard from './components/Dashboard';
import CustomerList from './components/CustomerList';
import CustomerDetail from './components/CustomerDetail';
import { DB } from './services/db';
import { Customer, Transaction, TransactionType, ViewState } from './types';
import { suggestTransactionCategory } from './services/geminiService';

const THEMES = [
    { name: 'Royal Blue', color: '#1B4FFF', hover: '#1640d6' },
    { name: 'Emerald', color: '#059669', hover: '#047857' },
    { name: 'Violet', color: '#7C3AED', hover: '#6D28D9' },
    { name: 'Rose', color: '#E11D48', hover: '#BE123C' },
    { name: 'Orange', color: '#EA580C', hover: '#C2410C' },
    { name: 'Black', color: '#000000', hover: '#333333' },
];

const AddCustomerModal: React.FC<{ onClose: () => void, onSave: (c: Customer, initialBorrow?: {amount: number, items: string}) => void }> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [addInitial, setAddInitial] = useState(false);
    const [initialAmount, setInitialAmount] = useState('');
    const [initialItems, setInitialItems] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!name || !phone) return;
        
        const newCustomer: Customer = {
            id: Date.now().toString(),
            name,
            phone,
            address,
            totalBorrowed: 0,
            totalPaid: 0,
            lastTransactionDate: new Date().toISOString(),
            photoUrl: `https://picsum.photos/100/100?random=${Date.now()}`
        };

        let initialBorrow = undefined;
        if(addInitial && initialAmount) {
            initialBorrow = {
                amount: parseFloat(initialAmount),
                items: initialItems || 'Opening Balance'
            };
        }
        onSave(newCustomer, initialBorrow);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-darkCard w-full md:max-w-md rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto pb-safe-bottom animate-fade-in relative">
                <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 z-10"><X size={20}/></button>
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Customer</h2>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} required className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Name" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                        <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Phone" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address (Optional)</label>
                        <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Address..." rows={2} />
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input type="checkbox" checked={addInitial} onChange={e => setAddInitial(e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                            <span className="font-semibold text-gray-800 dark:text-gray-200">Add Initial Credit?</span>
                        </label>
                        
                        {addInitial && (
                            <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (₹)</label>
                                    <input type="number" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                                    <input type="text" value={initialItems} onChange={e => setInitialItems(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white" placeholder="Initial items..." />
                                </div>
                            </div>
                        )}
                    </div>
                    <button type="submit" className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-lg mt-4 shadow-lg active:scale-[0.98] transition-all">Save Customer</button>
                </form>
            </div>
        </div>
    );
}

const AddTransactionModal: React.FC<{ customerId: string, type: TransactionType, prefillAmount?: number, onClose: () => void, onSave: (t: Transaction) => void }> = ({ customerId, type, prefillAmount, onClose, onSave }) => {
    const [amount, setAmount] = useState(prefillAmount ? prefillAmount.toString() : '');
    const [items, setItems] = useState('');
    const [method, setMethod] = useState('CASH');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!amount) return;
        onSave({
            id: Date.now().toString(),
            customerId,
            type,
            amount: parseFloat(amount),
            items: items,
            date: new Date().toISOString(),
            method: type === TransactionType.BORROW ? 'CREDIT' : method as any,
            notes: ''
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-darkCard w-full md:max-w-md rounded-2xl p-6 shadow-2xl pb-safe-bottom animate-fade-in relative max-h-[85vh] overflow-y-auto">
                <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 z-10"><X size={20}/></button>
                 <div className="mb-6">
                    <h2 className={`text-xl font-bold ${type === TransactionType.BORROW ? 'text-red-600' : 'text-green-600'}`}>
                        {type === TransactionType.BORROW ? 'Add Borrow Entry' : 'Add Payment'}
                    </h2>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
                        <input value={amount} onChange={e => setAmount(e.target.value)} autoFocus required type="number" className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none text-3xl font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="0" />
                    </div>
                    {type === TransactionType.BORROW ? (
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Items / Description</label>
                             <textarea value={items} onChange={e => setItems(e.target.value)} required className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Rice, Milk, Bread..." rows={3} />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setMethod('CASH')} className={`p-3 rounded-lg border text-sm font-medium ${method === 'CASH' ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200'}`}>CASH</button>
                                <button type="button" onClick={() => setMethod('UPI')} className={`p-3 rounded-lg border text-sm font-medium ${method === 'UPI' ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200'}`}>UPI / Online</button>
                            </div>
                        </div>
                    )}
                    <button type="submit" className={`w-full py-4 rounded-xl font-bold text-lg mt-4 text-white hover:opacity-90 transition-opacity shadow-lg active:scale-[0.98] ${type === TransactionType.BORROW ? 'bg-red-600' : 'bg-green-600'}`}>
                        Save {type === TransactionType.BORROW ? 'Entry' : 'Payment'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const EditTransactionModal: React.FC<{ transaction: Transaction, onClose: () => void, onSave: (t: Transaction, settle?: boolean) => void }> = ({ transaction, onClose, onSave }) => {
    const [amount, setAmount] = useState(transaction.amount.toString());
    const [items, setItems] = useState(transaction.items || '');
    const [date, setDate] = useState(transaction.date.split('T')[0]);
    const [settled, setSettled] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...transaction,
            amount: parseFloat(amount),
            items: items,
            date: new Date(date).toISOString(),
        }, settled);
        onClose();
    };

    return (
         <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-darkCard w-full md:max-w-md rounded-2xl p-6 shadow-2xl pb-safe-bottom animate-fade-in relative max-h-[85vh] overflow-y-auto">
                 <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 z-10"><X size={20}/></button>
                 <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Transaction</h2>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
                        <input value={amount} onChange={e => setAmount(e.target.value)} required type="number" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold bg-white dark:bg-gray-800 dark:text-white text-2xl border-gray-200 dark:border-gray-600" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea value={items} onChange={e => setItems(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" rows={2} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                        <input value={date} type="date" onChange={e => setDate(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    </div>
                    {transaction.type === TransactionType.BORROW && (
                        <div className="pt-2">
                             <label className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl cursor-pointer">
                                <input type="checkbox" checked={settled} onChange={e => setSettled(e.target.checked)} className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
                                <div>
                                    <span className="font-bold text-green-700 dark:text-green-400 block">Mark as Settled</span>
                                    <span className="text-xs text-green-600 dark:text-green-500">Auto-create payment entry</span>
                                </div>
                            </label>
                        </div>
                    )}
                    <button type="submit" className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-lg mt-4 shadow-lg active:scale-[0.98] transition-all">Update</button>
                </form>
            </div>
         </div>
    );
}

const App: React.FC = () => {
  // Initialize state from LocalStorage so refresh works
  const [view, setView] = useState<ViewState>(() => {
      const saved = localStorage.getItem('app_view');
      return (saved as ViewState) || 'DASHBOARD';
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(() => {
      return localStorage.getItem('app_selected_customer');
  });

  const [darkMode, setDarkMode] = useState(false);
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [transactionModal, setTransactionModal] = useState<{show: boolean, type: TransactionType | null, prefillAmount?: number}>({show: false, type: null});
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setCustomers(DB.getCustomers());
    setTransactions(DB.getTransactions());
    setIsDataLoaded(true);
    
    const isDark = localStorage.getItem('theme') === 'dark';
    setDarkMode(isDark);
    
    const savedTheme = localStorage.getItem('colorTheme');
    if (savedTheme) {
        const theme = THEMES.find(t => t.name === savedTheme);
        if (theme) setActiveTheme(theme);
    }
  }, []);

  // Save navigation state
  useEffect(() => {
      localStorage.setItem('app_view', view);
  }, [view]);

  useEffect(() => {
      if (selectedCustomerId) {
          localStorage.setItem('app_selected_customer', selectedCustomerId);
      } else {
          localStorage.removeItem('app_selected_customer');
      }
  }, [selectedCustomerId]);

  useEffect(() => {
      const root = window.document.documentElement;
      if (darkMode) {
          root.classList.add('dark');
          localStorage.setItem('theme', 'dark');
      } else {
          root.classList.remove('dark');
          localStorage.setItem('theme', 'light');
      }
  }, [darkMode]);

  useEffect(() => {
      document.documentElement.style.setProperty('--color-primary', activeTheme.color);
      document.documentElement.style.setProperty('--color-primary-hover', activeTheme.hover);
      localStorage.setItem('colorTheme', activeTheme.name);
  }, [activeTheme]);

  const handleAddCustomer = (customer: Customer, initialBorrow?: {amount: number, items: string}) => {
      DB.saveCustomer(customer);
      if (initialBorrow) {
          const t: Transaction = {
              id: Date.now().toString() + 't',
              customerId: customer.id,
              type: TransactionType.BORROW,
              amount: initialBorrow.amount,
              items: initialBorrow.items,
              date: new Date().toISOString(),
              method: 'CREDIT' as any,
              notes: 'Initial Balance'
          };
          DB.addTransaction(t);
      }
      setCustomers(DB.getCustomers());
      setTransactions(DB.getTransactions());
      setSelectedCustomerId(customer.id);
      setView('CUSTOMER_DETAIL');
  };

  const handleDeleteCustomer = (id: string) => {
      DB.deleteCustomer(id);
      setCustomers(DB.getCustomers());
      setTransactions(DB.getTransactions());
      setView('CUSTOMERS');
      setSelectedCustomerId(null);
  }

  const handleAddTransaction = (transaction: Transaction) => {
      DB.addTransaction(transaction);
      setCustomers(DB.getCustomers());
      setTransactions(DB.getTransactions());
  };

  const handleUpdateTransaction = (transaction: Transaction, settle?: boolean) => {
      DB.updateTransaction(transaction);
      if (settle && transaction.type === TransactionType.BORROW) {
          const paymentT: Transaction = {
              id: Date.now().toString() + 's',
              customerId: transaction.customerId,
              type: TransactionType.PAYMENT,
              amount: transaction.amount,
              items: `Settlement for: ${transaction.items || 'Credit'}`,
              date: new Date().toISOString(),
              method: 'CASH' as any,
              notes: 'Auto-settled via Edit'
          };
          DB.addTransaction(paymentT);
      }
      setCustomers(DB.getCustomers());
      setTransactions(DB.getTransactions());
  };

  const handleClearData = () => {
      DB.clearAllData();
      setCustomers([]);
      setTransactions([]);
      setSelectedCustomerId(null);
      setView('DASHBOARD');
      setShowClearDataConfirm(false);
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const storeProfile = DB.getProfile();
    doc.setFontSize(22);
    doc.setTextColor(27, 79, 255);
    doc.text(storeProfile.name, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${storeProfile.address} | Phone: ${storeProfile.phone}`, 14, 26);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 32);

    const tableData = customers.map(c => [
        c.name, c.phone, c.address || '-', `Rs. ${c.totalBorrowed}`, `Rs. ${c.totalPaid}`, `Rs. ${c.totalBorrowed - c.totalPaid}`
    ]);
    const totalOutstanding = customers.reduce((acc, c) => acc + (c.totalBorrowed - c.totalPaid), 0);

    autoTable(doc, {
        head: [['Customer Name', 'Phone', 'Address', 'Total Borrowed', 'Total Paid', 'Balance']],
        body: tableData,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [27, 79, 255] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Outstanding Balance: Rs. ${totalOutstanding.toLocaleString()}`, 14, finalY);
    doc.save(`Mahalaxmi_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const handleBackup = () => {
      const data = DB.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mahalaxmi_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          if (DB.importData(e.target?.result as string)) {
              alert('Data restored successfully!');
              window.location.reload();
          } else {
              alert('Failed to restore data.');
          }
      };
      reader.readAsText(file);
  };

  const handleNav = (target: ViewState) => {
      setView(target);
      setMobileMenuOpen(false);
  }

  if (!isDataLoaded) return <div className="h-screen flex items-center justify-center bg-surface dark:bg-darkSurface text-gray-800 dark:text-white">Loading...</div>;

  const renderContent = () => {
    switch (view) {
        case 'DASHBOARD':
            return <Dashboard customers={customers} transactions={transactions} onNavigate={setView} />;
        case 'CUSTOMERS':
            return <CustomerList customers={customers} onSelectCustomer={(id) => { setSelectedCustomerId(id); setView('CUSTOMER_DETAIL'); }} onAddCustomer={() => setShowAddCustomer(true)} />;
        case 'CUSTOMER_DETAIL':
            const customer = customers.find(c => c.id === selectedCustomerId);
            if (!customer) return <div>Customer not found</div>;
            const custTrans = transactions.filter(t => t.customerId === customer.id);
            return <CustomerDetail customer={customer} transactions={custTrans} onBack={() => setView('CUSTOMERS')} onAddTransaction={(id, type, amt) => setTransactionModal({show: true, type, prefillAmount: amt})} onEditTransaction={(t) => setEditTransaction(t)} onDeleteCustomer={handleDeleteCustomer} />;
        case 'SETTINGS':
            return (
                <div className="p-4 md:p-6 bg-surface dark:bg-darkSurface min-h-screen pb-6 overflow-y-auto">
                    <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Settings</h1>
                    <div className="bg-white dark:bg-darkCard p-4 rounded-xl shadow-sm space-y-4 border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-800 dark:text-gray-200 font-medium">Dark Mode</span>
                            <div onClick={() => setDarkMode(!darkMode)} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${darkMode ? 'bg-primary' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${darkMode ? 'left-7' : 'left-1'}`}></div>
                            </div>
                        </div>

                        <div className="py-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-3">
                                <Palette size={18} className="text-gray-500" />
                                <span className="text-gray-800 dark:text-gray-200 font-medium">App Theme Color</span>
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                                {THEMES.map(theme => (
                                    <button 
                                        key={theme.name}
                                        onClick={() => setActiveTheme(theme)}
                                        className={`w-full aspect-square rounded-full transition-transform hover:scale-110 flex items-center justify-center border-2 ${activeTheme.name === theme.name ? 'border-gray-400 dark:border-white scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: theme.color }}
                                        title={theme.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-800 dark:text-gray-200 font-medium">Customer Report (PDF)</span>
                            <button onClick={handleGeneratePDF} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors w-full sm:w-auto justify-center">
                                <FileText size={16} /> Download PDF
                            </button>
                        </div>
                        
                        <div className="py-2 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Data Management</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button onClick={handleBackup} className="flex flex-col items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-xl hover:bg-green-100 transition-colors">
                                    <Download size={24} /> <span className="font-semibold">Backup Data</span>
                                </button>
                                <label className="flex flex-col items-center justify-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 p-4 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer">
                                    <Upload size={24} /> <span className="font-semibold">Restore Data</span>
                                    <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                                </label>
                            </div>
                        </div>

                         <div className="flex justify-between items-center py-2 mt-4">
                            <span className="text-red-500 font-medium">Danger Zone</span>
                             <button onClick={() => setShowClearDataConfirm(true)} className="text-white bg-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-700 text-sm">Clear All Data</button>
                        </div>
                    </div>
                </div>
            );
        default: return <div>Not Found</div>;
    }
  };

  return (
    <div className={`flex h-[100dvh] bg-surface dark:bg-darkSurface overflow-hidden transition-colors duration-200 max-w-7xl mx-auto shadow-2xl`}>
        
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
            <div 
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                onClick={() => setMobileMenuOpen(false)}
            />
        )}

        {/* Sidebar - Desktop & Mobile Drawer */}
        <aside className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-darkCard border-r border-gray-200 dark:border-gray-700 h-full flex flex-col
            transform transition-transform duration-300 ease-in-out
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0
        `}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h1 className="text-xl font-bold text-primary">Mahalaxmi<br/><span className="text-gray-400 text-sm font-normal">Supermarket</span></h1>
                <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-gray-500 dark:text-gray-400"><X size={24} /></button>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <button onClick={() => handleNav('DASHBOARD')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view === 'DASHBOARD' ? 'bg-primary/10 text-primary font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><LayoutDashboard size={20} /> Dashboard</button>
                <button onClick={() => handleNav('CUSTOMERS')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view === 'CUSTOMERS' || view === 'CUSTOMER_DETAIL' ? 'bg-primary/10 text-primary font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><Users size={20} /> Customers</button>
                 <button onClick={() => handleNav('SETTINGS')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view === 'SETTINGS' ? 'bg-primary/10 text-primary font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><Settings size={20} /> Settings</button>
            </nav>
        </aside>

        <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
            {/* Mobile Header */}
            <header className="md:hidden flex-shrink-0 h-14 bg-white dark:bg-darkCard border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-30">
                 <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-600 dark:text-gray-300">
                    <Menu size={24} />
                 </button>
                 <span className="font-bold text-lg text-primary">Mahalaxmi Ledger</span>
                 <div className="w-8" />
            </header>

            <div className="flex-1 overflow-hidden relative">
                {renderContent()}
            </div>
        </main>

        {showAddCustomer && <AddCustomerModal onClose={() => setShowAddCustomer(false)} onSave={handleAddCustomer} />}
        {transactionModal.show && selectedCustomerId && transactionModal.type && <AddTransactionModal customerId={selectedCustomerId} type={transactionModal.type} prefillAmount={transactionModal.prefillAmount} onClose={() => setTransactionModal({show: false, type: null})} onSave={handleAddTransaction} />}
        {editTransaction && <EditTransactionModal transaction={editTransaction} onClose={() => setEditTransaction(null)} onSave={handleUpdateTransaction} />}
        
        {/* Clear Data Confirmation Modal */}
        {showClearDataConfirm && (
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-darkCard w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in relative">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Clear All Data?</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                            This will permanently delete all customers and transactions. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowClearDataConfirm(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium">Cancel</button>
                            <button onClick={handleClearData} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 shadow-md">Yes, Delete All</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default App;