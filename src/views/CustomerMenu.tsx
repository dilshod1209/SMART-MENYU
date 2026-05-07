import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  getDoc,
  query, 
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { 
  ShoppingCart, 
  Bell, 
  Plus, 
  Minus, 
  X, 
  CheckCircle2, 
  Clock, 
  UtensilsCrossed,
  ChefHat
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CustomerMenu({ tableId }: { tableId: string | null }) {
  const [tableData, setTableData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [orderStatus, setOrderStatus] = useState<any[]>([]);
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    if (!tableId) return;

    // Get Table info
    getDoc(doc(db, 'tables', tableId)).then(snap => {
      if (snap.exists()) setTableData(snap.data());
    });

    // Listen to Categories
    const unsubCats = onSnapshot(query(collection(db, 'categories'), orderBy('order', 'asc')), 
      (snap) => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
    );

    // Listen to Menu Items
    const unsubItems = onSnapshot(collection(db, 'menuItems'), 
      (snap) => setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'menuItems')
    );

    // Listen to current table orders
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), where('tableId', '==', tableId), orderBy('createdAt', 'desc')), 
      (snap) => setOrderStatus(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    return () => {
      unsubCats();
      unsubItems();
      unsubOrders();
    };
  }, [tableId]);

  if (!tableId) {
    return (
      <div className="text-center py-20 px-6">
        <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600">
          <QrIcon size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Stol aniqlanmadi</h2>
        <p className="text-gray-500">Iltimos, menyuga kirish va buyurtma berish uchun stolingizdagi QR kodni skanerlang.</p>
      </div>
    );
  }

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    
    try {
      await addDoc(collection(db, 'orders'), {
        tableId,
        items: cart,
        total,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      setCart([]);
      setShowCart(false);
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'orders'); }
  };

  const callWaiter = async () => {
    setIsCalling(true);
    try {
      await addDoc(collection(db, 'waiterCalls'), {
        tableId,
        status: 'active',
        createdAt: Timestamp.now()
      });
      setTimeout(() => setIsCalling(false), 3000);
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'waiterCalls'); }
  };

  const filteredItems = selectedCat === 'all' 
    ? menuItems 
    : menuItems.filter(i => i.categoryId === selectedCat);

  return (
    <div className="space-y-6 pb-24">
      {/* Table Header */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange-500 font-bold">Xush kelibsiz</p>
          <h2 className="text-3xl font-black">{tableData?.number || '...'}-Stol</h2>
        </div>
        <button 
          onClick={callWaiter}
          disabled={isCalling}
          className={`flex flex-col items-center gap-1 transition-all ${isCalling ? 'text-orange-500 scale-110' : 'text-gray-400'}`}
        >
          <div className={`p-4 rounded-full ${isCalling ? 'bg-orange-100' : 'bg-gray-100'}`}>
            <Bell size={24} className={isCalling ? 'animate-bounce' : ''} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Chaqirish</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setSelectedCat('all')}
          className={`px-6 py-2.5 rounded-full whitespace-nowrap font-bold text-sm transition-all ${selectedCat === 'all' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-500 border border-gray-100'}`}
        >
          Barcha taomlar
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`px-6 py-2.5 rounded-full whitespace-nowrap font-bold text-sm transition-all ${selectedCat === cat.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredItems.map(item => (
          <motion.div 
            key={item.id}
            layout
            className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex gap-4 items-center group"
          >
            <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-300">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <UtensilsCrossed size={32} />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg leading-tight">{item.name}</h4>
              <p className="text-xs text-gray-400 line-clamp-1 mt-1">{item.description || 'Siz uchun maxsus tayyorlangan.'}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="font-black text-orange-600 text-lg">{item.price} so'm</span>
                <button 
                  onClick={() => addToCart(item)}
                  className="bg-gray-900 text-white p-2 rounded-xl group-hover:bg-orange-500 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Active Orders Section */}
      {orderStatus.length > 0 && (
        <div className="space-y-4 pt-8">
          <h3 className="text-xl font-black flex items-center gap-2">
            <ChefHat className="text-orange-500" /> Sizning buyurtmalaringiz
          </h3>
          <div className="space-y-3">
            {orderStatus.map(order => (
              <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {order.status === 'pending' ? 'Kutilmoqda' : order.status === 'preparing' ? 'Tayyorlanmoqda' : 'Yetkazildi'}
                  </p>
                  <p className="font-bold">{order.items.length} taom • {order.total} so'm</p>
                </div>
                {order.status === 'pending' || order.status === 'preparing' ? (
                  <div className="text-blue-500 animate-pulse flex items-center gap-2">
                    <Clock size={20} />
                    <span className="text-sm font-bold">Tayyorlanmoqda...</span>
                  </div>
                ) : (
                  <div className="text-green-500 flex items-center gap-2">
                    <CheckCircle2 size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-4 right-4 z-50"
          >
            <button 
              onClick={() => setShowCart(true)}
              className="bg-orange-500 text-white w-full py-4 rounded-3xl shadow-2xl shadow-orange-300 flex items-center justify-between px-8 font-black text-lg transition-transform active:scale-95"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart size={24} />
                <span>Savatni ko'rish ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
              </div>
              <span>{cart.reduce((s, i) => s + (i.price * i.quantity), 0)} so'm</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black">Sizning buyurtmangiz</h3>
                <button onClick={() => setShowCart(false)} className="p-2 bg-gray-100 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-lg">{item.name}</p>
                      <p className="text-orange-500 font-bold">{item.price} so'm</p>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 bg-white shadow-sm rounded-lg text-gray-500">
                        <Minus size={16} />
                      </button>
                      <span className="font-black w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 bg-white shadow-sm rounded-lg text-gray-900">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold uppercase tracking-widest">Umumiy summa</span>
                  <span className="text-3xl font-black text-gray-900">{cart.reduce((s, i) => s + (i.price * i.quantity), 0)} so'm</span>
                </div>
                <button 
                  onClick={placeOrder}
                  className="w-full bg-gray-900 text-white py-5 rounded-3xl font-black text-xl hover:bg-orange-500 transition-colors shadow-xl"
                >
                  Hozir buyurtma berish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QrIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  );
}
