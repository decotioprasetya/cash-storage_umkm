

import React, { useState } from 'react';
import { useApp } from '../store';
import { ShoppingCart, Plus, Trash2, TrendingUp, Search, Info, Calendar } from 'lucide-react';
import { StockType } from '../types';

const Sales: React.FC = () => {
  const { state, runSale, deleteSale } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [manualDate, setManualDate] = useState('');

  // Menghitung total stok tersedia per produk yang siap jual (FOR_SALE)
  const availableToSellInfo = state.batches
    .filter(b => b.stockType === StockType.FOR_SALE && b.currentQuantity > 0)
    .reduce((acc, curr) => {
      acc[curr.productName] = (acc[curr.productName] || 0) + curr.currentQuantity;
      return acc;
    }, {} as Record<string, number>);

  const availableToSell = Object.keys(availableToSellInfo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (productName && quantity > 0 && price > 0) {
      if (quantity > (availableToSellInfo[productName] || 0)) {
        alert("JUMLAH PENJUALAN MELEBIHI STOK TERSEDIA!");
        return;
      }
      const customTimestamp = manualDate ? new Date(manualDate).getTime() : undefined;
      runSale(productName, quantity, price, customTimestamp);
      setShowModal(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setProductName('');
    setQuantity(0);
    setPrice(0);
    setManualDate('');
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const filteredSales = state.sales.filter(s => 
    s.productName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl">
            <ShoppingCart size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Penjualan</h2>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-200"
        >
          <Plus size={20} />
          <span>Input Penjualan Baru</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center gap-4">
           <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="CARI TRANSAKSI..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase text-black font-semibold"
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="px-6 py-4">Item Terjual</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Harga Jual</th>
                <th className="px-6 py-4">Total Pendapatan</th>
                <th className="px-6 py-4">Profit</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-black uppercase">{sale.productName}</td>
                  <td className="px-6 py-4 text-sm font-medium text-black">{sale.quantity} Unit</td>
                  <td className="px-6 py-4 text-sm font-medium text-black">{formatIDR(sale.salePrice)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-black">{formatIDR(sale.totalRevenue)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-emerald-600 font-bold text-sm">+{formatIDR(sale.totalRevenue - sale.totalCOGS)}</span>
                      <span className="text-[10px] text-slate-400">COGS: {formatIDR(sale.totalCOGS)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(sale.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => deleteSale(sale.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Batalkan Penjualan"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                    Belum ada riwayat penjualan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">Catat Penjualan</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Pilih Produk Siap Jual</label>
                <select
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-black font-semibold uppercase"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                >
                  <option value="">-- PILIH BARANG --</option>
                  {availableToSell.map(m => (
                    <option key={m} value={m}>
                      {m} (Stok Tersedia: {availableToSellInfo[m]} Unit)
                    </option>
                  ))}
                </select>
                {productName && (
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1 animate-in fade-in slide-in-from-top-1">
                    Maksimum tersedia: {availableToSellInfo[productName]} Unit
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Jumlah Unit</label>
                  <input 
                    required
                    type="number" 
                    placeholder="0"
                    max={productName ? availableToSellInfo[productName] : undefined}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-black font-semibold"
                    value={quantity || ''}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Harga Jual / Unit</label>
                  <input 
                    required
                    type="number" 
                    placeholder="Rp 0"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-black font-semibold"
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Manual Date Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tanggal Penjualan (Opsional - Default Hari Ini)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <input 
                    type="date" 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-black font-semibold"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-5 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Total Pendapatan</span>
                  <span className="text-xl font-bold text-green-900">{formatIDR(quantity * price)}</span>
                </div>
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <TrendingUp size={20} />
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-amber-800 font-bold uppercase leading-relaxed tracking-wider">
                  Sistem menggunakan metode FIFO. Stok dari batch tertua akan dipotong terlebih dahulu sesuai tanggal transaksi yang dicatat.
                </p>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors uppercase text-xs tracking-widest"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 uppercase text-xs tracking-widest"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
