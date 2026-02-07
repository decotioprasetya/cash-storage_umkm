
import React, { useState } from 'react';
import { useApp } from '../store';
import { ShoppingCart, Plus, Trash2, TrendingUp, Search, Info, Calendar, Tag, CircleDollarSign } from 'lucide-react';
import { StockType } from '../types';

const Sales: React.FC = () => {
  const { state, runSale, deleteSale } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [manualDate, setManualDate] = useState('');

  const handlePriceChange = (val: number) => {
    setPrice(val);
    setTotalPrice(val * quantity);
  };

  const handleTotalPriceChange = (val: number) => {
    setTotalPrice(val);
    setPrice(quantity > 0 ? val / quantity : 0);
  };

  const handleQuantityChange = (val: number) => {
    setQuantity(val);
    setTotalPrice(val * price);
  };

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
    setTotalPrice(0);
    setManualDate('');
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatQty = (val: number) => {
    return val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
           <div className="relative flex-1 max-sm:w-full">
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
                  <td className="px-6 py-4 text-sm font-medium text-black">{formatQty(sale.quantity)} Unit</td>
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

      {/* Sale Modal - Optimized Size */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Catat Penjualan</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 lg:p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Produk Ready</label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-[11px] text-black font-semibold uppercase"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                >
                  <option value="">-- PILIH BARANG --</option>
                  {availableToSell.map(m => (
                    <option key={m} value={m}>
                      {m} (STOK: {formatQty(availableToSellInfo[m])})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Jumlah</label>
                  <input 
                    required
                    type="number" 
                    placeholder="0"
                    step="0.01"
                    max={productName ? availableToSellInfo[productName] : undefined}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-[11px] text-black font-semibold"
                    value={quantity || ''}
                    onChange={(e) => handleQuantityChange(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tanggal</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    <input 
                      type="date" 
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-[10px] text-black font-semibold"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Harga / Unit</label>
                  <input 
                    required
                    type="number" 
                    placeholder="Rp 0"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-[11px] text-black font-semibold"
                    value={price || ''}
                    onChange={(e) => handlePriceChange(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-green-600 uppercase tracking-widest ml-1">Total Tunai</label>
                  <input 
                    required
                    type="number" 
                    placeholder="Total Rp"
                    className="w-full px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-[11px] text-green-900 font-bold"
                    value={totalPrice || ''}
                    onChange={(e) => handleTotalPriceChange(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2">
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[8px] text-amber-800 font-bold uppercase leading-tight tracking-wider">
                  Sistem otomatis menghitung HPP (FIFO). Perubahan total pendapatan akan menyesuaikan harga satuan untuk laporan laba rugi.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors uppercase text-[9px] tracking-widest"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 uppercase text-[9px] tracking-widest"
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
