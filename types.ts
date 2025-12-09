
export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  photoUrl?: string;
  totalBorrowed: number;
  totalPaid: number;
  lastTransactionDate: string; // ISO String
}

export enum TransactionType {
  BORROW = 'BORROW',
  PAYMENT = 'PAYMENT'
}

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CREDIT = 'CREDIT' // For borrow entries
}

export interface Transaction {
  id: string;
  customerId: string;
  type: TransactionType;
  items: string; // Comma separated items or description
  amount: number;
  date: string; // ISO String
  method: PaymentMethod;
  notes?: string;
}

export interface StoreProfile {
  name: string;
  address: string;
  phone: string;
  ownerName: string;
}

export interface UserProfile {
    email: string;
    storeName: string;
    ownerName: string;
    createdAt: string;
}

export type ViewState = 'DASHBOARD' | 'CUSTOMERS' | 'CUSTOMER_DETAIL' | 'SETTINGS' | 'LOGIN';
