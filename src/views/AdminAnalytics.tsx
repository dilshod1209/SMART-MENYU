import { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users,
  Award,
  Calendar
} from 'lucide-react';
import { format, subDays, startOfDay, isAfter } from 'date-fns';

const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#F43F5E', '#EAB308'];

export default function AdminAnalytics() {
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), 
      (snap) => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );
    const unsubItems = onSnapshot(collection(db, 'menuItems'), 
      (snap) => setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'menuItems')
    );
    return () => { unsubOrders(); unsubItems(); };
  }, []);

  // Data processing (Pandas-style aggregation)
  const stats = useMemo(() => {
    const itemSales: Record<string, { name: string, count: number, revenue: number }> = {};
    const dailyRevenue: Record<string, number> = {};
    let totalRevenue = 0;
    let totalItems = 0;

    orders.forEach(order => {
      totalRevenue += order.total;
      const date = order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MMM dd') : 'Unknown';
      dailyRevenue[date] = (dailyRevenue[date] || 0) + order.total;

      order.items.forEach((item: any) => {
        totalItems += item.quantity;
        if (!itemSales[item.id]) {
          itemSales[item.id] = { name: item.name, count: 0, revenue: 0 };
        }
        itemSales[item.id].count += item.quantity;
        itemSales[item.id].revenue += item.quantity * item.price;
      });
    });

    const topItems = Object.values(itemSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const revenueHistory = Object.entries(dailyRevenue)
      .map(([date, amount]) => ({ date, amount }))
      .reverse();

    return { totalRevenue, totalItems, totalOrders: orders.length, topItems, revenueHistory };
  }, [orders]);

  return (
    <div className="space-y-8 pb-12">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Umumiy tushum', value: `${stats.totalRevenue} so'm`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
          { label: 'Jami buyurtmalar', value: stats.totalOrders, icon: ShoppingBag, color: 'bg-orange-50 text-orange-600' },
          { label: 'Sotilgan taomlar', value: stats.totalItems, icon: TrendingUp, color: 'bg-blue-50 text-blue-600' },
          { label: 'O\'rtacha chek', value: `${(stats.totalRevenue / (stats.totalOrders || 1)).toFixed(0)} so'm`, icon: Award, color: 'bg-purple-50 text-purple-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Selling Items (Bar Chart) */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black">Eng ko'p sotilgan taomlar</h3>
            <Award className="text-orange-500" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topItems} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip 
                   formatter={(value: any) => [`${value} ta`, 'Sotildi']}
                  cursor={{ fill: '#f8f8f8' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" fill="#F97316" radius={[0, 10, 10, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend (Area Chart) */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black">Tushum dinamikasi</h3>
            <TrendingUp className="text-blue-500" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueHistory}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} />
                <Tooltip 
                  formatter={(value: any) => [`${value} so'm`, 'Daromad']}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Item Performance Table */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
        <h3 className="text-xl font-black">Taomlar samaradorligi</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <th className="pb-4">Taom nomi</th>
                <th className="pb-4">Sotilgan soni</th>
                <th className="pb-4">Daromad</th>
                <th className="pb-4">O'rtacha narx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.topItems.map((item, i) => (
                <tr key={i} className="group">
                  <td className="py-4 font-bold text-gray-700">{item.name}</td>
                  <td className="py-4">
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-black">{item.count}</span>
                  </td>
                  <td className="py-4 font-black text-orange-600">{item.revenue} so'm</td>
                  <td className="py-4 text-sm text-gray-400">{(item.revenue / item.count).toFixed(0)} so'm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
