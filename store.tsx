
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isCloudReady } from './supabase';
import { 
  AppState, Batch, ProductionRecord, SaleRecord, Transaction, 
  StockType, TransactionType, TransactionCategory, ProductionUsage, AppSettings 
} from './types';

interface AppContextType {
  state: AppState;
  addBatch: (data: Omit<Batch, 'id' | 'createdAt'>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  runProduction: (
    productName: string, 
    quantity: number, 
    ingredients: { productName: string, quantity: number }[],
    operationalCosts: { amount: number, description: string }[]
  ) => Promise<void>;
  deleteProduction: (id: string) => Promise<void>;
  runSale: (productName: string, quantity: number, pricePerUnit: number) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addManualTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  syncLocalToCloud: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<string | null>;
  signUp: (email: string, pass: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const STORAGE_KEY = 'umkm_pro_data_v2';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initialData = saved ? JSON.parse(saved) : {
      batches: [],
      productions: [],
      productionUsages: [],
      sales: [],
      transactions: [],
      settings: {
        businessName: 'UMKM KELUARGA',
        theme: 'light',
        supabaseUrl: '',
        supabaseAnonKey: '',
        useCloud: false
      }
    };
    return { ...initialData, isSyncing: false, user: null };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, isSyncing: false, user: null }));
    if (state.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state]);

  useEffect(() => {
    if (!isCloudReady) return;
    (supabase.auth as any).getSession().then(({ data }: any) => {
      setState(prev => ({ ...prev, user: data?.session?.user ?? null }));
    });
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setState(prev => ({ ...prev, user: session?.user ?? null }));
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCloudData = async () => {
      if (!isCloudReady || !state.user || !state.settings.useCloud) return;
      setState(prev => ({ ...prev, isSyncing: true }));
      try {
        const [
          { data: b }, { data: p }, { data: pu }, 
          { data: s }, { data: t }
        ] = await Promise.all([
          supabase.from('batches').select('*'),
          supabase.from('productions').select('*'),
          supabase.from('production_usages').select('*'),
          supabase.from('sales').select('*'),
          supabase.from('transactions').select('*')
        ]);
        setState(prev => ({
          ...prev,
          batches: b || [],
          productions: p || [],
          productionUsages: pu || [],
          sales: s || [],
          transactions: t || [],
          isSyncing: false
        }));
      } catch (e) {
        setState(prev => ({ ...prev, isSyncing: false }));
      }
    };
    fetchCloudData();
  }, [state.user, state.settings.useCloud]);

  const signIn = async (email: string, pass: string) => {
    if (!isCloudReady) return "Konfigurasi Cloud belum lengkap.";
    const { error } = await (supabase.auth as any).signInWithPassword({ email, password: pass });
    if (error) {
      if (error.message === 'Invalid login credentials') return "Email atau Password salah, atau akun belum terdaftar.";
      return error.message;
    }
    return null;
  };

  const signUp = async (email: string, pass: string) => {
    if (!isCloudReady) return "Konfigurasi Cloud belum lengkap.";
    const { error } = await (supabase.auth as any).signUp({ email, password: pass });
    if (error) return error.message;
    return null;
  };

  const logout = async () => {
    if (isCloudReady) await (supabase.auth as any).signOut();
    setState(prev => ({ ...prev, user: null }));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...newSettings } }));
  };

  const syncLocalToCloud = async () => {
    if (!isCloudReady || !state.user) return alert("Harus login untuk sinkronisasi cloud.");
    setState(prev => ({ ...prev, isSyncing: true }));
    try {
      await Promise.all([
        supabase.from('batches').upsert(state.batches.map(i => ({...i, user_id: state.user.id}))),
        supabase.from('productions').upsert(state.productions.map(i => ({...i, user_id: state.user.id}))),
        supabase.from('production_usages').upsert(state.productionUsages.map(i => ({...i, user_id: state.user.id}))),
        supabase.from('sales').upsert(state.sales.map(i => ({...i, user_id: state.user.id}))),
        supabase.from('transactions').upsert(state.transactions.map(i => ({...i, user_id: state.user.id})))
      ]);
      alert("Sinkronisasi Berhasil!");
    } catch (e) {
      alert("Gagal Sinkronisasi.");
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const addBatch = async (data: Omit<Batch, 'id' | 'createdAt'>) => {
    const newBatch: Batch = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
    const newTransaction: Transaction = {
      id: crypto.randomUUID(), type: TransactionType.CASH_OUT, category: TransactionCategory.STOCK_PURCHASE,
      amount: data.buyPrice * data.initialQuantity, description: `Beli Stok: ${data.productName}`,
      createdAt: Date.now(), relatedId: newBatch.id
    };
    if (isCloudReady && state.user && state.settings.useCloud) {
      await Promise.all([
        supabase.from('batches').insert({...newBatch, user_id: state.user.id}),
        supabase.from('transactions').insert({...newTransaction, user_id: state.user.id})
      ]);
    }
    setState(prev => ({ ...prev, batches: [...prev.batches, newBatch], transactions: [...prev.transactions, newTransaction] }));
  };

  const deleteBatch = async (id: string) => {
    const isUsed = state.productionUsages.some(u => u.batchId === id);
    if (isUsed) return alert("STOK INI SUDAH PERNAH DIGUNAKAN.");
    if (isCloudReady && state.user && state.settings.useCloud) {
      await Promise.all([
        supabase.from('batches').delete().eq('id', id),
        supabase.from('transactions').delete().eq('relatedId', id)
      ]);
    }
    setState(prev => ({ ...prev, batches: prev.batches.filter(b => b.id !== id), transactions: prev.transactions.filter(t => t.relatedId !== id) }));
  };

  const runProduction = async (productName: string, quantity: number, ingredients: { productName: string, quantity: number }[], operationalCosts: { amount: number, description: string }[]) => {
    const productionId = crypto.randomUUID();
    let totalMaterialCost = 0;
    const usages: ProductionUsage[] = [];
    let updatedBatches = [...state.batches];
    for (const ingredient of ingredients) {
      let needed = ingredient.quantity;
      const relevant = updatedBatches.filter(b => b.productName === ingredient.productName && b.stockType === StockType.FOR_PRODUCTION && b.currentQuantity > 0).sort((a, b) => a.createdAt - b.createdAt);
      for (const batch of relevant) {
        if (needed <= 0) break;
        const take = Math.min(batch.currentQuantity, needed);
        const idx = updatedBatches.findIndex(b => b.id === batch.id);
        updatedBatches[idx].currentQuantity -= take;
        totalMaterialCost += take * batch.buyPrice;
        needed -= take;
        usages.push({ id: crypto.randomUUID(), productionId, batchId: batch.id, quantityUsed: take, costPerUnit: batch.buyPrice });
      }
    }
    const totalOpCost = operationalCosts.reduce((sum, c) => sum + c.amount, 0);
    const totalHPP = totalMaterialCost + totalOpCost;
    const resultBatch: Batch = { id: crypto.randomUUID(), productName, initialQuantity: quantity, currentQuantity: quantity, buyPrice: totalHPP / quantity, stockType: StockType.FOR_SALE, createdAt: Date.now() };
    const production: ProductionRecord = { id: productionId, outputProductName: productName, outputQuantity: quantity, totalHPP, createdAt: Date.now(), batchIdCreated: resultBatch.id };
    const newTx = operationalCosts.filter(c => c.amount > 0).map(c => ({
      id: crypto.randomUUID(), type: TransactionType.CASH_OUT, category: TransactionCategory.PRODUCTION_COST,
      amount: c.amount, description: `PRODUKSI ${productName} (${c.description})`, createdAt: Date.now(), relatedId: productionId
    }));
    if (isCloudReady && state.user && state.settings.useCloud) {
      await Promise.all([
        supabase.from('batches').upsert(updatedBatches.map(i => ({...i, user_id: state.user.id}))),
        supabase.from('batches').insert({...resultBatch, user_id: state.user.id}),
        supabase.from('productions').insert({...production, user_id: state.user.id}),
        supabase.from('production_usages').insert(usages.map(i => ({...i, user_id: state.user.id}))),
        supabase.from('transactions').insert(newTx.map(i => ({...i, user_id: state.user.id})))
      ]);
    }
    setState(prev => ({ ...prev, batches: [...updatedBatches, resultBatch], productions: [...prev.productions, production], productionUsages: [...prev.productionUsages, ...usages], transactions: [...prev.transactions, ...newTx] }));
  };

  const deleteProduction = async (id: string) => {
    const prod = state.productions.find(p => p.id === id);
    if (!prod) return;
    const resultBatch = state.batches.find(b => b.id === prod.batchIdCreated);
    if (resultBatch && resultBatch.currentQuantity < resultBatch.initialQuantity) return alert("PRODUK SUDAH TERJUAL.");
    const prodUsages = state.productionUsages.filter(u => u.productionId === id);
    let updatedBatches = [...state.batches];
    prodUsages.forEach(usage => {
      const idx = updatedBatches.findIndex(b => b.id === usage.batchId);
      if (idx !== -1) updatedBatches[idx].currentQuantity += usage.quantityUsed;
    });
    updatedBatches = updatedBatches.filter(b => b.id !== prod.batchIdCreated);
    if (isCloudReady && state.user && state.settings.useCloud) {
      await Promise.all([
        supabase.from('batches').upsert(updatedBatches.map(i => ({...i, user_id: state.user.id}))),
        supabase.from('productions').delete().eq('id', id),
        supabase.from('production_usages').delete().eq('productionId', id),
        supabase.from('transactions').delete().eq('relatedId', id),
        supabase.from('batches').delete().eq('id', prod.batchIdCreated)
      ]);
    }
    setState(prev => ({ ...prev, batches: updatedBatches, productions: prev.productions.filter(p => p.id !== id), productionUsages: prev.productionUsages.filter(u => u.productionId !== id), transactions: prev.transactions.filter(t => t.relatedId !== id) }));
  };

  const runSale = async (productName: string, quantity: number, pricePerUnit: number) => {
    let needed = quantity;
    let totalCOGS = 0;
    let updatedBatches = [...state.batches];
    const relevant = updatedBatches.filter(b => b.productName === productName && b.stockType === StockType.FOR_SALE && b.currentQuantity > 0).sort((a, b) => a.createdAt - b.createdAt);
    for (const batch of relevant) {
      if (needed <= 0) break;
      const take = Math.min(batch.currentQuantity, needed);
      const idx = updatedBatches.findIndex(b => b.id === batch.id);
      updatedBatches[idx].currentQuantity -= take;
      needed -= take;
      totalCOGS += take * batch.buyPrice;
    }
    const saleId = crypto.randomUUID();
    const sale: SaleRecord = { id: saleId, productName, quantity, salePrice: pricePerUnit, totalRevenue: quantity * pricePerUnit, totalCOGS, createdAt: Date.now() };
    const tx: Transaction = { id: crypto.randomUUID(), type: TransactionType.CASH_IN, category: TransactionCategory.SALES, amount: sale.totalRevenue, description: `PENJUALAN: ${productName}`, createdAt: Date.now(), relatedId: saleId };
    if (isCloudReady && state.user && state.settings.useCloud) {
      await Promise.all([
        supabase.from('batches').upsert(updatedBatches.map(i => ({...i, user_id: state.user.id}))),
        supabase.from('sales').insert({...sale, user_id: state.user.id}),
        supabase.from('transactions').insert({...tx, user_id: state.user.id})
      ]);
    }
    setState(prev => ({ ...prev, batches: updatedBatches, sales: [...prev.sales, sale], transactions: [...prev.transactions, tx] }));
  };

  const deleteSale = async (id: string) => {
    const sale = state.sales.find(s => s.id === id);
    if (!sale) return;
    let updatedBatches = [...state.batches];
    let toRestore = sale.quantity;
    const sameItems = updatedBatches.filter(b => b.productName === sale.productName && b.stockType === StockType.FOR_SALE).sort((a, b) => b.createdAt - a.createdAt);
    for (const batch of sameItems) {
      if (toRestore <= 0) break;
      const space = batch.initialQuantity - batch.currentQuantity;
      const amount = Math.min(space, toRestore);
      const idx = updatedBatches.findIndex(b => b.id === batch.id);
      updatedBatches[idx].currentQuantity += amount;
      toRestore -= amount;
    }
    if (isCloudReady && state.user && state.settings.useCloud) {
      await Promise.all([
        supabase.from('batches').upsert(updatedBatches.map(i => ({...i, user_id: state.user.id}))),
        supabase.from('sales').delete().eq('id', id),
        supabase.from('transactions').delete().eq('relatedId', id)
      ]);
    }
    setState(prev => ({ ...prev, batches: updatedBatches, sales: prev.sales.filter(s => s.id !== id), transactions: prev.transactions.filter(t => t.relatedId !== id) }));
  };

  const addManualTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
    if (isCloudReady && state.user && state.settings.useCloud) await supabase.from('transactions').insert({...newTx, user_id: state.user.id});
    setState(prev => ({ ...prev, transactions: [...prev.transactions, newTx] }));
  };

  const deleteTransaction = async (id: string) => {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx || tx.relatedId) return alert("Hapus melalui menu asal transaksi.");
    if (isCloudReady && state.user && state.settings.useCloud) await supabase.from('transactions').delete().eq('id', id);
    setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
  };

  return (
    <AppContext.Provider value={{ 
      state, addBatch, deleteBatch, runProduction, 
      deleteProduction, runSale, deleteSale, addManualTransaction, 
      deleteTransaction, updateSettings, syncLocalToCloud,
      signIn, signUp, logout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
