import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { User, Transaction, SavingsAccount } from '../types';
import toast from 'react-hot-toast';

interface WalletContextType {
  user: User | null;
  balance: number;
  transactions: Transaction[];
  savingsAccounts: SavingsAccount[];
  updateUserBalance: (newBalance: number) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => Promise<void>;
  createSavingsAccount: (account: Omit<SavingsAccount, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateSavingsAccount: (id: string, updates: Partial<SavingsAccount>) => Promise<void>;
  loading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    } else {
      setUser(null);
      setBalance(0);
      setTransactions([]);
      setSavingsAccounts([]);
    }
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Load user data from localStorage
      const userData = localStorage.getItem(`user_${currentUser.uid}`);
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setBalance(parsedUser.balance || 0);
      } else {
        // Create new user
        const newUser: User = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || '',
          balance: 0,
          createdAt: new Date(),
          premiumStatus: false
        };
        setUser(newUser);
        setBalance(0);
        localStorage.setItem(`user_${currentUser.uid}`, JSON.stringify(newUser));
      }

      // Load transactions
      const transactionsData = localStorage.getItem(`transactions_${currentUser.uid}`);
      if (transactionsData) {
        const parsedTransactions = JSON.parse(transactionsData).map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp)
        }));
        setTransactions(parsedTransactions);
      }

      // Load savings accounts
      const savingsData = localStorage.getItem(`savings_${currentUser.uid}`);
      if (savingsData) {
        const parsedSavings = JSON.parse(savingsData).map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          maturityDate: new Date(s.maturityDate)
        }));
        setSavingsAccounts(parsedSavings);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const updateUserBalance = async (newBalance: number) => {
    if (!currentUser || !user) return;

    try {
      const updatedUser = { ...user, balance: newBalance };
      setUser(updatedUser);
      setBalance(newBalance);
      localStorage.setItem(`user_${currentUser.uid}`, JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('Failed to update balance');
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
    if (!currentUser) return;

    try {
      const newTransaction: Transaction = {
        ...transaction,
        id: `txn_${Date.now()}`,
        timestamp: new Date()
      };

      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
      localStorage.setItem(`transactions_${currentUser.uid}`, JSON.stringify(updatedTransactions));
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    }
  };

  const depositMoney = async (amount: number, method: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    setLoading(true);
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update user balance
      const newBalance = balance + amount;
      await updateUserBalance(newBalance);

      // Add transaction record
      await addTransaction({
        uid: currentUser.uid,
        type: 'deposit',
        amount,
        description: `Deposit via ${method}`,
        status: 'completed',
        direction: '+',
        method
      });

    } catch (error: any) {
      console.error('Error depositing money:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  const createSavingsAccount = async (account: Omit<SavingsAccount, 'id' | 'createdAt' | 'status'>) => {
    if (!currentUser) return;

    try {
      const newAccount: SavingsAccount = {
        ...account,
        id: `sav_${Date.now()}`,
        createdAt: new Date(),
        status: 'active'
      };

      const updatedSavings = [...savingsAccounts, newAccount];
      setSavingsAccounts(updatedSavings);
      localStorage.setItem(`savings_${currentUser.uid}`, JSON.stringify(updatedSavings));
    } catch (error) {
      console.error('Error creating savings account:', error);
      toast.error('Failed to create savings account');
    }
  };

  const updateSavingsAccount = async (id: string, updates: Partial<SavingsAccount>) => {
    if (!currentUser) return;

    try {
      const updatedSavings = savingsAccounts.map(account =>
        account.id === id ? { ...account, ...updates } : account
      );
      setSavingsAccounts(updatedSavings);
      localStorage.setItem(`savings_${currentUser.uid}`, JSON.stringify(updatedSavings));
    } catch (error) {
      console.error('Error updating savings account:', error);
      toast.error('Failed to update savings account');
    }
  };

  const value = {
    user,
    balance,
    transactions,
    savingsAccounts,
    updateUserBalance,
    addTransaction,
    depositMoney,
    createSavingsAccount,
    updateSavingsAccount,
    loading
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};