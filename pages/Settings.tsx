import React, { useState } from 'react';
import { Building2, Save, Plus, Trash2, Check, AlertTriangle, Loader2, Copy } from 'lucide-react';
import { CooperativeAccount } from '../types';
import { supabase } from '../lib/supabaseClient';
import GlobalModal from '../components/GlobalModal';


interface SettingsProps {
  accounts: CooperativeAccount[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  setAccounts: (accounts: CooperativeAccount[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ accounts, activeAccountId, setActiveAccountId, setAccounts }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CooperativeAccount>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Security Verification State
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [securityAction, setSecurityAction] = useState<{ type: 'SWITCH_BRANCH' | 'RESET_DATA' | 'ADD_BRANCH', id?: string } | null>(null);
  const ADMIN_PASSWORD = 'nurussunnah2026';

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

  const handleSecurityCheck = (type: 'SWITCH_BRANCH' | 'RESET_DATA' | 'ADD_BRANCH', id?: string) => {
    setSecurityAction({ type, id });
    setIsSecurityModalOpen(true);
  };

  const verifyPassword = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      if (securityAction?.type === 'SWITCH_BRANCH' && securityAction.id) {
        setActiveAccountId(securityAction.id);
      } else if (securityAction?.type === 'RESET_DATA') {
        handleResetData();
      } else if (securityAction?.type === 'ADD_BRANCH') {
        addNewAccount();
      }
      setIsSecurityModalOpen(false);
      setPasswordInput('');
      setSecurityAction(null);
    } else {
      showAlert('Password Salah', 'Kata sandi yang Anda masukkan tidak cocok.');
    }
  };

  const handleResetData = async () => {
    showConfirm(
      'Peringatan Reset Data',
      'Peringatan Terakhir: Semua data produk dan transaksi di cabang ini akan dihapus secara permanen. Lanjutkan?',
      async () => {
        setIsLoading(true);
        try {
            const { error: prodError } = await supabase.from('products').delete().eq('branch_id', activeAccountId);
            if (prodError) throw prodError;
            
            const { error: transError } = await supabase.from('transactions').delete().eq('branch_id', activeAccountId);
            if (transError) throw transError;

            showAlert("Berhasil", "Data cabang berhasil direset!");
            setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) {
            showAlert("Gagal", "Gagal reset data: " + error.message);
        } finally {
            setIsLoading(false);
        }
      }
    );
  };

  const startEditing = (account: CooperativeAccount) => {
    setEditingId(account.id);
    setFormData(account);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setIsLoading(true);
    try {
        const { error } = await supabase
            .from('accounts')
            .update({
                name: formData.name,
                address: formData.address,
                phone: formData.phone
            })
            .eq('id', editingId);

        if (error) throw error;

        const newAccounts = accounts.map(a => a.id === editingId ? { ...a, ...formData } as CooperativeAccount : a);
        setAccounts(newAccounts);
        setEditingId(null);
    } catch (error: any) {
        showAlert('Gagal Menyimpan', 'Gagal menyimpan perubahan: ' + error.message);
    } finally {
        setIsLoading(false);
    }
  };

  const addNewAccount = async () => {
    setIsLoading(true);
    try {
        const newBranch = {
            name: 'Cabang Baru',
            address: 'Alamat Belum Diisi',
            phone: '-'
        };
        
        const { data, error } = await supabase
            .from('accounts')
            .insert([newBranch])
            .select()
            .single();

        if (error) throw error;
        if (data) {
             setAccounts([...accounts, data]);
             startEditing(data);
        }
    } catch (error: any) {
        showAlert('Gagal Menambah', 'Gagal menambah cabang: ' + error.message);
    } finally {
        setIsLoading(false);
    }
  };
  
