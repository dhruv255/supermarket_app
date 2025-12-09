import React, { useState, useMemo } from 'react';
import { ArrowLeft, Phone, MessageCircle, MoreVertical, Plus, Minus, Download, Wand2, Trash2, Calendar, Pencil, CheckCircle, PlusCircle, Share2, X, ChevronDown } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Customer, Transaction, TransactionType } from '../types';
import { generateReminderMessage } from '../services/geminiService';
import { DB } from '../services/db';

interface CustomerDetailProps {
  customer: Customer;
  transactions: Transaction[];
  onBack: () => void;
  onAddTransaction: (customerId: string, type: TransactionType, amount?: number) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteCustomer: (id: string) => void;
}

const CustomerDetail: React.FC<CustomerDetailProps> = ({ customer, transactions, onBack, onAddTransaction, onEditTransaction, onDeleteCustomer }) => {
  const balance = customer.totalBorrowed - customer.totalPaid;
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  
  // Pagination for transaction history
  const [historyLimit, setHistoryLimit] = useState(20);

  // Analysis Stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let thisMonthBorrow = 0;
    let thisYearBorrow = 0;
    let totalCreditGiven = 0;
    let totalReceived = 0;
    
    transactions.forEach(t => {
        const amt = t.amount;
        if (t.type === TransactionType.BORROW) {
            totalCreditGiven += amt;
            const tDate = new Date(t.date);
            if (tDate.getFullYear() === currentYear) {
                thisYearBorrow += amt;
                if (tDate.getMonth() === currentMonth) {
                    thisMonthBorrow += amt;
                }
            }
        } else {
            totalReceived += amt;
        }
    });

    return { thisMonthBorrow, thisYearBorrow, totalCreditGiven, totalReceived };
  }, [transactions]);

  const visibleTransactions = transactions.slice(0, historyLimit);

  const handleGenerateReminder = async () => {
    setGenerating(true);
    const msg = await generateReminderMessage(customer, balance);
    setAiMessage(msg);
    setGenerating(false);
  };

  const cleanPhone = (phone: string) => {
    let cleaned = phone.replace(/[\s\-()]/g, '');
    if (!cleaned.startsWith('+') && cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }
    return cleaned.replace('+', '');
  };

  const handleCall = () => {
      const phone = cleanPhone(customer.phone);
      window.location.href = `tel:+${phone}`;
  };
  
  const handleShareReminder = () => {
      const text = aiMessage || `Hello ${customer.name}, your pending balance is ₹${balance}.`;
      const phone = cleanPhone(customer.phone);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
      setShowReminderModal(false);
  }

  const handleDownloadReport = async () => {
    const doc = new jsPDF();
    const profile = DB.getProfile();

    doc.setFontSize(22);
    doc.setTextColor(27, 79, 255);
    doc.text(profile.name, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(profile.address, 14, 26);
    doc.text(`Phone: ${profile.phone}`, 14, 31);
    
    doc.setDrawColor(220);
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Customer Statement", 14, 46);

    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(`Name: ${customer.name}`, 14, 54);
    doc.text(`Phone: ${customer.phone}`, 14, 60);
    if(customer.address) doc.text(`Address: ${customer.address}`, 14, 66);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Statement Date: ${dateStr}`, 140, 54);

    const startY = customer.address ? 74 : 68;
    // Explicitly type color arrays as tuples for jspdf-autotable compatibility
    const colorRed: [number, number, number] = [220, 50, 50];
    const colorGreen: [number, number, number] = [46, 204, 113];

    autoTable(doc, {
        startY: startY,
        head: [['Current Balance', 'Total Borrowed', 'Total Paid', 'This Month (Credit)']],
        body: [[
            `Rs. ${balance}`, 
            `Rs. ${stats.totalCreditGiven}`, 
            `Rs. ${stats.totalReceived}`,
            `Rs. ${stats.thisMonthBorrow}`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [245, 247, 250], textColor: 80, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 11, fontStyle: 'bold', textColor: 50, minCellHeight: 12, valign: 'middle' },
        columnStyles: {
            0: { textColor: balance > 0 ? colorRed : colorGreen, fontSize: 12 },
            3: { textColor: colorRed }
        }
    });

    const tableStartY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Transaction History", 14, tableStartY - 3);

    const tableRows = transactions.map(t => [
        new Date(t.date).toLocaleDateString('en-IN'),
        t.items || (t.type === 'BORROW' ? 'Goods Purchase' : 'Payment Received'),
        t.type === 'BORROW' ? 'DEBIT' : 'CREDIT',
        t.type === 'BORROW' ? `Rs. ${t.amount}` : `Rs. ${t.amount}`
    ]);

    autoTable(doc, {
        startY: tableStartY,
        head: [['Date', 'Description', 'Type', 'Amount']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [27, 79, 255] },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 2: { fontStyle: 'bold' }, 3: { halign: 'right', fontStyle: 'bold' } },
        didParseCell: function(data) {
            if (data.section === 'body') {
                if (data.column.index === 2) {
                    if (data.cell.raw === 'DEBIT') data.cell.styles.textColor = colorRed;
                    else data.cell.styles.textColor = colorGreen;
                }
                if (data.column.index === 3 && data.row.raw[2] === 'DEBIT') data.cell.styles.textColor = colorRed;
                else if (data.column.index === 3) data.cell.styles.textColor = colorGreen;
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Generated by Kirana Credits App", 105, finalY, { align: 'center' });

    const fileName = `${customer.name.replace(/\s+/g, '_')}_Statement.pdf`;
    doc.save(fileName);

    try {
        const pdfBlob = doc.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({
                files: [file],
                title: `Statement: ${customer.name}`,
                text: `Kirana Credits Statement for ${customer.name}.\nBalance: Rs. ${balance}`
            });
        }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="h-full overflow-y-auto bg-surface dark:bg-darkSurface relative transition-colors duration-200">
      {/* Header */}
      <div className="bg-primary text-white p-4 pb-16 relative no-print transition-colors duration-300">
        <div className="flex justify-between items-center mb-6 pt-safe-top">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90">
                <ArrowLeft size={24} />
            </button>
            <div className="flex gap-2">
                <button onClick={handleDownloadReport} className="p-2 hover:bg-white/10 rounded-full flex items-center gap-1" title="Download">
                    <Download size={20} />
                </button>
                 <button onClick={() => setShowDeleteModal(true)} className="p-2 hover:bg-white/10 rounded-full text-red-200 hover:text-red-100" title="Delete">
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
        
        <div className="flex items-center gap-4 px-2">
            <div className="w-16 h-16 bg-white/20 rounded-full backdrop-blur-sm overflow-hidden border-2 border-white/30 flex-shrink-0">
                 {customer.photoUrl ? (
                    <img src={customer.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">{customer.name[0]}</div>
                )}
            </div>
            <div className="min-w-0">
                <h1 className="text-2xl font-bold truncate leading-tight">{customer.name}</h1>
                <p className="text-blue-100 opacity-90 truncate">{customer.phone}</p>
                {customer.address && <p className="text-xs text-blue-200 mt-1 truncate">{customer.address}</p>}
            </div>
        </div>
      </div>

      {/* Stats Card Overlay */}
      <div className="px-4 -mt-10 mb-4 relative z-10">
        <div className="bg-white dark:bg-darkCard rounded-xl shadow-lg p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Current Balance</p>
                    <p className={`text-2xl md:text-3xl font-bold truncate max-w-[200px] ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        ₹{balance.toLocaleString()}
                    </p>
                </div>
                {balance > 0 && (
                     <button 
                        onClick={() => onAddTransaction(customer.id, TransactionType.PAYMENT, balance)}
                        className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                        <CheckCircle size={14} /> Settle
                    </button>
                )}
            </div>
            
            <div className="flex gap-3 no-print mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 justify-around sm:justify-start">
                 <button onClick={handleCall} className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors active:scale-90" title="Call Customer">
                    <Phone size={20} />
                 </button>
                 <button 
                    onClick={() => { setShowReminderModal(true); if(balance > 0) handleGenerateReminder(); }}
                    className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors active:scale-90"
                    title="Send Reminder"
                >
                    <MessageCircle size={20} />
                 </button>
                 <button 
                    onClick={handleDownloadReport}
                    className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center hover:bg-indigo-200 transition-colors active:scale-90"
                    title="Share Report"
                >
                    <Share2 size={20} />
                 </button>
            </div>
        </div>
      </div>

      {/* Analysis Tabs */}
      <div className="px-4 mb-4 grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-darkCard p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
             <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Calendar size={14} />
                <span className="text-xs font-medium">This Month</span>
             </div>
             <p className="font-bold text-gray-800 dark:text-white truncate">₹{stats.thisMonthBorrow.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-darkCard p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
             <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Calendar size={14} />
                <span className="text-xs font-medium">This Year</span>
             </div>
             <p className="font-bold text-gray-800 dark:text-white truncate">₹{stats.thisYearBorrow.toLocaleString()}</p>
          </div>
      </div>

      <div className="px-4 mb-4">
          <button 
            onClick={() => onAddTransaction(customer.id, TransactionType.BORROW)}
            className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors active:scale-[0.98]"
          >
              <PlusCircle size={18} /> Add Credit
          </button>
      </div>

      {/* Transaction History - removed flex-1 and overflow-auto to allow full page scrolling */}
      <div className="px-4 pb-32">
        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">History</h3>
        <div className="space-y-3 relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            
            {visibleTransactions.map(t => (
                <div key={t.id} className="relative pl-10 group">
                    <div className={`absolute left-[11px] top-3 w-3 h-3 rounded-full border-2 border-white dark:border-darkCard ${t.type === TransactionType.BORROW ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    <div className="bg-white dark:bg-darkCard p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative active:scale-[0.99] transition-transform">
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100">{t.type === TransactionType.BORROW ? 'Goods (Credit)' : 'Received'}</h4>
                                <p className="text-[10px] text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
                            </div>
                            <span className={`font-bold text-sm ${t.type === TransactionType.BORROW ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {t.type === TransactionType.BORROW ? '-' : '+'}₹{t.amount}
                            </span>
                        </div>
                        {t.items && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg mt-2 line-clamp-2">{t.items}</p>
                        )}
                        <div className="mt-2 flex justify-between items-center">
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500 dark:text-gray-400 uppercase">{t.method}</span>
                            <button 
                                onClick={() => onEditTransaction(t)}
                                className="text-gray-400 hover:text-primary dark:hover:text-primary transition-colors p-2 -m-2"
                            >
                                <Pencil size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {transactions.length > historyLimit && (
                <button 
                    onClick={() => setHistoryLimit(prev => prev + 20)}
                    className="w-full py-2 text-sm text-primary font-semibold flex items-center justify-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                    Show More <ChevronDown size={16} />
                </button>
            )}
            
            {transactions.length > 0 && (
                <div className="mt-6 bg-white dark:bg-darkCard p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative z-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">Account Summary</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Total Credit Given</span>
                            <span className="font-bold text-red-600 dark:text-red-400">₹{stats.totalCreditGiven.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Total Received</span>
                            <span className="font-bold text-green-600 dark:text-green-400">₹{stats.totalReceived.toLocaleString()}</span>
                        </div>
                         <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 text-sm">
                            <span className="font-bold text-gray-900 dark:text-white">Net Outstanding</span>
                            <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{balance.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Fixed Action Button - Safe Area Aware */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 md:pb-8 bg-white dark:bg-darkCard border-t border-gray-200 dark:border-gray-700 no-print z-40" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
        <button 
            onClick={() => onAddTransaction(customer.id, TransactionType.PAYMENT)}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 md:py-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all text-sm md:text-base mb-1"
        >
            <Plus size={20} /> Receive Payment
        </button>
      </div>

      {/* Reminder Modal - Responsive */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-darkCard w-full md:max-w-sm rounded-2xl p-6 pb-10 shadow-2xl animate-fade-in relative">
                <button onClick={() => setShowReminderModal(false)} className="absolute right-4 top-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 z-10"><X size={20}/></button>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                    <Wand2 className="text-purple-600" size={20} />
                    Smart Reminder
                </h3>
                
                {generating ? (
                    <div className="h-24 flex items-center justify-center text-gray-500">
                        Generating AI draft...
                    </div>
                ) : (
                    <textarea 
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[100px]"
                        value={aiMessage}
                        onChange={(e) => setAiMessage(e.target.value)}
                    />
                )}
                
                <div className="flex gap-3 mt-4">
                    <button onClick={() => setShowReminderModal(false)} className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-medium bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
                    <button onClick={handleShareReminder} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium shadow-md hover:bg-green-700 flex items-center justify-center gap-2" disabled={generating}>
                        <MessageCircle size={18} /> Send
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Modal - Responsive */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
             <div className="bg-white dark:bg-darkCard w-full md:max-w-sm rounded-2xl p-6 pb-10 shadow-2xl relative">
                <button onClick={() => setShowDeleteModal(false)} className="absolute right-4 top-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 z-10"><X size={20}/></button>
                <h3 className="text-lg font-bold mb-2 text-red-600">Delete Customer?</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">This will remove all data for {customer.name}.</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium">Cancel</button>
                    <button onClick={() => { onDeleteCustomer(customer.id); setShowDeleteModal(false); }} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700">Delete</button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;