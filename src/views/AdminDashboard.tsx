import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  QrCode as QrIcon, 
  Clock, 
  CheckCircle2, 
  Bell, 
  ChefHat, 
  Utensils,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'react-qr-code';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'tables' | 'calls'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);

  // Form states
  const [newTableName, setNewTableName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newItem, setNewItem] = useState({ name: '', description: '', price: 0, categoryId: '' });

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), 
      (snap) => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const unsubCats = onSnapshot(query(collection(db, 'categories'), orderBy('order', 'asc')), 
      (snap) => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
    );

    const unsubItems = onSnapshot(collection(db, 'menuItems'), 
      (snap) => setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'menuItems')
    );

    const unsubTables = onSnapshot(collection(db, 'tables'), 
      (snap) => setTables(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'tables')
    );

    const unsubCalls = onSnapshot(query(collection(db, 'waiterCalls'), orderBy('createdAt', 'desc')), 
      (snap) => setCalls(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'waiterCalls')
    );

    return () => {
      unsubOrders();
      unsubCats();
      unsubItems();
      unsubTables();
      unsubCalls();
    };
  }, []);

  const addTable = async () => {
    if (!newTableName) return;
    try {
      await addDoc(collection(db, 'tables'), {
        number: newTableName,
        status: 'available',
        createdAt: Timestamp.now()
      });
      setNewTableName('');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'tables'); }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'orders'); }
  };

  const addCategory = async () => {
    if (!newCatName) return;
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCatName,
        order: categories.length + 1
      });
      setNewCatName('');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'categories'); }
  };

  const addMenuItem = async () => {
    if (!newItem.name || !newItem.categoryId) return;
    try {
      await addDoc(collection(db, 'menuItems'), {
        ...newItem,
        isAvailable: true,
        salesCount: 0,
        createdAt: Timestamp.now()
      });
      setNewItem({ name: '', description: '', price: 0, categoryId: newItem.categoryId });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'menuItems'); }
  };

  const resolveCall = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'waiterCalls', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'waiterCalls'); }
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Tabs */}
      <div className="flex flex-wrap gap-4 border-b border-gray-200 pb-1">
        {[
          { id: 'orders', icon: ChefHat, label: 'Oshxona va Buyurtmalar', count: orders.filter(o => o.status === 'pending' || o.status === 'preparing').length },
          { id: 'calls', icon: Bell, label: 'Chaqiruvlar', count: calls.length },
          { id: 'menu', icon: Utensils, label: 'Menyu Boshqaruvi' },
          { id: 'tables', icon: QrIcon, label: 'Stollar va QR' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-all ${activeTab === tab.id ? 'border-orange-500 text-orange-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ring-2 ring-white">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.length === 0 && <div className="col-span-full py-12 text-center text-gray-400">Faol buyurtmalar yo'q</div>}
              {orders.map(order => (
                <div key={order.id} className={`bg-white rounded-2xl shadow-sm border p-5 space-y-4 ${order.status === 'pending' ? 'border-orange-200' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{tables.find(t => t.id === order.tableId)?.number || '??'}-Stol</h3>
                      <p className="text-xs text-gray-400">{order.createdAt?.toDate().toLocaleTimeString()}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {order.status === 'pending' ? 'Kutilmoqda' : order.status === 'preparing' ? 'Tayyorlanmoqda' : 'Yetkazildi'}
                    </span>
                  </div>
                  <ul className="space-y-2 border-y border-gray-50 py-3">
                    {order.items.map((item: any, idx: number) => (
                      <li key={idx} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="text-gray-400">{item.price * item.quantity} so'm</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between items-center bg-gray-50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                    <span className="font-bold text-orange-600">{order.total} so'm</span>
                    <div className="flex gap-2">
                       {order.status === 'pending' && (
                         <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-bold">
                           Boshlash
                         </button>
                       )}
                       {order.status === 'preparing' && (
                         <button onClick={() => updateOrderStatus(order.id, 'served')} className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700">
                           <CheckCircle2 size={18} />
                         </button>
                       )}
                       <button onClick={async () => { if(confirm('Buyurtmani o\'chirib tashlaysizmi?')) await deleteDoc(doc(db, 'orders', order.id)) }} className="text-red-400 p-2">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'calls' && (
            <motion.div key="calls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {calls.length === 0 && <div className="py-12 text-center text-gray-400">Hozircha ofitsiant chaqiruvlari yo'q</div>}
              {calls.map(call => (
                <div key={call.id} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-100 p-3 rounded-full text-orange-600">
                      <Bell size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{tables.find(t => t.id === call.tableId)?.number || '??'}-Stolga yordam kerak</h3>
                      <p className="text-sm text-gray-500">So'rov vaqti: {call.createdAt?.toDate().toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => resolveCall(call.id)}
                    className="bg-orange-500 text-white px-6 py-2 rounded-xl font-medium hover:bg-orange-600 transition-colors"
                  >
                    Javob berish
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Categories */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Kategoriyalar</h3>
                <div className="flex gap-2">
                  <input 
                    value={newCatName} 
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Yangi kategoriya..." 
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button onClick={addCategory} className="bg-gray-900 text-white p-2 rounded-lg">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat.id} className="bg-white p-3 rounded-xl border flex justify-between items-center group">
                      <span className="font-medium">{cat.name}</span>
                      <button onClick={() => deleteDoc(doc(db, 'categories', cat.id))} className="text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Menu Items */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="font-bold text-lg">Menyu Taomlari</h3>
                <div className="bg-white p-4 rounded-2xl border space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Taom nomi" 
                      value={newItem.name} 
                      onChange={e => setNewItem({...newItem, name: e.target.value})}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <input 
                      type="number" 
                      placeholder="Narxi" 
                      value={newItem.price || ''} 
                      onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value)})}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <select 
                      value={newItem.categoryId} 
                      onChange={e => setNewItem({...newItem, categoryId: e.target.value})}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">Kategoriyani tanlang</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <button onClick={addMenuItem} className="bg-orange-500 text-white py-2 rounded-lg font-bold">Qo'shish</button>
                  </div>
                </div>

                <div className="space-y-2">
                  {menuItems.map(item => (
                    <div key={item.id} className="bg-white p-3 rounded-xl border flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                          <ChefHat size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{item.name}</p>
                          <p className="text-xs text-gray-400">{categories.find(c => c.id === item.categoryId)?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-orange-600">{item.price} so'm</span>
                        <button onClick={() => deleteDoc(doc(db, 'menuItems', item.id))} className="text-red-400">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tables' && (
            <motion.div key="tables" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex gap-4 items-center">
                <input 
                  value={newTableName} 
                  onChange={e => setNewTableName(e.target.value)}
                  placeholder="Stol raqami (masalan: 5)" 
                  className="px-4 py-2 border rounded-xl w-64"
                />
                <button onClick={addTable} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-medium">
                  Stol qo'shish
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {tables.map(table => {
                  const tableUrl = `${window.location.origin}/?table=${table.id}`;
                  return (
                    <div key={table.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center gap-4 group">
                      <div className="relative bg-white p-4 rounded-2xl shadow-inner border border-gray-50 transition-transform group-hover:scale-105">
                        <QRCode
                          size={150}
                          value={tableUrl}
                          viewBox={`0 0 150 150`}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        />
                      </div>
                      <div className="text-center">
                        <h4 className="font-bold text-xl leading-none">{table.number}-Stol</h4>
                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">{table.status === 'available' ? 'Bo\'sh' : table.status}</p>
                      </div>
                      <div className="flex gap-2 w-full">
                        <button 
                          onClick={() => {
                            window.open(tableUrl, '_blank');
                          }}
                          className="flex-1 bg-gray-50 text-gray-600 p-2 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
                        >
                          Menyuni ko'rish
                        </button>
                        <button 
                          onClick={() => deleteDoc(doc(db, 'tables', table.id))}
                          className="p-2 text-red-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
