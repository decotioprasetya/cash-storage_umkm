

import React, { useState } from 'react';
import { useApp } from '../store';
import { Factory, Trash2, Plus, Info, Wallet, Calendar } from 'lucide-react';
import { StockType, TransactionCategory } from '../types';

const Production: React.FC = () => {
  const { state, runProduction, deleteProduction } = useApp();
  const [showModal, setShowModal] = useState(false);

  const [outputName, setOutputName] = useState('');
  const [outputQty, setOutputQty] = useState(0);
  const [manualDate, setManualDate] = useState('');
  const [ingredients, setIngredients] = useState<{ productName: string, quantity: number }[]>([
    { productName: '', quantity: 0 }
  ]);
  const [opCosts, setOpCosts] = useState<{ amount: number, description: string }[]>([
    { amount: 0, description: '' }
  ]);

  // Map of materials and their TOTAL available quantity across all batches
  const availableMaterialsInfo = state.batches
    .filter(b => b.stockType === StockType.FOR_PRODUCTION && b.currentQuantity > 0)
    .reduce((acc, curr) => {
      acc[curr.productName] = (acc[curr.productName] || 0) + curr.currentQuantity;
      return acc;
    }, {} as Record<string, number>);

  const materialNames = Object.keys(availableMaterialsInfo);

  const addIngredientRow = () => {
    setIngredients([...ingredients, { productName: '', quantity: 0 }]);
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...ingredients];
    (updated[index] as any)[field] = value;
    setIngredients(updated);
  };

  const removeIngredientRow = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const addCostRow = () => {
    setOpCosts([...opCosts, { amount: 0, description: '' }]);
  };

  const updateCost = (index: number, field: string, value: any) => {
    const updated = [...opCosts];
    (updated[index] as any)[field] = value;
    setOpCosts(updated);
  };

  const removeCostRow = (index: number) => {
    if (opCosts.length > 1) {
      setOpCosts(opCosts.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (outputName && outputQty > 0 && ingredients.every(i => i.productName && i.quantity > 0)) {
      const customTimestamp = manualDate ? new Date(manualDate).getTime() : undefined;
      runProduction(outputName, outputQty, ingredients, opCosts, customTimestamp);
      setShowModal(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setOutputName('');
    setOutputQty(0);
    setManualDate('');
    setIngredients([{ productName: '', quantity: 0 }]);
    setOpCosts([{ amount: 0, description: '' }]);
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatQty = (val: number) => {
    return val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Manajemen Produksi</h2>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Konversi Bahan Baku & Biaya Operasional</p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-900/10 active:scale-95 text-xs uppercase tracking-widest"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Mulai Produksi</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {state.productions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-16 text-center transition-colors">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Factory className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Belum Ada Riwayat Produksi</h3>
            <p className="text-slate-400 dark:text-slate-500 max-w-xs mx-auto mt-2 text-xs font-bold uppercase leading-relaxed">Ubah bahan baku menjadi produk jadi melalui tombol di atas.</p>
          </div>
        ) : (
          state.productions
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((prod) => (
              <div key={prod.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100 dark:border-blue-500/20">Konversi Selesai</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{prod.outputProductName}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{new Date(prod.createdAt).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="mt-6 md:mt-0 flex flex-wrap items-center gap-6 lg:gap-10">
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Kuantitas</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{formatQty(prod.outputQuantity)} Unit</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">HPP Per Unit</p>
                      <p className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{formatIDR(prod.totalHPP / prod.outputQuantity)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total HPP</p>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{formatIDR(prod.totalHPP)}</p>
                    </div>
                    <button 
                      onClick={() => deleteProduction(prod.id)}
                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Plus size={12} className="text-blue-500" /> Pemakaian Bahan Baku
                    </h4>
                    <div className="space-y-3">
                      {state.productionUsages
                        .filter(u => u.productionId === prod.id)
                        .map((usage) => {
                          const batch = state.batches.find(b => b.id === usage.batchId);
                          return (
                            <div key={usage.id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 border border-slate-100 dark:border-slate-600 shadow-sm">
                                  <Factory size={14} />
                                </div>
                                <p className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase">{batch?.productName || '???'}</p>
                              </div>
                              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400">{formatQty(usage.quantityUsed)} UNIT <span className="mx-1 opacity-20">|</span> {formatIDR(usage.costPerUnit)}</p>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Wallet size={12} className="text-rose-500" /> Biaya Operasional Produksi
                    </h4>
                    <div className="space-y-3">
                      {state.transactions
                        .filter(t => t.relatedId === prod.id && t.category === TransactionCategory.PRODUCTION_COST)
                        .map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-3.5 bg-rose-50/30 dark:bg-rose-500/5 border border-rose-100/50 dark:border-rose-500/10 rounded-2xl transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-700 shadow-sm">
                                <Wallet size={14} />
                              </div>
                              <p className="text-[10px] font-black text-rose-900 dark:text-rose-200 uppercase">{tx.description.split('(')[1]?.replace(')', '') || tx.description}</p>
                            </div>
                            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 tracking-tighter">{formatIDR(tx.amount)}</p>
                          </div>
                        ))}
                      {state.transactions.filter(t => t.relatedId === prod.id && t.category === TransactionCategory.PRODUCTION_COST).length === 0 && (
                        <p className="text-[9px] text-slate-300 dark:text-slate-700 font-black uppercase tracking-widest italic py-4">Tidak ada biaya tambahan</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Production Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Formulir Produksi Baru</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nama Produk Jadi (Output)</label>
                  <input 
                    required
                    type="text" 
                    placeholder="CONTOH: ROTI MANIS"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 uppercase text-slate-900 dark:text-white font-black text-xs transition-all"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Kuantitas Dihasilkan</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 text-slate-900 dark:text-white font-black text-xs transition-all"
                    value={outputQty || ''}
                    onChange={(e) => setOutputQty(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Manual Date Input */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Tanggal Produksi (Opsional - Default Hari Ini)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <input 
                    type="date" 
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-black text-xs"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1">Komposisi Bahan Baku</label>
                  <button 
                    type="button"
                    onClick={addIngredientRow}
                    className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-4 py-2 rounded-xl flex items-center gap-2 transition-all uppercase tracking-widest border border-blue-100 dark:border-blue-500/20"
                  >
                    <Plus size={14} strokeWidth={3} /> Tambah Bahan
                  </button>
                </div>
                
                <div className="space-y-3">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-3 items-start animate-in slide-in-from-left-2 duration-200">
                      <div className="flex-1">
                        <select
                          required
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-[10px] text-slate-900 dark:text-white font-black uppercase transition-all"
                          value={ing.productName}
                          onChange={(e) => updateIngredient(idx, 'productName', e.target.value)}
                        >
                          <option value="">-- PILIH BAHAN --</option>
                          {materialNames.map(m => (
                            <option key={m} value={m}>
                              {m} (Tersedia: {formatQty(availableMaterialsInfo[m])})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-28">
                        <input 
                          required
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-[10px] text-slate-900 dark:text-white font-black transition-all"
                          value={ing.quantity || ''}
                          onChange={(e) => updateIngredient(idx, 'quantity', Number(e.target.value))}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeIngredientRow(idx)}
                        className="p-3 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest ml-1">Biaya Operasional (Opsional)</label>
                  <button 
                    type="button"
                    onClick={addCostRow}
                    className="text-[9px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-blue-500/20 px-4 py-2 rounded-xl flex items-center gap-2 transition-all uppercase tracking-widest border border-rose-100 dark:border-rose-500/20"
                  >
                    <Plus size={14} strokeWidth={3} /> Tambah Biaya
                  </button>
                </div>
                
                <div className="space-y-3">
                  {opCosts.map((cost, idx) => (
                    <div key={idx} className="flex gap-3 items-start animate-in slide-in-from-right-2 duration-200">
                      <div className="flex-[2]">
                        <input 
                          type="text" 
                          placeholder="KETERANGAN (MISAL: LISTRIK, GAJI)"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-[10px] text-slate-900 dark:text-white font-black uppercase transition-all"
                          value={cost.description}
                          onChange={(e) => updateCost(idx, 'description', e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="flex-1">
                        <input 
                          type="number" 
                          placeholder="BIAYA (RP)"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-[10px] text-slate-900 dark:text-white font-black transition-all"
                          value={cost.amount || ''}
                          onChange={(e) => updateCost(idx, 'amount', Number(e.target.value))}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeCostRow(idx)}
                        className="p-3 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/20 flex gap-4 transition-all">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-400 rounded-2xl h-fit">
                  <Info size={18} strokeWidth={3} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight">Informasi Akuntansi</p>
                  <p className="text-[9px] text-amber-800 dark:text-amber-300 font-bold uppercase leading-relaxed tracking-wider opacity-80">
                    Biaya operasional akan memotong KAS secara otomatis sesuai tanggal yang dipilih. Sistem akan mengambil stok bahan baku secara berurutan (FIFO) dari batch tertua.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex gap-4 sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 text-slate-400 dark:text-slate-500 font-black hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all uppercase text-[9px] tracking-widest"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-[9px] tracking-widest"
                >
                  Proses Produksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Production;
