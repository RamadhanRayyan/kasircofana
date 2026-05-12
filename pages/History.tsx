
import React, { useState } from 'react';
import { Search, Calendar, ChevronRight, FileText, Printer, Download, X } from 'lucide-react';
import { Transaction } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HistoryProps {
  transactions: Transaction[];
}

const HistoryPage: React.FC<HistoryProps> = ({ transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handlePrintPreview = (t: Transaction) => {
    setSelectedTransaction(t);
  };

  // Export Receipt PDF (Individual) is effectively 'Cetak Struk', but let's keep print for receipts as thermal printers usually need print dialog.
  // Wait, user said "cetak laporan jadi print di ganti jadi pdf". This refers to the main "Cetak Laporan" button.
  // And "benerin detail transaksi agar makin menarik... dan cuman ada tanggal, jam, product, kuantitasnya harga dll"

  const handleExportHistoryPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129);
    doc.text("Riwayat Transaksi", pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periode: ${startDate || 'Semua'} s/d ${endDate || 'Sekarang'}`, pageWidth / 2, 26, { align: 'center' });

    // Table
    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Tanggal', 'Waktu', 'Item', 'Metode', 'Total']],
      body: filteredTransactions.map(t => [
        t.id.slice(0, 8),
        new Date(t.date).toLocaleDateString('id-ID'),
        new Date(t.date).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}),
        t.items.length + ' Barang',
        t.paymentMethod,
        formatCurrency(t.total)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9 }
    });

    doc.save(`Riwayat_Transaksi_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export Single Receipt PDF (Digital Style)
  const handleExportReceipt = () => {
    if (!selectedTransaction) return;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    });

    const pageWidth = doc.internal.pageSize.width;
    
    // Design Configuration (Same as POS)
    const margin = 5;
    const contentWidth = pageWidth - (margin * 2);
    const primaryColor = [16, 185, 129]; // amber-600
    const grayColor = [100, 116, 139]; // Slate-500
    const lightGray = [226, 232, 240]; // Slate-200

    // Helper functions
    const centerText = (text: string, y: number, fontSize: number = 10, isBold: boolean = false, color: number[] = [0,0,0]) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(text, pageWidth / 2, y, { align: 'center' });
    };

    const drawLine = (y: number) => {
      doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
    };

    let yPos = 10;

    // --- HEADER ---
    doc.setFillColor(236, 253, 245); // amber-50 background
    doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, 'F');
    
    yPos += 8;
    centerText("KOPERASI", yPos, 14, true, primaryColor);
    yPos += 5;
    centerText("Digital Payment Receipt", yPos, 8, false, grayColor);
    yPos += 15;

    // --- TRANSACTION DETAILS ---
    doc.setFontSize(8);
    
    // Date & Time
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text("Tanggal & Waktu", margin, yPos);
    yPos += 4;
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const dateStr = new Date(selectedTransaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit'});
    const timeStr = new Date(selectedTransaction.date).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
    doc.text(`${dateStr}, ${timeStr}`, margin, yPos);
    
    yPos += 8;

    // Payment Method
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text("Metode", margin, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(selectedTransaction.paymentMethod, pageWidth - margin, yPos, { align: 'right' });

    yPos += 6;
    drawLine(yPos);
    yPos += 6;

    // --- ITEMS LIST ---
    selectedTransaction.items.forEach(item => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(item.name, margin, yPos);
      yPos += 4;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text(`${item.quantity} x ${formatCurrency(item.price)}`, margin, yPos);
      
      doc.setTextColor(0, 0, 0);
      /* Calculate price with variants */
      const itemPrice = item.price + (item.selectedVariants?.reduce((a, b) => a + b.price, 0) || 0);
      doc.text(formatCurrency(itemPrice * item.quantity), pageWidth - margin, yPos, { align: 'right' });
      yPos += 5;

      /* Render Variants in PDF */
      if (item.selectedVariants && item.selectedVariants.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        const variantsStr = "+ " + item.selectedVariants.map(v => v.name).join(", ");
        doc.text(variantsStr, margin + 2, yPos - 1);
        yPos += 4;
      }
      yPos += 2;
    });

    yPos -= 2;
    drawLine(yPos);
    yPos += 6;

    // --- TOTALS SECTION ---
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]); // amber-600
    doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
    
    let totalY = yPos + 6;
    doc.setTextColor(255, 255, 255); // White text
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Total Pembayaran", margin + 3, totalY);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(selectedTransaction.total), pageWidth - margin - 3, totalY + 6, { align: 'right' });
    
    yPos += 25;

    // --- FOOTER ---
    centerText("Terima Kasih", yPos, 10, true, primaryColor);
    yPos += 5;
    centerText("Bukti transaksi digital yang sah.", yPos, 7, false, grayColor);

    // Save
    doc.save(`Receipt_${selectedTransaction.id}.pdf`);
  };

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const txDate = new Date(t.date);
    txDate.setHours(0, 0, 0, 0);

    let matchesDate = true;
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        matchesDate = matchesDate && txDate >= start;
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(0,0,0,0);
        matchesDate = matchesDate && txDate <= end;
    }
    
    return matchesSearch && matchesDate;
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Riwayat Transaksi</h1>
              <p className="text-slate-500">Cari dan tinjau ulang semua transaksi yang telah selesai.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                <Calendar size={16} className="text-slate-400" />
                <input 
                    type="date" 
                    className="text-xs font-medium outline-none text-slate-600 bg-transparent"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-slate-300">-</span>
                <input 
                    type="date" 
                    className="text-xs font-medium outline-none text-slate-600 bg-transparent"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <button onClick={handleExportHistoryPDF} className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 active:scale-95">
                <Download size={18} />
                Ekspor Riwayat
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-6">
            <div className="p-4 border-b border-amber-100">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari ID Transaksi..." 
                  className="w-full pl-10 pr-4 py-2 bg-amber-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(t => (
                  <div key={t.id} className="px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-amber-50/50 transition-colors flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-100 text-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                        <span className="font-bold text-[12px] sm:text-sm text-slate-900 truncate max-w-[110px] sm:max-w-[150px]">{t.id.slice(0, 8)}...</span>
                        <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-amber-100 text-amber-600 shrink-0">
                          {t.paymentMethod}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                        {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="hidden sm:block flex-1">
                      <p className="text-[10px] text-slate-500">Item Terjual</p>
                      <p className="text-xs font-medium text-slate-700">{t.items.length} Barang</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="hidden sm:block text-[10px] text-slate-500">Total Transaksi</p>
                      <p className="text-[12px] sm:text-base font-bold text-amber-700 leading-tight">{formatCurrency(t.total)}</p>
                      <p className="sm:hidden text-[9px] text-slate-400 font-bold">{t.items.length} barang</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                       {/* Updated button title */}
                      <button onClick={() => handlePrintPreview(t)} className="p-1.5 sm:p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Lihat Detail & Ekspor">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center text-slate-500">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-slate-300" />
                  </div>
                  <p>Tidak ada riwayat transaksi yang ditemukan.</p>
                </div>
              )}
            </div>
          </div>
      </div>

       {/* Detail Modal & PDF Export */}
       {selectedTransaction && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
            <div className="bg-white rounded-[32px] w-full max-w-xs overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-white/20">
              
              {/* Receipt Header */}
              <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <FileText size={18} className="text-amber-600"/> Detail Transaksi
                </h3>
                <button onClick={() => setSelectedTransaction(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm"><X size={16} /></button>
              </div>

               {/* Receipt Content - Digital Style - Compact */}
               <div className="p-5 text-slate-800 bg-white">
                  {/* Status Banner */}
                  <div className="text-center mb-4 bg-amber-50 rounded-xl p-3 border border-amber-100">
                     <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                        <FileText size={20} />
                     </div>
                     <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Transaksi Berhasil</div>
                  </div>
                  
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4 text-[11px] mb-4 pb-4 border-b border-amber-100">
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Tanggal</p>
                      <p className="font-bold text-slate-700">{new Date(selectedTransaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Waktu</p>
                      <p className="font-bold text-slate-700">{new Date(selectedTransaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  {/* Items List - Compact */}
                  <div className="space-y-2 mb-4">
                     <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-amber-50 p-1.5 rounded-lg mb-2">
                        <span>Produk</span>
                        <span>Total</span>
                     </div>
                     <div className="max-h-32 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                        {selectedTransaction.items.map(item => (
                            <div key={item.id} className="flex justify-between items-start text-xs group">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 group-hover:text-amber-700 transition-colors line-clamp-2">

                                      {item.name}
                                    </span>
                                    {item.selectedVariants && item.selectedVariants.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {item.selectedVariants.map((v, idx) => (
                                          <span key={idx} className="text-[9px] font-bold text-slate-500 bg-stone-100 px-1.5 py-0.5 rounded">
                                            + {v.name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <span className="text-[10px] text-slate-500 font-medium">{item.quantity} x {formatCurrency(item.price + (item.selectedVariants?.reduce((a,b)=>a+b.price,0) || 0))}</span>
                                </div>
                                <span className="font-bold text-slate-900">{formatCurrency((item.price + (item.selectedVariants?.reduce((a,b)=>a+b.price,0) || 0)) * item.quantity)}</span>
                            </div>
                        ))}
                     </div>
                  </div>

                  {/* Total Block - Digital Style Compact */}
                  <div className="bg-amber-600 text-white rounded-xl p-4 shadow-lg shadow-amber-200">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-amber-100 uppercase tracking-widest">Total Bayar</span>
                        <span className="text-lg font-black">{formatCurrency(selectedTransaction.total)}</span>
                     </div>
                  </div>
               </div>

               {/* Modal Footer Actions */}
               <div className="p-4 border-t border-amber-100 bg-amber-50 flex gap-3">
                  <button onClick={() => setSelectedTransaction(null)} className="flex-1 py-2.5 text-slate-600 font-bold text-xs bg-white border border-slate-200 rounded-xl hover:bg-amber-50 transition-colors">Tutup</button>
                  <button onClick={handleExportReceipt} className="flex-1 py-2.5 text-white font-bold text-xs bg-slate-800 rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95">
                      <Download size={16} /> Ekspor PDF
                  </button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};


export default HistoryPage;
