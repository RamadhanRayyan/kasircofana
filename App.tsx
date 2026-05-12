
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import KasirLayout from './layouts/KasirLayout';
import { Product, Transaction, CooperativeAccount, UserRole } from './types';

import { supabase } from './lib/supabaseClient';

const RequireAuth = ({ children, onAuthFetch }: { children: React.ReactElement, onAuthFetch: (role: UserRole, branchId?: string) => void }) => {
  const [session, setSession] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(!!session);
      if (session?.user) {
        const role = session.user.user_metadata?.role as UserRole || UserRole.SUPER_ADMIN; 
        const branchId = session.user.user_metadata?.branch_id;
        onAuthFetch(role, branchId);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(!!session);
      if (session?.user) {
        const role = session.user.user_metadata?.role as UserRole || UserRole.SUPER_ADMIN;
        const branchId = session.user.user_metadata?.branch_id;
        onAuthFetch(role, branchId);
      }
    });

    return () => subscription.unsubscribe();
  }, [onAuthFetch]);

  if (session === null) {
    return <div className="h-screen w-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<CooperativeAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.SUPER_ADMIN);
  const [metadataBranchId, setMetadataBranchId] = useState<string | undefined>();
  const [session, setSession] = useState<any>(null);

  // Handle Auth Changes at Top Level
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const role = session.user.user_metadata?.role as UserRole || UserRole.SUPER_ADMIN;
        const branchId = session.user.user_metadata?.branch_id;
        setUserRole(role);
        setMetadataBranchId(branchId);
      } else {
        setUserRole(UserRole.SUPER_ADMIN);
        setMetadataBranchId(undefined);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthFetch = React.useCallback((role: UserRole, branchId?: string) => {
    // This is now handled by the top-level listener, but we keep it for RequireAuth compatibility
    setUserRole(role);
    setMetadataBranchId(branchId);
  }, []);

  // 1. Fetch Accounts (Branches) on Mount or Session Change
  useEffect(() => {
    let isActive = true;

    const fetchAccounts = async () => {
      const { data, error } = await supabase.from('accounts').select('*').order('created_at', { ascending: true });

      if (!isActive) return;
      
      if (data && data.length > 0) {
        setAccounts(data);
        
        // Priority: Metadata (only for kasir) > Local Storage > First item
        if (userRole === UserRole.KASIR && metadataBranchId && data.find(a => a.id === metadataBranchId)) {
            setActiveAccountId(metadataBranchId);
        } else {
            const savedId = sessionStorage.getItem('toko_amanah_active_account_id');
            const foundSaved = savedId ? data.find(a => a.id === savedId) : null;
            
            if (foundSaved) {
                setActiveAccountId(foundSaved.id);
            } else {
                setActiveAccountId(data[0].id);
            }
        }
      } else if (!error) {
        // Init default account logic if table empty
        const defaultAccount = { name: 'Cofana Shop', address: 'Pusat', phone: '-' };
        const { data: newData } = await supabase.from('accounts').insert([defaultAccount]).select().single();
        if (newData) {
            setAccounts([newData]);
            setActiveAccountId(newData.id);
        }
      }
      setIsLoading(false);
    };
    
    // Use a short timeout to ensure Auth session is fully set in client headers
    const timer = setTimeout(fetchAccounts, 150);

    const channel = supabase
      .channel('accounts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        () => fetchAccounts()
      )
      .subscribe();

    return () => {
      isActive = false;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, userRole]); // Trigger on user change or role change

  // 1b. Reactive Branch Selection - ONLY FOR KASIR
  // Super Admin should not be forced so they can switch branches freely
  useEffect(() => {
    if (userRole === UserRole.KASIR && metadataBranchId && accounts.length > 0) {
      const targetAccount = accounts.find(a => a.id === metadataBranchId);
      if (targetAccount) {
        setActiveAccountId(metadataBranchId);
      }
    }
  }, [metadataBranchId, accounts, userRole]);

  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Persist Active Account Change
  useEffect(() => {
    if (activeAccountId) {
        sessionStorage.setItem('toko_amanah_active_account_id', activeAccountId);
    }
  }, [activeAccountId]);

  // 2. Fetch Products filtered by Active Branch
  useEffect(() => {
    if (!activeAccountId) return;
    
    let isActive = true;

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('branch_id', activeAccountId);
      
      if (error) {
        console.error('Error fetching products:', error);
      } else if (data && isActive) {
        const mappedProducts: Product[] = data.map((p: any) => ({
          ...p,
          branch_id: p.branch_id,
          sku: p.sku,
          minStock: p.min_stock,
          variants: p.variants || []
        }));
        setProducts(mappedProducts);
      }
    };
    
    fetchProducts();
    
    // Subscribe to changes for this SPECIFIC branch with unique channel
    const channel = supabase
      .channel(`products_realtime_${activeAccountId}`)
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'products'
        }, 
        (payload) => {
          if (isActive) {
            console.log('Product change received:', payload);
            // Branch filtering for INSERT/UPDATE
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const p = payload.new as any;
              if (p.branch_id === activeAccountId) {
                 const mappedP: Product = {
                  ...p,
                  sku: p.sku,
                  minStock: p.min_stock,
                  variants: p.variants || []
                };
                setProducts(current => {
                  const exists = current.find(item => item.id === mappedP.id);
                  if (exists) {
                    return current.map(item => item.id === mappedP.id ? mappedP : item);
                  } else {
                    return [...current, mappedP];
                  }
                });
              }
            } else if (payload.eventType === 'DELETE') {
               // For DELETE, payload.old only contains ID usually, so we can't check branch_id.
               // It's safe to try deleting from local state by ID.
               const oldId = payload.old.id;
               setProducts(current => current.filter(item => item.id !== oldId));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Product subscription status for ${activeAccountId}:`, status);
      });
    
    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    }
  }, [activeAccountId]);


  // 3. Fetch Transactions filtered by Active Branch
  useEffect(() => {
     if (!activeAccountId) return;

     let isActive = true;

     const fetchTransactions = async () => {
      if (!isActive) return;

      const { data, error } = await supabase
         .from('transactions')
        .select(`
          *,
          items:transaction_items!inner(
            *,
            product:products(name, category, min_stock, stock)
          )
        `)
        .eq('branch_id', activeAccountId)
        .order('date', { ascending: false });

      if (!isActive) return;

      if (error) {
        console.error('Error fetching transactions:', error);
      } else if (data) {
        const mappedTransactions: Transaction[] = data.map((t: any) => ({
          id: t.id,
          branch_id: t.branch_id, // include branch_id
          date: t.date,
          total: t.total,
          paymentMethod: t.payment_method,
          items: t.items.map((i: any) => ({
             id: i.product_id,
             quantity: i.quantity,
             price: i.price_at_sale,
             cost: i.cost_at_sale,
             name: i.product?.name || 'Unknown Product',
             category: i.product?.category || 'Uncategorized',
             stock: i.product?.stock || 0,
             minStock: i.product?.min_stock || 0,
             selectedVariants: i.selected_variants || []
          }))
        }));
        
        setTransactions(mappedTransactions);
      }
    };
    
    fetchTransactions();

    // Subscribe to transactions for this branch
    const channel = supabase
      .channel(`transactions_realtime_${activeAccountId}`)
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'transactions'
        }, 
        (payload) => {
          if (isActive) {
            console.log('Transaction change received:', payload);
            const t = payload.new as any || payload.old as any;
            if (t && (!t.branch_id || t.branch_id === activeAccountId)) {
              fetchTransactions();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Transaction subscription status for ${activeAccountId}:`, status);
      });

    return () => {
        isActive = false;
        supabase.removeChannel(channel);
    }
  }, [activeAccountId]);

  const addTransaction = async (transaction: Transaction) => {
    if (!activeAccountId) return;

    // 1. Insert Transaction with branch_id
    const { data: transData, error: transError } = await supabase
      .from('transactions')
      .insert([{
        branch_id: activeAccountId, // Tag with Branch
        total: transaction.total,
        payment_method: transaction.paymentMethod,
        date: transaction.date,
        profile_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (transError || !transData) {
      throw new Error(transError?.message || 'Transaction failed');
    }

    // 2. Insert Items
    const itemsToInsert = transaction.items.map(item => ({
      transaction_id: transData.id,
      product_id: item.id,
      quantity: item.quantity,
      price_at_sale: item.price,
      cost_at_sale: item.cost,
      selected_variants: item.selectedVariants || []
    }));

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Failed to save items', itemsError);
    }

    // 3. Update Stock (One by one)
    // 3. Update Stock (Grouped by Product ID to prevent overwrite)
    const stockUpdates: Record<string, number> = {};
    transaction.items.forEach(item => {
        stockUpdates[item.id] = (stockUpdates[item.id] || 0) + item.quantity;
    });

    for (const [productId, quantityToDeduct] of Object.entries(stockUpdates)) {
      const currentProduct = products.find(p => p.id === productId);
      if (currentProduct) {
        const newStock = currentProduct.stock - quantityToDeduct;
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', productId);
      }
    }
    
    // 4. Optimistic Update (Transactions only - safe from race conditions as it's an append)
    // 4. Optimistic Update with Deduping
    // Remove any potential partial record from Realtime (same ID) before appending full record
    setTransactions(prev => {
        const filtered = prev.filter(t => t.id !== transData.id);
        return [{
          ...transaction,
          id: transData.id,
          date: transData.date
        }, ...filtered];
    });
    
    // We REMOVED optimistic setProducts here to prevent over-subtraction bugs.
    // The Realtime listener above will handle stock updates automatically 
    // and more accurately as they happen in Supabase.
  };

  const activeAccount = useMemo(() => {
    return accounts.find(a => a.id === activeAccountId) || accounts[0] || { name: '', address: '', phone: '', id: '' };
  }, [accounts, activeAccountId]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-amber-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Memuat aplikasi...</p>
      </div>
    </div>;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={
          <RequireAuth onAuthFetch={handleAuthFetch}>
            {userRole === UserRole.SUPER_ADMIN ? (
              <MainLayout 
                activeAccount={activeAccount} 
                lowStockProducts={lowStockProducts}
                accounts={accounts}
                activeAccountId={activeAccountId}
                setActiveAccountId={setActiveAccountId}
              />
            ) : (
              <KasirLayout 
                activeAccount={activeAccount} 
                lowStockProducts={lowStockProducts}
              />
            )}
          </RequireAuth>
        }>
          <Route path="/" element={userRole === UserRole.SUPER_ADMIN ? <Dashboard products={products} transactions={transactions} lowStock={lowStockProducts} accounts={accounts} activeAccountId={activeAccountId} setActiveAccountId={setActiveAccountId} /> : <Navigate to="/pos" replace />} />
          <Route path="/pos" element={<POS products={products} onCompleteTransaction={addTransaction} activeAccount={activeAccount} />} />
          <Route path="/inventory" element={<Inventory products={products} setProducts={setProducts} activeAccountId={activeAccountId} activeAccountName={activeAccount.name} />} />
          <Route path="/reports" element={userRole === UserRole.SUPER_ADMIN ? <Reports transactions={transactions} products={products} /> : <Navigate to="/pos" replace />} />
          <Route path="/history" element={<HistoryPage transactions={transactions} />} />
          <Route path="/settings" element={userRole === UserRole.SUPER_ADMIN ? <SettingsPage accounts={accounts} activeAccountId={activeAccountId} setActiveAccountId={setActiveAccountId} setAccounts={setAccounts} /> : <Navigate to="/pos" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
