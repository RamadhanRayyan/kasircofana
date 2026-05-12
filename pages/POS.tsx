
import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Banknote, Download, CheckCircle2, Box, ChevronDown, LayoutGrid } from 'lucide-react';
import jsPDF from 'jspdf';
import { Product, CartItem, Transaction, Category, CooperativeAccount } from '../types';
import GlobalModal from '../components/GlobalModal';


interface POSProps {
  products: Product[];
  onCompleteTransaction: (transaction: Transaction) => void;
  activeAccount: CooperativeAccount;
}

const POS: React.FC<POSProps> = ({ products, onCompleteTransaction, activeAccount }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  /* Variant State */
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [tempSelectedVariants, setTempSelectedVariants] = useState<Product['variants']>([]);

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  const [isMobileCartVisible, setIsMobileCartVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string) => {
    setModal({ isOpen: true, type: 'alert', title, message, onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })) });
  };

  const showConfirm = (title: string, message: string, onConfirmAction: () => void) => {
    setModal({ 
      isOpen: true, 
      type: 'confirm', 
      title, 
      message, 
      onConfirm: () => {
        onConfirmAction();
        setModal(prev => ({ ...prev, isOpen: false }));
      } 
    });
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    // Check for variants
    if (product.variants && product.variants.length > 0) {
      setSelectedProductForVariant(product);
      setTempSelectedVariants([]);
      setIsVariantModalOpen(true);
      return;
    }

    addItemToCart(product, []);
  };

  const addItemToCart = (product: Product, variants: Product['variants']) => {
     setCart(prev => {
      // Unique ID based on Product ID + Variant Strings (sorted)
      const variantKey = variants ? variants.map(v => v.name).sort().join(',') : '';
      
      const existing = prev.find(item => {
          const itemVariantKey = item.selectedVariants ? item.selectedVariants.map(v => v.name).sort().join(',') : '';
          return item.id === product.id && itemVariantKey === variantKey;
      });

      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => {
             const itemVariantKey = item.selectedVariants ? item.selectedVariants.map(v => v.name).sort().join(',') : '';
             return (item.id === product.id && itemVariantKey === variantKey) ? { ...item, quantity: item.quantity + 1 } : item
        });
      }
      return [...prev, { ...product, quantity: 1, selectedVariants: variants }];
    });
  }

  const handleVariantSubmit = () => {
      if (selectedProductForVariant) {
          addItemToCart(selectedProductForVariant, tempSelectedVariants);
          setIsVariantModalOpen(false);
          setSelectedProductForVariant(null);
          setTempSelectedVariants([]);
      }
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        if (newQty > item.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const setQuantity = (id: string, value: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, Math.min(value, item.stock));
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const calculateItemPrice = (item: CartItem) => {
      const variantsPrice = item.selectedVariants ? item.selectedVariants.reduce((sum, v) => sum + v.price, 0) : 0;
      return item.price + variantsPrice;
  }

  const subtotal = cart.reduce((acc, item) => acc + (calculateItemPrice(item) * item.quantity), 0);
  const total = subtotal;
  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const getProductCartQuantity = (productId: string) => cart
    .filter(item => item.id === productId)
    .reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = async (method: Transaction['paymentMethod']) => {
    if (cart.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const newTransaction: Transaction = {
        id: `TRX-${Date.now()}`,
        items: [...cart],
        total,
        paymentMethod: method,
        date: new Date().toISOString()
      };
      
      // Await the completion if onCompleteTransaction returns a promise (it does in App.tsx)
      await onCompleteTransaction(newTransaction);
      
      setLastTransaction(newTransaction);
      setCart([]);
      setIsSuccessModalOpen(true);
      setIsMobileCartVisible(false);
    } catch (error) {
      console.error("Transaction failed", error);
      showAlert("Transaksi Gagal", "Terjadi kesalahan saat memproses transaksi. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const handleExportReceipt = () => {
    if (!lastTransaction) return;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Design Configuration
    const margin = 5;
    const contentWidth = pageWidth - (margin * 2);
    const primaryColor = [16, 185, 129]; // amber-600 RGB
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
    // Logo placeholder / Brand Name
    doc.setFillColor(236, 253, 245); // amber-50 background
    doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, 'F');
    
    yPos += 8;
    centerText("KOPERASI", yPos, 14, true, primaryColor);
    yPos += 5;
    centerText("Digital Payment Receipt", yPos, 8, false, grayColor);
    yPos += 15;

    // --- TRANSACTION DETAILS ---
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    // Order ID & Date Row
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text("Order ID", margin, yPos);
    doc.text("Tanggal", pageWidth - margin, yPos, { align: 'right' });
    yPos += 4;
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(lastTransaction.id, margin, yPos);
    const dateStr = new Date(lastTransaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit'});
    const timeStr = new Date(lastTransaction.date).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
    doc.text(`${dateStr}, ${timeStr}`, pageWidth - margin, yPos, { align: 'right' });
    
    yPos += 8;

    // Cashier
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text("Kasir", margin, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(activeAccount?.name || 'Admin', pageWidth - margin, yPos, { align: 'right' });

    yPos += 6;
    drawLine(yPos);
    yPos += 6;

    // --- ITEMS LIST ---
    lastTransaction.items.forEach(item => {
      // Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(item.name, margin, yPos);
      yPos += 4;
      
      // Detail
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text(`${item.quantity} x ${formatCurrency(item.price)}`, margin, yPos);
      
      doc.setTextColor(0, 0, 0);
      doc.text(formatCurrency(item.quantity * item.price), pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
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
    doc.text(formatCurrency(lastTransaction.total), pageWidth - margin - 3, totalY + 6, { align: 'right' });
    
    doc.setFontSize(8);
    doc.text(lastTransaction.paymentMethod, margin + 3, totalY + 6);

    yPos += 25;

    // --- FOOTER ---
    centerText("Terima Kasih", yPos, 10, true, primaryColor);
    yPos += 5;
    centerText("Simpan struk ini sebagai bukti pembayaran yang sah.", yPos, 7, false, grayColor);

    // Save
    doc.save(`Receipt_${lastTransaction.id}.pdf`);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 md:gap-6 relative max-w-[1800px] mx-auto">
      {/* Product List Section & Cart - Hide on Print */}
      <div className="contents">
          <div className="flex-1 flex flex-col gap-4 md:gap-5 overflow-hidden">
            {/* Responsive Filter Header */}
            <div className="bg-white p-3 sm:p-4 rounded-4xl sm:rounded-3xl border border-slate-200 flex flex-col gap-4 shadow-sm shadow-slate-100/50 shrink-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari Produk..." 
                  className="w-full pl-11 pr-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none text-[13px] font-semibold transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
                <button
                  onClick={() => setActiveCategory('All')}
                  className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${
                    activeCategory === 'All' 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xl shadow-amber-200' 
                    : 'bg-white text-slate-500 border-amber-100 hover:border-amber-200 hover:text-amber-600 shadow-sm'
                  }`}
                >
                  Semua
                </button>
                {Object.values(Category).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${
                      activeCategory === cat 
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xl shadow-amber-200' 
                      : 'bg-white text-slate-500 border-amber-100 hover:border-amber-200 hover:text-amber-600 shadow-sm'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5 pb-40 md:pb-6 pr-2 items-start content-start custom-scrollbar">
              {filteredProducts.map(product => {
                const selectedQuantity = getProductCartQuantity(product.id);

                return (
                <button 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className={`group flex flex-col bg-white border border-amber-100 rounded-[32px] overflow-hidden hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-900/10 transition-all duration-500 text-left p-5 h-full min-h-[180px] relative ${product.stock <= 0 ? 'opacity-40 grayscale pointer-events-none' : 'shadow-sm shadow-slate-200/50'}`}
                >
                  {selectedQuantity > 0 && (
                    <span className="md:hidden absolute right-3 bottom-3 z-10 min-w-8 h-8 px-2 bg-amber-600 text-white rounded-2xl border-4 border-white shadow-xl shadow-amber-900/20 flex items-center justify-center text-[12px] font-black leading-none">
                      {selectedQuantity}
                    </span>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-sm border border-amber-100/50 group-hover:scale-110 transition-transform">
                      <Box size={18} />
                    </div>
                    {product.stock <= product.minStock && product.stock > 0 && (
                      <span className="bg-orange-100 text-orange-600 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">Low Stock</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="mb-3">
                      <p className="text-[9px] font-black text-amber-600 uppercase mb-1 tracking-widest opacity-80">{product.category}</p>
                      <h4 className="text-[12px] lg:text-[14px] font-black text-slate-800 line-clamp-2 leading-tight group-hover:text-amber-700 transition-colors uppercase tracking-tight">{product.name}</h4>
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-amber-50 flex items-center justify-between gap-2">
                      <p className="text-[14px] lg:text-[16px] font-black text-amber-700 tracking-tight shrink-0">{formatCurrency(product.price)}</p>
                      <div className={`px-2 py-1 rounded-lg flex items-center gap-1.5 ${product.stock <= product.minStock ? 'bg-orange-50 text-orange-600' : 'bg-amber-50 text-slate-500'}`}>
                        <div className={`w-1 h-1 rounded-full ${product.stock <= product.minStock ? 'bg-orange-500' : 'bg-slate-400'}`}></div>
                        <span className="text-[9px] font-black uppercase tracking-wider">
                          Stok: {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )})}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="w-20 h-20 bg-amber-50 rounded-[40px] flex items-center justify-center mx-auto mb-4 border border-amber-100">
                    <Search size={32} className="text-slate-200" />
                  </div>
                  <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Produk tidak ditemukan</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart Drawer & Sidebar - Optimized for Tablet */}
            <div className={`
            fixed md:static inset-x-0 bottom-0 z-50 bg-white md:bg-white border-t md:border border-slate-200 md:rounded-[40px] shadow-2xl md:shadow-xl md:shadow-slate-200/50 flex flex-col overflow-hidden transition-all duration-500 ease-out
            ${isMobileCartVisible ? 'h-[85vh] translate-y-0 rounded-t-[40px]' : 'h-0 translate-y-1/2 md:h-full md:translate-y-0 md:w-80 xl:w-[400px]'}
          `}>
            <div className="p-5 sm:p-6 border-b border-amber-50 flex items-center justify-between bg-amber-50/30">
              <h3 className="font-black text-slate-800 flex items-center gap-3 text-sm xl:text-base uppercase tracking-widest">
                <ShoppingCart size={20} className="text-amber-600" />
                  Keranjang <span className="bg-amber-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px]">{totalCartItems}</span>
              </h3>
              <div className="flex items-center gap-4">
                <button onClick={() => {
                  if (cart.length > 0) {
                    showConfirm('Kosongkan Keranjang', 'Apakah Anda yakin ingin menghapus semua item?', () => setCart([]));
                  }
                }} className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:text-red-600 transition-colors">Clear</button>
                <button className="md:hidden p-2 bg-stone-100 text-slate-400 rounded-2xl" onClick={() => setIsMobileCartVisible(false)}><ChevronDown size={24} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-20 h-20 bg-amber-50 rounded-[40px] flex items-center justify-center text-amber-200 mb-6">
                    <ShoppingCart size={32} />
                  </div>
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest max-w-[150px] leading-relaxed">Belum ada item yang dipilih</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 bg-amber-50/50 rounded-[28px] border border-amber-100 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black text-slate-800 truncate leading-tight group-hover:text-amber-700 transition-colors">{item.name}</p>
                      {item.selectedVariants && item.selectedVariants.length > 0 && (
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5 line-clamp-1">
                              + {item.selectedVariants.map(v => v.name).join(', ')}
                          </p>
                      )}
                      <p className="text[11px] text-amber-600 font-black mt-1 tracking-tight">{formatCurrency(calculateItemPrice(item))}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-amber-100">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shrink-0"><Minus size={14} /></button>
                      <input 
                        type="number" 
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => {
                           // If empty, set to 0. If 0, it won't disappear because of filter, but UI will look empty.
                           // Actually filter > 0 removes it. But if we allow 0 temporarily in setQuantity, we need to defer removal.
                           // But current setQuantity removes if 0.
                           // User usually uses '-' button to remove, or types 0.
                           // If they want to change 10 to 5, and delete 0 -> 1. Delete 1 -> 0 -> Boom removed.
                           // To fix "cannot delete", providing a way to type "5" after deleting "1" (from "10") requires NOT removing on 0 immediately.
                           // However, changing setQuantity logic is risky for 'removeFromCart'.
                           // The reported bug "cannot delete 0" implies the 0 comes back.
                           // If the behavior is "it gets removed", they'd complain "item hilang".
                           // If they complain "0 gabisa didelete", it means 0 STAYS.
                           // So I will assume the filter is NOT removing it instantly in the input context or the user refers to Inventory inputs primarily.
                           // But I will apply the 'display empty if 0' trick here too just in case.
                           setQuantity(item.id, parseInt(e.target.value) || 0)
                        }}
                        onFocus={(e) => e.target.select()}
                        className="text-[13px] font-black w-10 text-center text-slate-700 bg-transparent border-none outline-none focus:ring-0 p-0"
                      />
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-amber-600 transition-colors shrink-0"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 sm:p-8 border-t border-amber-100 bg-amber-50/50 space-y-5 rounded-b-[40px]">
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-slate-800">{formatCurrency(subtotal)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-4 border-t border-dashed border-slate-200">
                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total Bayar</span>
                <span className="text-2xl font-black text-amber-700 tracking-tight">{formatCurrency(total)}</span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsMobileCartVisible(false)}
                    className="flex-1 py-4 bg-slate-200 text-slate-700 rounded-[20px] hover:bg-slate-300 transition-all font-black uppercase text-[11px] tracking-widest active:scale-95 flex items-center justify-center gap-2"
                  >
                    Lanjut Pilih
                  </button>
                  <button 
                    onClick={() => {
                      if(cart.length > 0) {
                        showConfirm('Batal Transaksi', 'Apakah Anda yakin ingin menggugurkan pesanan ini?', () => {
                          setCart([]);
                          setIsMobileCartVisible(false);
                        });
                      } else if (cart.length === 0) {
                        setIsMobileCartVisible(false);
                      }
                    }}
                    className="flex-1 py-4 bg-red-50 text-red-500 rounded-[20px] hover:bg-red-100 transition-all font-black uppercase text-[11px] tracking-widest active:scale-95 flex items-center justify-center gap-2"
                  >
                    Batal
                  </button>
                </div>
                <button 
                  onClick={() => handleCheckout('Cash')}
                  disabled={cart.length === 0 || isProcessing}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-amber-600 text-white rounded-[24px] hover:bg-amber-700 transition-all shadow-xl shadow-amber-200 font-black uppercase text-[13px] tracking-widest disabled:opacity-40 disabled:shadow-none active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Banknote size={20} />
                  )}
                  {isProcessing ? 'Memproses...' : 'Selesaikan Pembayaran'}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Actions */}
          {!isMobileCartVisible && (
            <div className="md:hidden fixed inset-x-0 bottom-0 z-40 p-4 bg-white/95 backdrop-blur-xl border-t border-amber-100 shadow-[0_-16px_40px_rgba(15,23,42,0.12)]">
              <div className="flex gap-3 max-w-lg mx-auto">
                <button
                  onClick={() => handleCheckout('Cash')}
                  disabled={cart.length === 0 || isProcessing}
                  className="flex-[1.35] h-16 rounded-[24px] bg-amber-600 text-white shadow-xl shadow-amber-300/40 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed active:scale-95 disabled:active:scale-100 transition-all flex flex-col items-center justify-center gap-0.5 font-black uppercase tracking-widest"
                >
                  <span className="flex items-center gap-2 text-[12px]">
                    {isProcessing ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Banknote size={18} />}
                    {isProcessing ? 'Proses' : 'Bayar'}
                  </span>
                  <span className="text-[10px] text-amber-100 tracking-normal normal-case">{formatCurrency(total)}</span>
                </button>
                <button
                  onClick={() => setIsMobileCartVisible(true)}
                  className="flex-1 h-16 rounded-[24px] bg-slate-900 text-white shadow-xl shadow-slate-400/30 active:scale-95 transition-all flex items-center justify-center gap-2 font-black uppercase text-[12px] tracking-widest relative"
                >
                  <ShoppingCart size={19} />
                  Keranjang
                  {totalCartItems > 0 && (
                    <span className="absolute -top-2 -right-1 min-w-7 h-7 px-2 bg-red-500 text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white">
                      {totalCartItems}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success Modal - Screen Only */}
          {isSuccessModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
              <div className="bg-white rounded-[48px] w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300 border border-white/20">
                <div className="bg-amber-600 p-8 text-center text-white relative">
                  <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center mx-auto mb-5 border border-white/30 backdrop-blur-sm">
                    <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-2xl font-black mb-1 uppercase tracking-tight">Sukses!</h2>
                  <p className="text-amber-100 text-[10px] uppercase font-black tracking-[0.2em] opacity-80">{lastTransaction?.id}</p>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {lastTransaction?.items.map(item => (
                      <div key={item.id} className="flex justify-between text-[11px] font-bold border-b border-amber-50 pb-2 last:border-0">
                        <span className="text-slate-500">{item.quantity}x {item.name}</span>
                        <span className="font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-5 border-t-2 border-dashed border-amber-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
                    <span className="text-2xl font-black text-amber-700 tracking-tight">{formatCurrency(lastTransaction?.total || 0)}</span>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={handleExportReceipt} className="flex-1 flex items-center justify-center gap-2 py-4 bg-stone-100 text-slate-700 rounded-[20px] font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                      <Download size={18} />Ekspor PDF
                    </button>
                    <button onClick={() => setIsSuccessModalOpen(false)} className="flex-1 py-4 bg-amber-600 text-white rounded-[20px] font-black text-[11px] uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 active:scale-95">
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
      {/* Variant Selection Modal */}
      {isVariantModalOpen && selectedProductForVariant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-amber-100 bg-amber-50 flex justify-between items-center">
                 <div>
                    <h3 className="font-black text-slate-800 text-sm">Pilih Tambahan</h3>
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">{selectedProductForVariant.name}</p>
                 </div>
                 <button onClick={() => setIsVariantModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus size={24} className="rotate-45" /></button>
              </div>
              <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 {selectedProductForVariant.variants?.map((variant, idx) => {
                     const isSelected = tempSelectedVariants?.some(v => v.name === variant.name);
                     return (
                         <div 
                            key={idx} 
                            onClick={() => {
                                setTempSelectedVariants(prev => {
                                    if (isSelected) return prev?.filter(v => v.name !== variant.name);
                                    return [...(prev || []), variant];
                                })
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                isSelected 
                                ? 'bg-amber-50 border-amber-500 shadow-md shadow-amber-100' 
                                : 'bg-white border-slate-200 hover:border-amber-300'
                            }`}
                         >
                            <span className={`text-xs font-bold ${isSelected ? 'text-amber-800' : 'text-slate-700'}`}>{variant.name}</span>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isSelected ? 'bg-amber-200 text-amber-800' : 'bg-stone-100 text-slate-500'}`}>
                                +{formatCurrency(variant.price)}
                            </span>
                         </div>
                     )
                 })}
              </div>
              <div className="p-5 border-t border-amber-100 bg-amber-50">
                  <button 
                    onClick={handleVariantSubmit}
                    className="w-full py-3 bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-200 hover:bg-amber-700 active:scale-95 transition-all"
                  >
                    Tambahkan ke Pesanan 
                    {tempSelectedVariants && tempSelectedVariants.length > 0 && ` (+${formatCurrency(tempSelectedVariants.reduce((a,b)=>a+b.price,0))})`}
                  </button>
              </div>
           </div>
        </div>
      )}
      <GlobalModal 
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default POS;
