
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { FileSpreadsheet, Download, TrendingUp, TrendingDown, Scale, Info, Box, FileText } from 'lucide-react';
import { TransactionType, TransactionCategory, StockType } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const { state } = useApp();
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

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

  const dateRange = useMemo(() => ({
    start: parseManualDate(startDateStr) || -Infinity,
    end: parseManualDate(endDateStr) || Infinity
  }), [startDateStr, endDateStr]);

  const filteredTransactions = useMemo(() => {
    return state.transactions.filter(t => {
      const txDate = new Date(t.createdAt);
      const txMid = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
      return txMid >= dateRange.start && txMid <= dateRange.end;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [state.transactions, dateRange]);

  const filteredSales = useMemo(() => {
    return state.sales.filter(s => {
      const txDate = new Date(s.createdAt);
      const txMid = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
      return txMid >= dateRange.start && txMid <= dateRange.end;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [state.sales, dateRange]);

  const filteredProductions = useMemo(() => {
    return state.productions.filter(p => {
      const txDate = new Date(p.createdAt);
      const txMid = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
      return txMid >= dateRange.start && txMid <= dateRange.end;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [state.productions, dateRange]);

  const activeStocks = useMemo(() => {
    return state.batches.filter(b => b.currentQuantity > 0).sort((a, b) => a.productName.localeCompare(b.productName));
  }, [state.batches]);

  // Overall Financial Position (Now)
  const totalCash = useMemo(() => 
    state.transactions.reduce((sum, t) => 
      t.type === TransactionType.CASH_IN ? sum + t.amount : sum - t.amount, 0
    )
  , [state.transactions]);

  const totalInventoryValue = useMemo(() => 
    state.batches.reduce((sum, b) => sum + (b.currentQuantity * b.buyPrice), 0)
  , [state.batches]);

  // Period Metrics
  const revenue = useMemo(() => 
    filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0)
  , [filteredSales]);

  const totalCOGS = useMemo(() => 
    filteredSales.reduce((sum, s) => sum + s.totalCOGS, 0)
  , [filteredSales]);

  const operationalExpenses = useMemo(() => 
    filteredTransactions
      .filter(t => t.type === TransactionType.CASH_OUT && t.category === TransactionCategory.OPERATIONAL)
      .reduce((sum, t) => sum + t.amount, 0)
  , [filteredTransactions]);

  const netProfit = revenue - (totalCOGS + operationalExpenses);

  const assetInvestment = useMemo(() => 
    filteredTransactions
      .filter(t => t.type === TransactionType.CASH_OUT && (t.category === TransactionCategory.STOCK_PURCHASE || t.category === TransactionCategory.PRODUCTION_COST))
      .reduce((sum, t) => sum + t.amount, 0)
  , [filteredTransactions]);

  const handleExportXLSX = () => {
    if (filteredTransactions.length === 0) {
      alert("TIDAK ADA DATA UNTUK DIEKSPOR.");
      return;
    }

    try {
      const dataRows = filteredTransactions.map((t, idx) => ({
        'NO': idx + 1,
        'TANGGAL': formatDateLabel(t.createdAt),
        'WAKTU': new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        'TIPE': t.type === TransactionType.CASH_IN ? 'MASUK' : 'KELUAR',
        'KATEGORI': t.category.replace('_', ' '),
        'DESKRIPSI': t.description,
        'NOMINAL': t.amount,
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(dataRows);

      const summaryRows = [
        [],
        ['', '', '', '', '', `LAPORAN KEUANGAN PERIODE: ${state.settings.businessName}`, ''],
        ['', '', '', '', '', 'TOTAL PENDAPATAN (OMSET)', revenue],
        ['', '', '', '', '', 'TOTAL HPP (TERJUAL)', totalCOGS],
        ['', '', '', '', '', 'BEBAN OPERASIONAL', operationalExpenses],
        ['', '', '', '', '', 'LABA BERSIH OPERASIONAL', netProfit],
        ['', '', '', '', '', 'INVESTASI STOK/PRODUKSI (ASET)', assetInvestment],
        [],
        ['', '', '', '', '', 'POSISI KEUANGAN SAAT INI (SNAPSHOT)', ''],
        ['', '', '', '', '', 'TOTAL SALDO KAS TERSEDIA', totalCash],
        ['', '', '', '', '', 'TOTAL NILAI ASET STOK', totalInventoryValue],
        ['', '', '', '', '', 'TOTAL KEKAYAAN BERSIH', totalCash + totalInventoryValue],
      ];
      XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: -1 });

      const wscols = [{ wch: 5 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 40 }, { wch: 18 }];
      worksheet['!cols'] = wscols;

      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Keuangan");
      const startStr = startDateStr ? startDateStr.replace(/\//g, '-') : 'Awal';
      const endStr = endDateStr ? endDateStr.replace(/\//g, '-') : 'Akhir';
      XLSX.writeFile(workbook, `Laporan_${state.settings.businessName.replace(/\s+/g, '_')}_${startStr}_sd_${endStr}.xlsx`);
    } catch (error) {
      alert("TERJADI KESALAHAN EKSPOR XLSX.");
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const startStr = startDateStr || 'Awal';
    const endStr = endDateStr || 'Akhir';

    // Header
    doc.setFontSize(18);
    doc.text(state.settings.businessName.toUpperCase(), 14, 20);
    doc.setFontSize(10);
    doc.text(`LAPORAN KEUANGAN & OPERASIONAL (${startStr} s/d ${endStr})`, 14, 28);
    doc.line(14, 32, 196, 32);

    // Tabel 1: Summary Keuangan
    doc.setFontSize(12);
    doc.text("RINGKASAN KEUANGAN PERIODE", 14, 40);
    autoTable(doc, {
      startY: 44,
      head: [['Keterangan', 'Nilai']],
      body: [
        ['Total Pendapatan (Omset)', formatIDR(revenue)],
        ['Total HPP Terjual (Modal)', formatIDR(totalCOGS)],
        ['Beban Operasional', formatIDR(operationalExpenses)],
        ['Laba Bersih Operasional', formatIDR(netProfit)],
        ['Investasi Aset Stok Baru', formatIDR(assetInvestment)],
      ],
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [51, 65, 85] }
    });

    // Sub-Table: Current Financial Position
    doc.setFontSize(12);
    doc.text("POSISI KEUANGAN SAAT INI", 14, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Kategori Posisi', 'Nilai']],
      body: [
        ['Total Saldo Kas TerSEDIA', formatIDR(totalCash)],
        ['Total Nilai Aset Stok (Gudang)', formatIDR(totalInventoryValue)],
        ['Total Kekayaan Bersih (Kas + Stok)', formatIDR(totalCash + totalInventoryValue)],
      ],
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [37, 99, 235] }
    });

    // Tabel 2: Riwayat Arus Kas
    doc.addPage();
    doc.text("RIWAYAT ARUS KAS", 14, 20);
    autoTable(doc, {
      startY: 24,
      head: [['Tanggal', 'Kategori', 'Deskripsi', 'Tipe', 'Nominal']],
      body: filteredTransactions.map(t => [
        formatDateLabel(t.createdAt),
        t.category.replace('_', ' '),
        t.description,
        t.type === TransactionType.CASH_IN ? 'MASUK' : 'KELUAR',
        formatIDR(t.amount)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] }
    });

    // Tabel 3: Riwayat Penjualan
    if (filteredSales.length > 0) {
      doc.addPage();
      doc.text("RIWAYAT PENJUALAN", 14, 20);
      autoTable(doc, {
        startY: 24,
        head: [['Tanggal', 'Produk', 'Qty', 'Harga', 'Total', 'Profit']],
        body: filteredSales.map(s => [
          formatDateLabel(s.createdAt),
          s.productName,
          s.quantity,
          formatIDR(s.salePrice),
          formatIDR(s.totalRevenue),
          formatIDR(s.totalRevenue - s.totalCOGS)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
      });
    }

    // Tabel 4: Riwayat Produksi
    if (filteredProductions.length > 0) {
      doc.addPage();
      doc.text("RIWAYAT PRODUKSI", 14, 20);
      autoTable(doc, {
        startY: 24,
        head: [['Tanggal', 'Produk Jadi', 'Qty', 'Total HPP', 'HPP/Unit']],
        body: filteredProductions.map(p => [
          formatDateLabel(p.createdAt),
          p.outputProductName,
          p.outputQuantity,
          formatIDR(p.totalHPP),
          formatIDR(p.totalHPP / p.outputQuantity)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
      });
    }

    // Tabel 5: Status Stok Aktif
    doc.addPage();
    doc.text("STATUS STOK SAAT INI", 14, 20);
    autoTable(doc, {
      startY: 24,
      head: [['Nama Produk', 'Tipe', 'Sisa Stok', 'HPP/Unit', 'Nilai Stok']],
      body: activeStocks.map(b => [
        b.productName,
        b.stockType === StockType.FOR_PRODUCTION ? 'BAHAN' : 'JADI',
        b.currentQuantity,
        formatIDR(b.buyPrice),
        formatIDR(b.currentQuantity * b.buyPrice)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] }
    });

    doc.save(`Laporan_${state.settings.businessName.replace(/\s+/g, '_')}_${startStr}_sd_${endStr}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Laporan Laba Rugi</h2>
          <div className="flex items-center gap-2">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Metode: Akuntansi Akrual (Persediaan)</p>
            <div className="group relative">
               <Info size={12} className="text-blue-400 cursor-help" />
               <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-4 bg-slate-900 text-white text-[9px] rounded-2xl shadow-2xl z-50 leading-relaxed font-bold uppercase tracking-wider">
                 Biaya stok hanya memotong laba saat terjual (HPP). Pembelian stok dianggap sebagai perubahan bentuk aset.
               </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20">
          <div className="flex flex-row items-center gap-2 w-full">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[7px] lg:text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Mulai Dari</label>
              <input 
                type="text" placeholder="DD/MM/YYYY"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 w-full text-[10px] lg:text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={startDateStr}
                onChange={(e) => handleDateInput(e.target.value, setStartDateStr)}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[7px] lg:text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai Dengan</label>
              <input 
                type="text" placeholder="DD/MM/YYYY"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 w-full text-[10px] lg:text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={endDateStr}
                onChange={(e) => handleDateInput(e.target.value, setEndDateStr)}
              />
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={handleExportXLSX} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20">
              <FileSpreadsheet size={16} strokeWidth={3} />
              <span>FILE XLSX</span>
            </button>
            <button onClick={handleExportPDF} className="flex-1 md:flex-none bg-slate-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 text-white px-4 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-[9px] uppercase tracking-widest shadow-lg shadow-slate-900/10">
              <FileText size={16} strokeWidth={3} />
              <span>FILE PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="p-2 lg:p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl"><TrendingUp size={16} className="lg:w-5 lg:h-5" /></div>
            <span className="text-[7px] lg:text-[9px] font-black text-blue-600 bg-blue-100/50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full uppercase">Omset</span>
          </div>
          <p className="text-[7px] lg:text-[9px] font-black text-slate-400 uppercase tracking-widest">Penjualan</p>
          <h3 className="text-xs lg:text-xl font-black text-slate-900 dark:text-white tracking-tighter mt-1 truncate">{formatIDR(revenue)}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="p-2 lg:p-2.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl"><Box size={16} className="lg:w-5 lg:h-5" /></div>
            <span className="text-[7px] lg:text-[9px] font-black text-orange-600 bg-orange-100/50 dark:bg-orange-500/10 px-2 py-0.5 rounded-full uppercase">Modal</span>
          </div>
          <p className="text-[7px] lg:text-[9px] font-black text-slate-400 uppercase tracking-widest">HPP Terjual</p>
          <h3 className="text-xs lg:text-xl font-black text-orange-700 dark:text-orange-400 tracking-tighter mt-1 truncate">{formatIDR(totalCOGS)}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="p-2 lg:p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl"><TrendingDown size={16} className="lg:w-5 lg:h-5" /></div>
            <span className="text-[7px] lg:text-[9px] font-black text-rose-600 bg-rose-100/50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full uppercase">Beban Ops</span>
          </div>
          <p className="text-[7px] lg:text-[9px] font-black text-slate-400 uppercase tracking-widest">Biaya Rutin</p>
          <h3 className="text-xs lg:text-xl font-black text-rose-700 dark:text-rose-400 tracking-tighter mt-1 truncate">{formatIDR(operationalExpenses)}</h3>
        </div>

        <div className="bg-slate-900 dark:bg-blue-600 p-4 lg:p-6 rounded-2xl shadow-xl border border-slate-800 dark:border-blue-500 lg:scale-105 ring-4 ring-emerald-500/20">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="p-2 lg:p-2.5 bg-emerald-500/20 text-emerald-400 dark:text-emerald-100 rounded-xl"><Scale size={16} className="lg:w-5 lg:h-5" /></div>
            <span className="text-[7px] lg:text-[9px] font-black text-emerald-400 dark:text-emerald-100 bg-white/10 px-2 py-0.5 rounded-full uppercase">Hasil Riil</span>
          </div>
          <p className="text-[7px] lg:text-[9px] font-black text-white/40 dark:text-white/60 uppercase tracking-widest">Laba Bersih</p>
          <h3 className={`text-sm lg:text-2xl font-black tracking-tighter mt-1 truncate ${netProfit >= 0 ? 'text-emerald-400 dark:text-emerald-100' : 'text-rose-400'}`}>
            {formatIDR(netProfit)}
          </h3>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md"><FileSpreadsheet size={18} strokeWidth={2.5} /></div>
            <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-tight">Rincian Transaksi Arus Kas</h4>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
               <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Aset Persediaan: {formatIDR(assetInvestment)}</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 shadow-sm z-10 border-b dark:border-slate-800">
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-400 text-[9px] uppercase font-black tracking-widest">
                <th className="px-8 py-4">Tgl / Waktu</th>
                <th className="px-8 py-4">Kategori</th>
                <th className="px-8 py-4">Deskripsi</th>
                <th className="px-8 py-4 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                  <td className="px-8 py-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-900 dark:text-white leading-tight">{formatDateLabel(t.createdAt)}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`text-[8px] font-black uppercase border px-2 py-0.5 rounded inline-block ${
                      t.category === TransactionCategory.OPERATIONAL 
                      ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/10'
                      : t.category === TransactionCategory.SALES
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/10'
                      : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/10'
                    }`}>
                      {t.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase leading-tight max-w-sm">{t.description}</p>
                    {(t.category === TransactionCategory.STOCK_PURCHASE || t.category === TransactionCategory.PRODUCTION_COST) && (
                      <span className="text-[7px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-tighter">Penambahan Aset</span>
                    )}
                  </td>
                  <td className={`px-8 py-4 text-right font-black text-[11px] tracking-tighter ${t.type === TransactionType.CASH_IN ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === TransactionType.CASH_IN ? '+' : '-'}{formatIDR(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
