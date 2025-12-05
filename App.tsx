import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, LogOut, ChevronRight, Save, X, Download, FileText, Upload, Database } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

import Dashboard from './components/Dashboard';
import CustomerList from './components/CustomerList';
import CustomerDetail from './components/CustomerDetail';
import { DB } from './services/db';
import { Customer, Transaction, TransactionType, ViewState } from './types';
import { suggestTransactionCategory } from './services/geminiService';

// --- Modals ---

const AddCustomerModal: React.FC<{ onClose: () => void, onSave: (c: Customer, initialBorrow?: {amount: number, items: string}) => void }> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    
    // Initial Transaction State
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-white dark:bg-darkCard w-full max-w-md rounded-t-2xl md:rounded-2xl p-6 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Customer</h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} required className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="e.g. Ramesh Gupta" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                        <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="9876543210" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address (Optional)</label>
                        <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Area, Building..." rows={2} />
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input type="checkbox" checked={addInitial} onChange={e => setAddInitial(e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                            <span className="font-semibold text-gray-800 dark:text-gray-200">Add Initial Credit (Udhaar)?</span>
                        </label>
                        
                        {addInitial && (
                            <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (₹)</label>
                                    <input 
                                        type="number" 
                                        value={initialAmount} 
                                        onChange={e => setInitialAmount(e.target.value)} 
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold" 
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Items / Description</label>
                                    <input 
                                        type="text" 
                                        value={initialItems} 
                                        onChange={e => setInitialItems(e.target.value)} 
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white" 
                                        placeholder="Initial items..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold text-lg mt-4 hover:bg-blue-700 transition-colors shadow-lg">
                        Save Customer
                    </button>
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-white dark:bg-darkCard w-full max-w-md rounded-t-2xl md:rounded-2xl p-6 shadow-2xl animate-fade-in-up">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-xl font-bold ${type === TransactionType.BORROW ? 'text-red-600' : 'text-green-600'}`}>
                        {type === TransactionType.BORROW ? 'Add Borrow Entry' : 'Add Payment'}
                    </h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
                        <input value={amount} onChange={e => setAmount(e.target.value)} autoFocus required type="number" className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none text-2xl font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="0" />
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

                    <button type="submit" className={`w-full py-3 rounded-xl font-bold text-lg mt-4 text-white hover:opacity-90 transition-opacity shadow-lg ${type === TransactionType.BORROW ? 'bg-red-600' : 'bg-green-600'}`}>
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

    const isBorrow = transaction.type === TransactionType.BORROW;

    return (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-white dark:bg-darkCard w-full max-w-md rounded-t-2xl md:rounded-2xl p-6 shadow-2xl animate-fade-in-up">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-xl font-bold ${isBorrow ? 'text-red-600' : 'text-green-600'}`}>
                        Edit {isBorrow ? 'Credit' : 'Payment'}
                    </h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
                        <input 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            required 
                            type="number" 
                            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold bg-white dark:bg-gray-800 dark:text-white text-2xl ${isBorrow ? 'text-red-600 border-red-200 focus:ring-red-500' : 'text-green-600 border-green-200 focus:ring-green-500'}`} 
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description / Items</label>
                        <textarea value={items} onChange={e => setItems(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" rows={2} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                        <input value={date} type="date" onChange={e => setDate(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    </div>

                    {isBorrow && (
                        <div className="pt-2">
                             <label className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={settled} 
                                    onChange={e => setSettled(e.target.checked)} 
                                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500" 
                                />
                                <div>
                                    <span className="font-bold text-green-700 dark:text-green-400 block">Mark as Settled / Paid</span>
                                    <span className="text-xs text-green-600 dark:text-green-500">Auto-creates a payment entry for ₹{amount}</span>
                                </div>
                            </label>
                        </div>
                    )}
                    
                    <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold text-lg mt-4 hover:bg-blue-700 transition-colors shadow-lg">
                        Update Transaction
                    </button>
                </form>
            </div>
         </div>
    );
}

// --- Main App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  
  // Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Modals
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [transactionModal, setTransactionModal] = useState<{show: boolean, type: TransactionType | null, prefillAmount?: number}>({show: false, type: null});
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    // Load initial data
    setCustomers(DB.getCustomers());
    setTransactions(DB.getTransactions());
    setIsDataLoaded(true);

    // Load Dark Mode
    const isDark = localStorage.getItem('theme') === 'dark';
    setDarkMode(isDark);
  }, []);

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

  const handleAddCustomer = (customer: Customer, initialBorrow?: {amount: number, items: string}) => {
      DB.saveCustomer(customer);
      
      // Handle Initial Transaction
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
      
      // Navigate to the new customer detail immediately
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
      setCustomers(DB.getCustomers()); // Balances updated
      setTransactions(DB.getTransactions()); // List updated
  };

  const handleUpdateTransaction = (transaction: Transaction, settle?: boolean) => {
      DB.updateTransaction(transaction);

      // Logic for "Settled" Checkbox
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

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const storeProfile = DB.getProfile();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(27, 79, 255); // Primary Color
    doc.text(storeProfile.name, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${storeProfile.address} | Phone: ${storeProfile.phone}`, 14, 26);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 32);

    // Table Data
    const tableData = customers.map(c => {
        const balance = c.totalBorrowed - c.totalPaid;
        return [
            c.name,
            c.phone,
            c.address || '-',
            `Rs. ${c.totalBorrowed}`,
            `Rs. ${c.totalPaid}`,
            `Rs. ${balance}`
        ];
    });

    const totalOutstanding = customers.reduce((acc, c) => acc + (c.totalBorrowed - c.totalPaid), 0);

    // Table
    autoTable(doc, {
        head: [['Customer Name', 'Phone', 'Address', 'Total Borrowed', 'Total Paid', 'Balance']],
        body: tableData,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [27, 79, 255] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    // Footer Summary
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
          const content = e.target?.result as string;
          if (DB.importData(content)) {
              alert('Data restored successfully! The page will now reload.');
              window.location.reload();
          } else {
              alert('Failed to restore data. The file might be corrupted.');
          }
      };
      reader.readAsText(file);
  };

  // --- Rendering Logic ---

  if (!isDataLoaded) return <div className="h-screen flex items-center justify-center bg-surface dark:bg-darkSurface text-gray-800 dark:text-white">Loading...</div>;

  const renderContent = () => {
    switch (view) {
        case 'DASHBOARD':
            return <Dashboard customers={customers} transactions={transactions} onNavigate={setView} />;
        case 'CUSTOMERS':
            return (
                <CustomerList 
                    customers={customers} 
                    onSelectCustomer={(id) => { setSelectedCustomerId(id); setView('CUSTOMER_DETAIL'); }}
                    onAddCustomer={() => setShowAddCustomer(true)}
                />
            );
        case 'CUSTOMER_DETAIL':
            const customer = customers.find(c => c.id === selectedCustomerId);
            if (!customer) return <div>Customer not found</div>;
            const custTrans = transactions.filter(t => t.customerId === customer.id);
            return (
                <CustomerDetail 
                    customer={customer} 
                    transactions={custTrans}
                    onBack={() => setView('CUSTOMERS')}
                    onAddTransaction={(id, type, amt) => setTransactionModal({show: true, type, prefillAmount: amt})}
                    onEditTransaction={(t) => setEditTransaction(t)}
                    onDeleteCustomer={handleDeleteCustomer}
                />
            );
        case 'SETTINGS':
            return (
                <div className="p-6 bg-surface dark:bg-darkSurface min-h-screen">
                    <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Settings</h1>
                    <div className="bg-white dark:bg-darkCard p-4 rounded-xl shadow-sm space-y-4 border border-gray-100 dark:border-gray-700">
                        {/* Theme */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-800 dark:text-gray-200">Dark Mode</span>
                            <div onClick={() => setDarkMode(!darkMode)} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${darkMode ? 'bg-primary' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${darkMode ? 'left-7' : 'left-1'}`}></div>
                            </div>
                        </div>

                        {/* Export Report */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-800 dark:text-gray-200">Customer Report (PDF)</span>
                            <button onClick={handleGeneratePDF} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors">
                                <FileText size={16} /> Download PDF
                            </button>
                        </div>
                        
                        {/* Backup & Restore Section */}
                        <div className="py-2 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Data Management</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={handleBackup} className="flex flex-col items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-xl hover:bg-green-100 transition-colors">
                                    <Download size={24} />
                                    <span className="font-semibold">Backup Data (Save)</span>
                                </button>
                                
                                <label className="flex flex-col items-center justify-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 p-4 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer">
                                    <Upload size={24} />
                                    <span className="font-semibold">Restore Data</span>
                                    <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                                </label>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Save a backup file periodically. You can use 'Restore Data' to load your saved file if you switch devices.
                            </p>
                        </div>

                         <div className="flex justify-between items-center py-2 mt-4">
                            <span className="text-red-500 font-medium">Danger Zone</span>
                             <button onClick={() => { if(confirm('Are you sure you want to clear EVERYTHING? This cannot be undone unless you have a backup.')) { localStorage.clear(); window.location.reload(); } }} className="text-white bg-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-700">
                                Clear All Data
                             </button>
                        </div>
                    </div>
                </div>
            );
        default:
            return <div>Page Not Found</div>;
    }
  };

  return (
    <div className={`flex flex-col h-screen md:flex-row bg-surface dark:bg-darkSurface overflow-hidden transition-colors duration-200`}>
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-darkCard border-r border-gray-200 dark:border-gray-700 h-full">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h1 className="text-xl font-bold text-primary">Mahalaxmi<br/><span className="text-gray-400 text-sm font-normal">Supermarket</span></h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view === 'DASHBOARD' ? 'bg-primary/10 text-primary font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <LayoutDashboard size={20} /> Dashboard
                </button>
                <button onClick={() => setView('CUSTOMERS')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view === 'CUSTOMERS' || view === 'CUSTOMER_DETAIL' ? 'bg-primary/10 text-primary font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <Users size={20} /> Customers
                </button>
                 <button onClick={() => setView('SETTINGS')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view === 'SETTINGS' ? 'bg-primary/10 text-primary font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <Settings size={20} /> Settings
                </button>
            </nav>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">O</div>
                    <div className="text-sm">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">Owner Admin</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Shop ID: 1024</p>
                    </div>
                </div>
            </div>
        </aside>

        {/* Mobile Navigation Bar (Bottom) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-darkCard border-t border-gray-200 dark:border-gray-700 flex justify-around p-3 z-40 no-print">
            <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center gap-1 ${view === 'DASHBOARD' ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                <LayoutDashboard size={24} />
                <span className="text-[10px] font-medium">Home</span>
            </button>
             <button onClick={() => setView('CUSTOMERS')} className={`flex flex-col items-center gap-1 ${view === 'CUSTOMERS' || view === 'CUSTOMER_DETAIL' ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                <Users size={24} />
                <span className="text-[10px] font-medium">Customers</span>
            </button>
             <button onClick={() => setView('SETTINGS')} className={`flex flex-col items-center gap-1 ${view === 'SETTINGS' ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                <Settings size={24} />
                <span className="text-[10px] font-medium">Settings</span>
            </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 h-full overflow-hidden relative">
            {renderContent()}
        </main>

        {/* Modals */}
        {showAddCustomer && <AddCustomerModal onClose={() => setShowAddCustomer(false)} onSave={handleAddCustomer} />}
        {transactionModal.show && selectedCustomerId && transactionModal.type && (
            <AddTransactionModal 
                customerId={selectedCustomerId} 
                type={transactionModal.type} 
                prefillAmount={transactionModal.prefillAmount}
                onClose={() => setTransactionModal({show: false, type: null})}
                onSave={handleAddTransaction}
            />
        )}
        {editTransaction && (
            <EditTransactionModal 
                transaction={editTransaction}
                onClose={() => setEditTransaction(null)}
                onSave={handleUpdateTransaction}
            />
        )}
    </div>
  );
};

export default App;