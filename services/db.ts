import { Customer, Transaction, TransactionType, StoreProfile } from '../types';

const STORAGE_KEYS = {
  CUSTOMERS: 'mahalaxmi_customers',
  TRANSACTIONS: 'mahalaxmi_transactions',
  PROFILE: 'mahalaxmi_profile',
  USER: 'mahalaxmi_user',
};

// Initial Mock Data
const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    phone: '9876543210',
    address: 'Flat 101, Galaxy Apts',
    totalBorrowed: 5000,
    totalPaid: 2000,
    lastTransactionDate: new Date().toISOString(),
    photoUrl: 'https://picsum.photos/100/100?random=1'
  },
  {
    id: '2',
    name: 'Anita Desai',
    phone: '9988776655',
    address: 'Sector 4, Shop 2',
    totalBorrowed: 1200,
    totalPaid: 1200,
    lastTransactionDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    photoUrl: 'https://picsum.photos/100/100?random=2'
  },
  {
    id: '3',
    name: 'Suresh Patil',
    phone: '8877665544',
    address: 'Near Temple',
    totalBorrowed: 8500,
    totalPaid: 1000,
    lastTransactionDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    photoUrl: 'https://picsum.photos/100/100?random=3'
  }
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', customerId: '1', type: TransactionType.BORROW, items: 'Rice 5kg, Oil 1L', amount: 800, date: new Date().toISOString(), method: 'CREDIT' as any },
  { id: 't2', customerId: '1', type: TransactionType.BORROW, items: 'Sugar 2kg, Tea', amount: 200, date: new Date().toISOString(), method: 'CREDIT' as any },
  { id: 't3', customerId: '1', type: TransactionType.PAYMENT, items: 'Part Payment', amount: 2000, date: new Date().toISOString(), method: 'CASH' as any },
  { id: 't4', customerId: '3', type: TransactionType.BORROW, items: 'Monthly ration', amount: 8500, date: new Date(Date.now() - 86400000 * 5).toISOString(), method: 'CREDIT' as any },
];

export const DB = {
  getProfile: (): StoreProfile => {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return data ? JSON.parse(data) : { name: 'Mahalaxmi Supermarket', address: 'Main Market, Pune', phone: '9876543210', ownerName: 'Admin' };
  },

  saveProfile: (profile: StoreProfile) => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  getCustomers: (): Customer[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : INITIAL_CUSTOMERS;
  },

  saveCustomer: (customer: Customer) => {
    const customers = DB.getCustomers();
    const existingIndex = customers.findIndex(c => c.id === customer.id);
    if (existingIndex >= 0) {
      customers[existingIndex] = customer;
    } else {
      customers.push(customer);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  getTransactions: (customerId?: string): Transaction[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    let transactions: Transaction[] = data ? JSON.parse(data) : INITIAL_TRANSACTIONS;
    if (customerId) {
      return transactions.filter(t => t.customerId === customerId);
    }
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  addTransaction: (transaction: Transaction) => {
    const transactions = DB.getTransactions();
    transactions.unshift(transaction);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    DB.recalculateCustomerBalance(transaction.customerId);
  },

  updateTransaction: (updatedTransaction: Transaction) => {
    const transactions = DB.getTransactions();
    const index = transactions.findIndex(t => t.id === updatedTransaction.id);
    if (index !== -1) {
        transactions[index] = updatedTransaction;
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
        DB.recalculateCustomerBalance(updatedTransaction.customerId);
    }
  },

  recalculateCustomerBalance: (customerId: string) => {
      const transactions = DB.getTransactions(customerId);
      const customers = DB.getCustomers();
      const customerIndex = customers.findIndex(c => c.id === customerId);
      
      if (customerIndex !== -1) {
          const customer = customers[customerIndex];
          
          let totalBorrowed = 0;
          let totalPaid = 0;
          let lastDate = customer.lastTransactionDate;

          transactions.forEach(t => {
              const amt = parseFloat(t.amount.toString());
              if (t.type === TransactionType.BORROW) {
                  totalBorrowed += amt;
              } else {
                  totalPaid += amt;
              }
              // Find most recent date
              if (new Date(t.date).getTime() > new Date(lastDate).getTime()) {
                  lastDate = t.date;
              }
          });

          customer.totalBorrowed = totalBorrowed;
          customer.totalPaid = totalPaid;
          customer.lastTransactionDate = lastDate;
          
          customers[customerIndex] = customer;
          localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      }
  },

  deleteCustomer: (id: string) => {
      const customers = DB.getCustomers().filter(c => c.id !== id);
      const transactions = DB.getTransactions().filter(t => t.customerId !== id);
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  clearAllData: () => {
      // Explicitly set to empty arrays so the app doesn't load mock data on restart
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
  },

  exportData: () => {
      const data = {
          customers: DB.getCustomers(),
          transactions: DB.getTransactions(),
          profile: DB.getProfile(),
          exportDate: new Date().toISOString()
      };
      return JSON.stringify(data, null, 2);
  },

  importData: (jsonString: string) => {
    try {
        const data = JSON.parse(jsonString);
        if (data.customers && Array.isArray(data.customers)) {
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
        }
        if (data.transactions && Array.isArray(data.transactions)) {
            localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
        }
        if (data.profile) {
            localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(data.profile));
        }
        return true;
    } catch (e) {
        console.error("Import failed", e);
        return false;
    }
  }
};