
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Wallet, Search, ArrowUpCircle, ArrowDownCircle, Plus, Filter, Trash2, Coins, Package, XCircle, ChevronRight, Edit3 } from 'lucide-react';
import { TransactionType, TransactionCategory } from '../types';

const Transactions: React.FC = () => {
  const { state, addManualTransaction, deleteTransaction } = useApp();
  const [filter, setFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    type: TransactionType.CASH_OUT,
    category: '',
    amount: 0,
    description: ''
  });

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatDateLabel = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const parseManualDate = (dateStr: string): number | null => {
    if (!dateStr || dateStr.length !== 10) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date.getTime();
  };

  const handleDateInput = (val: string, setter: (v: string) => void) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8);
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    if (cleaned.length > 4) formatted = formatted.slice(0, 5) + '/' + cleaned.slice(4);
    setter(formatted);
  };

  const totalIncome = state.transactions
    .filter(t => t.type === TransactionType.CASH_IN)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = state.transactions
    .filter(t => t.type === TransactionType.CASH_OUT)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCash = totalIncome - totalExpense;
  const totalInventoryValue = state.batches.reduce((sum, b) => sum + (b.currentQuantity * b.buyPrice), 0);
  const totalWealth = totalCash + totalInventoryValue;

  const filteredTransactions = useMemo(() => {
    const startTs = parseManualDate(startDateStr);
    const endTs = parseManualDate(endDateStr);

    return state.transactions.filter(t => {
      if (filter !== 'ALL' && t.type !== filter) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;

      const txDate = new Date(t.createdAt);
      const txMid = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();

      let startLimit = -Infinity;
      if (startTs) startLimit = startTs;

      let endLimit = Infinity;
      if (endTs) endLimit = endTs;

      return txMid >= startLimit && txMid <= endLimit;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [state.transactions, filter, search, startDateStr, endDateStr]);

  const resetFilters = () => {
    setSearch('');
    setStartDateStr('');
    setEndDateStr('');
    setFilter('ALL');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount > 0 && form.description && form.category) {
      addManualTransaction({
        ...form,
        category: form.category as TransactionCategory
      });
      setShowModal(false);
      setForm({
        type: TransactionType.CASH_OUT,
        category: '',
        amount: 0,
        description: ''
      });
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      
      {/* Optimized Header Banner - Ultra Compact Icon on Mobile (Size 4) */}
      <div className="bg-slate-900 text-white p-4 lg:px-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="p-0.5 lg:p-3 bg-blue-500/20 rounded-lg lg:rounded-2xl border border-blue-500/20 text-blue-400 shrink-0">
            <Coins size={4} className="lg:w-6 lg:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-blue-300 text-[7px] lg:text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1">Total Kekayaan</p>
            <h2 className="text-base lg:text-2xl font-black tracking-tighter leading-none truncate">{formatIDR(totalWealth)}</h2>
          </div>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 uppercase text-[10px] tracking-widest"
        >
          <Plus size={18} strokeWidth={4} />
          <span>Tambah Manual</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Wallet, label: 'Saldo Kas', val: totalCash, color: 'blue' },
          { icon: Package, label: 'Nilai Stok', val: totalInventoryValue, color: 'purple' },
          { icon: ArrowUpCircle, label: 'Masuk', val: totalIncome, color: 'emerald' },
          { icon: ArrowDownCircle, label: 'Keluar', val: totalExpense, color: 'rose' }
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3 transition-transform hover:scale-[1.01]">
            <div className={`p-2 rounded-xl bg-${item.color}-50 dark:bg-${item.color}-500/10 text-${item.color}-600 dark:text-${item.color}-400`}>
              <item.icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{item.label}</p>
              <p className="text-xs font-black text-slate-900 dark:text-white truncate tracking-tight">{formatIDR(item.val)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 space-y-6">
          <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="CARI DESKRIPSI..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 text-[10px] transition-all uppercase text-black dark:text-white font-black"
                value={search}
                onChange={(e) => setSearch(e.target.value.toUpperCase())}
              />
            </div>
            
            {/* Optimized Date Filter - 2 Columns 1 Row on Mobile */}
            <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border-2 border-slate-100 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-2 w-full lg:flex lg:flex-row lg:items-center">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      placeholder="DD/MM/YY"
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-[9px] font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 w-full lg:w-28 transition-all placeholder:text-slate-200"
                      value={startDateStr}
                      onChange={(e) => handleDateInput(e.target.value, setStartDateStr)}
                    />
                    <Edit3 size={8} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-200 lg:hidden" />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 min-w-0">
                  <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      placeholder="DD/MM/YY"
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-[9px] font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 w-full lg:w-28 transition-all placeholder:text-slate-200"
                      value={endDateStr}
                      onChange={(e) => handleDateInput(e.target.value, setEndDateStr)}
                    />
                    <Edit3 size={8} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-200 lg:hidden" />
                  </div>
                </div>
              </div>

              {(search || startDateStr || endDateStr || filter !== 'ALL') && (
                <button 
                  onClick={resetFilters}
                  className="flex items-center justify-center gap-2 py-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-all text-[8px] font-black uppercase tracking-widest border border-dashed border-rose-200"
                >
                  <XCircle size={14} strokeWidth={2.5} />
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-white">
            {[
              { id: 'ALL', label: 'SEMUA' },
              { id: TransactionType.CASH_IN, label: 'MASUK' },
              { id: TransactionType.CASH_OUT, label: 'KELUAR' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id as any)}
                className={`px-6 py-2 rounded-xl text-[9px] font-black whitespace-nowrap transition-all border-2 ${
                  filter === btn.id 
                  ? 'bg-slate-900 dark:bg-blue-600 border-slate-900 dark:border-blue-600 text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[9px] uppercase font-black tracking-widest border-b dark:border-slate-800">
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Deskripsi</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4 text-right">Nominal</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${t.type === TransactionType.CASH_IN ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {t.type === TransactionType.CASH_IN ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded text-[8px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {t.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-black text-slate-900 dark:text-slate-200 uppercase leading-tight max-w-[200px]">{t.description}</p>
                    {t.relatedId && <span className="text-[8px] text-blue-500 font-black uppercase opacity-60">Sistem</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 leading-none">{formatDateLabel(t.createdAt)}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-black text-xs tracking-tighter ${t.type === TransactionType.CASH_IN ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === TransactionType.CASH_IN ? '+' : '-'}{formatIDR(t.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => deleteTransaction(t.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Kosong.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-5 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Catat Transaksi</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Jenis Arus Kas</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({...form, type: TransactionType.CASH_IN})}
                    className={`py-3 rounded-xl border-2 transition-all font-black text-[10px] flex items-center justify-center gap-2 uppercase ${
                      form.type === TransactionType.CASH_IN ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <ArrowUpCircle size={16} /> Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({...form, type: TransactionType.CASH_OUT})}
                    className={`py-3 rounded-xl border-2 transition-all font-black text-[10px] flex items-center justify-center gap-2 uppercase ${
                      form.type === TransactionType.CASH_OUT ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <ArrowDownCircle size={16} /> Keluar
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Kategori</label>
                <input required type="text" placeholder="MISAL: LISTRIK, GAJI..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-100 font-black text-[10px] uppercase text-black dark:text-white" value={form.category} onChange={(e) => setForm({...form, category: e.target.value.toUpperCase()})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nominal (Rp)</label>
                <input required type="number" placeholder="0" className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-100 text-xl font-black tracking-tighter text-black dark:text-white" value={form.amount || ''} onChange={(e) => setForm({...form, amount: Number(e.target.value)})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Keterangan</label>
                <input required type="text" placeholder="..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-100 text-[10px] font-black uppercase text-black dark:text-white" value={form.description} onChange={(e) => setForm({...form, description: e.target.value.toUpperCase()})} />
              </div>

              <button type="submit" className="w-full py-4 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-[10px] tracking-widest">Simpan Data</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
