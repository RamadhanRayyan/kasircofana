
import React, { useState, useEffect } from 'react';
/* Added missing X icon to imports */
import { Package, Plus, Search, Filter, Edit2, Trash2, ChevronRight, AlertTriangle, Box, X } from 'lucide-react';
import { Product, Category } from '../types';
import { supabase } from '../lib/supabaseClient';
import GlobalModal from '../components/GlobalModal';


interface InventoryProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  activeAccountId: string;
  activeAccountName?: string;
}

const Inventory: React.FC<InventoryProps> = ({ products, setProducts, activeAccountId, activeAccountName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  /* Added ProductVariant to state */
  const [formData, setFormData] = useState<Partial<Product>>({ name: '', sku: '', category: Category.MAKANAN, price: 0, cost: 0, stock: 0, minStock: 5, variants: [] });
  
  // Filter states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  const [filterStockStatus, setFilterStockStatus] = useState<'All' | 'Zero' | 'Low'>('All');

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

  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    
    let matchesStock = true;
    if (filterStockStatus === 'Zero') matchesStock = p.stock === 0;
    else if (filterStockStatus === 'Low') matchesStock = p.stock > 0 && p.stock <= 7;

    const matchesBranch = p.branch_id === activeAccountId; 
    
    return matchesSearch && matchesCategory && matchesStock && matchesBranch;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStockStatus, activeAccountId]);

  const handleAddOrUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccountId) return; 

    // Validation: New products must have stock > 0
    if (!formData.id && Number(formData.stock) <= 0) {
      showAlert('Input Tidak Valid', 'Stok awal barang baru harus lebih dari 0!');
      return;
    }

    setIsLoading(true);

    const productPayload = {
      branch_id: activeAccountId, // Tag New Product with Active Branch
      name: formData.name || 'Produk Baru',
      sku: formData.sku || null,
      category: formData.category as Category,
      price: Number(formData.price),
      cost: Number(formData.cost),
      stock: Number(formData.stock),
      min_stock: Number(formData.minStock),
      variants: formData.variants || []
    };

    if (formData.id) {
        // Update Existing
        const { error } = await supabase
            .from('products')
            .update(productPayload)
            .eq('id', formData.id);

        if (error) {
            showAlert('Gagal Memperbarui', 'Gagal memperbarui produk: ' + error.message);
        } else {
             // App.tsx uses realtime so no need to manual update setProducts if subscribed
             // But for responsiveness, we can update local state
             setProducts(products.map(p => p.id === formData.id ? { ...p, ...productPayload, minStock: productPayload.min_stock, id: formData.id! } : p));
             setIsAddModalOpen(false);
             resetForm();
        }
    } else {
        // Add New
        const { data, error } = await supabase
        .from('products')
        .insert([productPayload])
        .select();

        if (error) {
            console.error("Error adding product:", error);
            if (error.message && error.message.includes('variants')) {
                 showAlert('Database Update Diperlukan', 'Gagal: Kolom "variants" tidak ditemukan di database. Mohon jalankan script update database.');
            } else {
                 showAlert('Gagal Menambah', 'Gagal menambahkan produk: ' + error.message);
            }
        } else if (data) {
            const mappedProduct: Product = {
                ...data[0],
                sku: data[0].sku,
                minStock: data[0].min_stock
            }
            setProducts([...products, mappedProduct]);
            setIsAddModalOpen(false);
            resetForm();
        }
    }
    
    setIsLoading(false);
  };

  const handleDeleteProduct = (id: string) => {
      showConfirm(
        'Hapus Produk',
        'Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.',
        async () => {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
            
          if (error) {
              showAlert('Gagal Menghapus', 'Terjadi kesalahan: ' + error.message);
          } else {
              setProducts(products.filter(p => p.id !== id));
          }
        }
      );
  }

  const openEditModal = (product: Product) => {
      setFormData(product);
      setIsAddModalOpen(true);
  }

  const resetForm = () => {
      setFormData({ name: '', sku: '', category: Category.MAKANAN, price: 0, cost: 0, stock: 1, minStock: 5, variants: [] });
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Stok Barang {activeAccountName && <span className="text-amber-600">- {activeAccountName}</span>}</h1>
          <p className="text-xs lg:text-sm text-slate-500">Kelola ketersediaan barang toko di cabang ini.</p>
        </div>
        <button onClick={() => { resetForm(); setIsAddModalOpen(true); }} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg text-sm">
          <Plus size={20} /> Tambah Barang
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <StatItem icon={<Package size={20} />} color="blue" label="Total Barang" value={products.length} />
        <StatItem icon={<X size={20} />} color="red" label="Zero Stock" value={products.filter(p => p.stock === 0).length} />
        <StatItem icon={<AlertTriangle size={20} />} color="orange" label="Low Stock (1-7)" value={products.filter(p => p.stock > 0 && p.stock <= 7).length} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-3 lg:p-4 border-b border-amber-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Cari barang..." className="w-full pl-10 pr-4 py-2 bg-amber-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${isFilterOpen ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-stone-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>
        
        {/* Filter Options Panel */}
        {isFilterOpen && (
          <div className="p-3 lg:p-4 bg-amber-50/50 border-b border-amber-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Kategori</label>
              <select 
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as Category | 'All')}
              >
                <option value="All">Semua Kategori</option>
                {Object.values(Category).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Status Stok</label>
              <select 
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
                value={filterStockStatus}
                onChange={(e) => setFilterStockStatus(e.target.value as 'All' | 'Zero' | 'Low')}
              >
                <option value="All">Semua Status</option>
                <option value="Zero">Zero Stock (0)</option>
                <option value="Low">Low Stock (1-7)</option>
              </select>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-amber-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 lg:px-6 py-4">SKU</th>
                <th className="px-4 lg:px-6 py-4">Barang</th>
                <th className="px-4 lg:px-6 py-4">Kategori</th>
                <th className="px-4 lg:px-6 py-4">Hrg Beli</th>
                <th className="px-4 lg:px-6 py-4">Hrg Jual</th>
                <th className="px-4 lg:px-6 py-4 text-center">Stok</th>
                <th className="px-4 lg:px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-amber-50/50 transition-colors text-xs lg:text-sm">
                    <td className="px-4 lg:px-6 py-4">
                      <span className="font-mono text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">{p.sku || '-'}</span>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-stone-100 flex items-center justify-center text-slate-400 shrink-0"><Box size={16} /></div>
                        <span className="font-semibold text-slate-800 line-clamp-1">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4"><span className="text-[10px] font-medium bg-stone-100 text-slate-600 px-2 py-1 rounded-full uppercase">{p.category}</span></td>
                    <td className="px-4 lg:px-6 py-4 text-slate-500">{formatCurrency(p.cost)}</td>
                    <td className="px-4 lg:px-6 py-4 text-amber-700 font-semibold">{formatCurrency(p.price)}</td>
                    <td className="px-4 lg:px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-mono font-bold ${p.stock === 0 ? 'text-red-600' : p.stock <= 7 ? 'text-orange-500' : ''}`}>{p.stock}</span>
                        {p.stock === 0 && <span className="text-[8px] font-bold text-red-500 uppercase">Habis</span>}
                        {p.stock > 0 && p.stock <= 7 && <span className="text-[8px] font-bold text-orange-500 uppercase">Tipis</span>}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-1 lg:gap-2">
                        <button onClick={() => openEditModal(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada barang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 lg:px-6 py-4 border-t border-amber-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Menampilkan <span className="font-bold text-slate-800">{paginatedProducts.length}</span> dari <span className="font-bold text-slate-800">{filteredProducts.length}</span> barang
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      currentPage === i + 1 
                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-200' 
                        : 'text-slate-400 hover:bg-stone-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 lg:p-6 border-b border-amber-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg lg:text-xl font-bold text-slate-900">{formData.id ? 'Edit Barang' : 'Barang Baru'}</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddOrUpdateProduct} className="p-5 lg:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Kode SKU</label>
                  <input type="text" placeholder="Contoh: MKN-001" className="w-full px-4 py-2 bg-amber-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono" value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nama Produk</label>
                  <input required type="text" className="w-full px-4 py-2 bg-amber-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Kategori</label>
                  <select className="w-full px-4 py-2 bg-amber-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})}>
                    {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Stok (Restock)</label>
                  <input required type="number" className="w-full px-4 py-2 bg-amber-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm" value={formData.stock?.toString()} onChange={e => setFormData({...formData, stock: e.target.value === '' ? ('' as any) : Number(e.target.value)})} onFocus={e => e.target.select()} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Hrg Beli</label>
                  <input required type="number" className="w-full px-4 py-2 bg-amber-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm" value={formData.cost?.toString()} onChange={e => setFormData({...formData, cost: e.target.value === '' ? ('' as any) : Number(e.target.value)})} onFocus={e => e.target.select()} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Hrg Jual</label>
                  <input required type="number" className="w-full px-4 py-2 bg-amber-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm" value={formData.price?.toString()} onChange={e => setFormData({...formData, price: e.target.value === '' ? ('' as any) : Number(e.target.value)})} onFocus={e => e.target.select()} />
                </div>
              </div>

              
               {/* Variants Section */}
               <div className="space-y-2 pt-2 border-t border-amber-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Varian / Tambahan (Opsional)</label>
                    <button 
                      type="button" 
                      onClick={() => setFormData(p => ({ ...p, variants: [...(p.variants || []), { name: '', price: 0 }] }))}
                      className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      + Tambah Varian
                    </button>
                  </div>
                  
                  {formData.variants && formData.variants.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {formData.variants.map((variant, idx) => (
                        <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-300">
                          <input 
                            type="text" 
                            placeholder="Nama (misal: Telur Dadar)" 
                            className="flex-[2] px-3 py-2 bg-amber-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500"
                            value={variant.name}
                            onChange={(e) => {
                              const newVariants = [...(formData.variants || [])];
                              newVariants[idx].name = e.target.value;
                              setFormData({...formData, variants: newVariants});
                            }}
                          />
                          <input 
                            type="number" 
                            placeholder="0" 
                            className="flex-1 px-3 py-2 bg-amber-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500"
                            value={variant.price === 0 ? '' : variant.price}
                            onChange={(e) => {
                              const newVariants = [...(formData.variants || [])];
                              newVariants[idx].price = e.target.value === '' ? 0 : Number(e.target.value);
                              setFormData({...formData, variants: newVariants});
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const newVariants = formData.variants?.filter((_, i) => i !== idx);
                              setFormData({...formData, variants: newVariants});
                            }} 
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center border border-dashed border-slate-200 rounded-xl bg-amber-50/50">
                      <p className="text-[10px] text-slate-400 italic">Belum ada varian tambahan.</p>
                    </div>
                  )}
               </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-6 py-3 bg-stone-100 text-slate-700 rounded-xl font-bold text-xs">Batal</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-amber-100">{formData.id ? 'Perbarui' : 'Simpan'}</button>
              </div>
            </form>
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

const StatItem: React.FC<{ icon: React.ReactNode, color: string, label: string, value: number }> = ({ icon, color, label, value }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-500'
  };
  return (
    <div className="bg-white p-3 lg:p-4 rounded-2xl border border-slate-200 flex items-center gap-3 lg:gap-4 shadow-sm">
      <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] lg:text-xs font-medium text-slate-500">{label}</p>
        <p className="text-base lg:text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

export default Inventory;