  const deleteAccount = async (id: string) => {
      if (id === activeAccountId) {
          showAlert("Aksi Ditolak", "Tidak bisa menghapus cabang yang sedang aktif!");
          return;
      }
      
      showConfirm(
        'Hapus Cabang',
        'Apakah Anda yakin ingin menghapus cabang ini? Semua data produk dan transaksi di cabang ini akan ikut terhapus!',
        async () => {
          setIsLoading(true);
          try {
              const { error } = await supabase.from('accounts').delete().eq('id', id);
              if (error) throw error;
              setAccounts(accounts.filter(a => a.id !== id));
          } catch (error: any) {
              showAlert('Gagal Menghapus', 'Gagal menghapus cabang: ' + error.message);
          } finally {
              setIsLoading(false);
          }
        }
      );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Cabang</h1>
        <p className="text-slate-500">Kelola daftar cabang toko Anda. Setiap cabang memiliki data produk dan transaksi yang terpisah.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h3 className="font-bold text-slate-800 mb-2">Daftar Cabang</h3>
          <p className="text-sm text-slate-500">
             Gunakan tombol "Gunakan Akun" untuk berpindah antar cabang. Data yang tampil di menu lain akan menyesuaikan dengan cabang yang dipilih.
          </p>
        </div>

        <div className="md:col-span-2 space-y-4">
          {isLoading && <div className="text-center text-sm text-amber-600 animate-pulse">Memproses data...</div>}
          
          {accounts.map(account => (
            <div 
              key={account.id} 
              className={`p-5 rounded-2xl border transition-all ${
                activeAccountId === account.id 
                  ? 'bg-amber-50 border-amber-500 shadow-lg shadow-amber-100/50' 
                  : 'bg-white border-slate-200 hover:border-amber-200'
              }`}
            >
              {editingId === account.id ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Nama Cabang</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 bg-amber-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-800"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Telepon</label>
                        <input 
                        type="text" 
                        className="w-full px-4 py-2 bg-amber-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Alamat</label>
                    <textarea 
                      className="w-full px-4 py-2 bg-amber-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none h-20"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Simpan
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      disabled={isLoading}
                      className="px-4 py-2 bg-stone-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      activeAccountId === account.id ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'bg-stone-100 text-slate-400'
                    }`}>
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{account.name}</h4>
                      <p className="text-sm text-slate-500 leading-snug max-w-xs">{account.address}</p>
                      <p className="text-xs font-bold text-amber-600 mt-1">{account.phone}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {activeAccountId !== account.id ? (
                      <div className="flex gap-2">
                          <button 
                            onClick={() => deleteAccount(account.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Hapus Cabang"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button 
                            onClick={() => setActiveAccountId(account.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-50 hover:border-amber-300 transition-all shadow-sm"
                          >
                            <Check size={14} /> Pilih
                          </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-100 px-3 py-1 rounded-full text-center tracking-widest border border-amber-200">Sedang Aktif</span>
                    )}
                    <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(account.id);
                            showAlert('Tersalin', 'ID Cabang berhasil disalin ke clipboard!');
                          }}
                          className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                          title="Salin ID Cabang"
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          onClick={() => startEditing(account)}
                          className="text-slate-400 hover:text-amber-600 text-xs font-bold underline decoration-slate-300 hover:decoration-amber-500 underline-offset-4 transition-all px-2"
                        >
                          Edit Info
                        </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button 
            onClick={() => handleSecurityCheck('ADD_BRANCH')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-300 rounded-3xl text-slate-400 hover:text-amber-600 hover:border-amber-400 hover:bg-amber-50/50 transition-all group font-bold"
          >
            <div className="w-8 h-8 rounded-full bg-stone-100 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-500 flex items-center justify-center transition-colors">
                <Plus size={18} />
            </div>
            Tambah Cabang Baru
          </button>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h3 className="font-bold text-slate-800 mb-2">Zona Bahaya & Sinkronisasi</h3>
          <p className="text-sm text-slate-500">Hati-hati, tindakan di sini tidak dapat dibatalkan.</p>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
            <div className="flex gap-4">
               <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
               </div>
                <div>
                <p className="font-bold text-red-900">Reset Data Cabang Ini</p>
                <p className="text-xs text-red-700/80 mt-1 max-w-sm">Menghapus SELURUH produk dan transaksi hanya pada cabang <strong>{accounts.find(a => a.id === activeAccountId)?.name}</strong>.</p>
                </div>
            </div>
            <button 
              onClick={() => handleSecurityCheck('RESET_DATA')}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all">
              Reset Data
            </button>
          </div>
          
          <div className="p-4 rounded-2xl bg-amber-50 border border-slate-200 text-center">
             <p className="text-xs text-slate-400">
                System ID: <span className="font-mono text-slate-600">{activeAccountId}</span>
             </p>
          </div>
        </div>
      </div>

      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-amber-100 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-2">
                <Check size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verifikasi Keamanan</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Anda mencoba melakukan tindakan sensitif. <br/>
                Silakan masukkan kata sandi administrator untuk melanjutkan.
              </p>
              
              <div className="w-full space-y-4 mt-4">
                <input 
                  type="password"
                  placeholder="Kata Sandi"
                  className="w-full px-6 py-4 bg-amber-50 border-2 border-amber-100 rounded-2xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-mono text-center tracking-widest"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && verifyPassword()}
                  autoFocus
                />
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setIsSecurityModalOpen(false); setPasswordInput(''); }}
                    className="flex-1 px-6 py-4 bg-stone-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={verifyPassword}
                    className="flex-1 px-6 py-4 bg-amber-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-amber-200 hover:bg-amber-700 active:scale-95 transition-all"
                  >
                    Konfirmasi
                  </button>
                </div>
              </div>
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

export default Settings;
