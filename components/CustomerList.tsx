import React, { useState } from 'react';
import { Search, Plus, User, Phone, ChevronRight, MapPin, IndianRupee } from 'lucide-react';
import { Customer } from '../types';

interface CustomerListProps {
  customers: Customer[];
  onSelectCustomer: (id: string) => void;
  onAddCustomer: () => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, onSelectCustomer, onAddCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'DUE' | 'PAID'>('ALL');

  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    const balance = c.totalBorrowed - c.totalPaid;
    
    // Smart Search: Checks Name, Phone, Address, and even the specific Amount
    const matchesSearch = 
        c.name.toLowerCase().includes(term) || 
        c.phone.includes(term) ||
        (c.address && c.address.toLowerCase().includes(term)) ||
        balance.toString().includes(term); // Search by amount
    
    if (filter === 'DUE') return matchesSearch && balance > 0;
    if (filter === 'PAID') return matchesSearch && balance <= 0;
    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col bg-surface dark:bg-darkSurface transition-colors duration-200">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white dark:bg-darkCard z-10 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Customers ({customers.length})</h1>
            <button 
                onClick={onAddCustomer}
                className="bg-primary text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                aria-label="Add Customer"
            >
                <Plus size={24} />
            </button>
        </div>
        
        <div className="px-4 pb-4 space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search name, address, phone or amount..." 
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-gray-900 dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex gap-2 text-sm overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setFilter('ALL')}
                    className={`px-4 py-1.5 rounded-full border transition-colors whitespace-nowrap ${filter === 'ALL' ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-200 dark:text-gray-900' : 'bg-white dark:bg-darkCard text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilter('DUE')}
                    className={`px-4 py-1.5 rounded-full border transition-colors whitespace-nowrap ${filter === 'DUE' ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-darkCard text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
                >
                    Pending Due
                </button>
                <button 
                    onClick={() => setFilter('PAID')}
                    className={`px-4 py-1.5 rounded-full border transition-colors whitespace-nowrap ${filter === 'PAID' ? 'bg-green-500 text-white border-green-500' : 'bg-white dark:bg-darkCard text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
                >
                    Settled
                </button>
            </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 pb-4 space-y-3">
        {filteredCustomers.map(customer => {
            const balance = customer.totalBorrowed - customer.totalPaid;
            return (
                <div 
                    key={customer.id} 
                    onClick={() => onSelectCustomer(customer.id)}
                    className="bg-white dark:bg-darkCard p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm active:scale-[0.98] transition-transform flex items-center justify-between cursor-pointer group"
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-600">
                            {customer.photoUrl ? (
                                <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400"><User size={20} /></div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-primary transition-colors truncate">{customer.name}</h3>
                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mt-1 space-x-2">
                                <span className="flex items-center"><Phone size={10} className="mr-1" /> {customer.phone}</span>
                            </div>
                            {customer.address && (
                                <div className="flex items-center text-gray-400 dark:text-gray-500 text-xs mt-0.5 truncate">
                                    <MapPin size={10} className="mr-1 flex-shrink-0" /> 
                                    <span className="truncate">{customer.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0 pl-2">
                        <div className={`font-bold ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {balance > 0 ? `₹${balance}` : 'Settled'}
                        </div>
                        {balance > 0 && <div className="text-[10px] text-gray-400 font-medium">DUE</div>}
                    </div>
                </div>
            )
        })}
        {filteredCustomers.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                <p>No matching customers found.</p>
                <p className="text-sm mt-1">Try searching by name, address, or amount.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default CustomerList;