/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  Settings, 
  BarChart3, 
  UtensilsCrossed, 
  Bell, 
  ChefHat, 
  LogOut, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  XCircle,
  Menu as MenuIcon,
  ChevronRight,
  ShoppingCart,
  User
} from 'lucide-react';
import { auth, signInWithGoogle, db } from './firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Views
import AdminDashboard from './views/AdminDashboard';
import CustomerMenu from './views/CustomerMenu';
import AdminAnalytics from './views/AdminAnalytics';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'customer' | 'admin' | 'analytics' | 'login'>('customer');
  const [tableId, setTableId] = useState<string | null>(null);

  // Login & Registration state
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginForm, setLoginForm] = useState({ phone: '', name: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    // Check local storage for existing session
    const session = localStorage.getItem('adminSession');
    if (session === 'true') {
      setIsAdminAuth(true);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const table = urlParams.get('table');
    if (table) {
      setTableId(table);
      setView('customer');
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch role
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
            if (userDoc.data().role === 'admin' && !table) {
              setView('admin');
            }
          } else if (user.email === 'dilshodallaberdiyev57@gmail.com') {
             setUserRole('admin');
             if (!table) setView('admin');
          }
        } catch (e) {
          console.error("Error fetching role:", e);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Super admin bypass
    if (!isRegistering && loginForm.phone === 'admin' && loginForm.password === 'admin') {
      setIsAdminAuth(true);
      localStorage.setItem('adminSession', 'true');
      setView('admin');
      return;
    }

    try {
      if (isRegistering) {
        // Register logic
        if (!loginForm.name || !loginForm.phone || !loginForm.password) {
          setError('Hamma maydonlarni to\'ldiring!');
          return;
        }

        if (loginForm.password.length < 6) {
          setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak!');
          return;
        }

        const fakeEmail = `${loginForm.phone}@smartmenu.local`;
        const userCred = await createUserWithEmailAndPassword(auth, fakeEmail, loginForm.password);
        
        await setDoc(doc(db, 'users', userCred.user.uid), {
          name: loginForm.name,
          phone: loginForm.phone,
          role: 'admin',
          createdAt: serverTimestamp()
        });

        setView('admin');
      } else {
        // Login logic
        const fakeEmail = `${loginForm.phone}@smartmenu.local`;
        await signInWithEmailAndPassword(auth, fakeEmail, loginForm.password);
        setView('admin');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Bu raqam orqali allaqachon ro\'yxatdan o\'tilgan!');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Telefon raqam yoki parol noto\'g\'ri!');
      } else {
        setError('Xatolik yuz berdi: ' + err.message);
      }
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setIsAdminAuth(false);
    localStorage.removeItem('adminSession');
    setView('customer');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-b-2 border-orange-500"
        />
      </div>
    );
  }

  const isFullAdmin = isAdminAuth || userRole === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Navigation (Sticky Header) */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(tableId ? 'customer' : 'admin')}>
            <div className="bg-orange-500 p-2 rounded-xl text-white">
              <UtensilsCrossed size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Smart<span className="text-orange-500">Menu</span></h1>
          </div>

          <div className="flex items-center gap-4">
            {isFullAdmin ? (
              <>
                <div className="hidden md:flex gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setView('admin')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${view === 'admin' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <ChefHat size={16} /> <span className="text-sm font-medium">Oshxona</span>
                  </button>
                  <button
                    onClick={() => setView('analytics')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${view === 'analytics' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <BarChart3 size={16} /> <span className="text-sm font-medium">Statistika</span>
                  </button>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : view !== 'login' && (
              <button
                onClick={() => setView('login')}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <User size={16} /> <span>Admin Kirish</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {view === 'customer' && (
            <motion.div
              key="customer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CustomerMenu tableId={tableId} />
            </motion.div>
          )}

          {view === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto mt-12"
            >
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                <div className="text-center mb-8">
                  <div className="bg-orange-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-orange-600">
                    <Settings size={32} />
                  </div>
                  <h2 className="text-2xl font-black">{isRegistering ? 'Ro\'yxatdan o\'tish' : 'Boshqaruv paneli'}</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {isRegistering ? 'Yangi hisob yaratish' : 'Kirish uchun hisob ma\'lumotlarini kiriting'}
                  </p>
                </div>

                <form onSubmit={handleAuthAction} className="space-y-4">
                  {isRegistering && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Ism</label>
                      <input
                        type="text"
                        required
                        value={loginForm.name}
                        onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                        placeholder="Ismingizni kiriting"
                        className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Telefon raqam</label>
                    <input
                      type="text"
                      required
                      value={loginForm.phone}
                      onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
                      placeholder="998901234567"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Parol</label>
                    <input
                      type="password"
                      required
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs font-bold text-center">
                      {error}
                    </motion.p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-500 transition-all shadow-lg active:scale-[0.98]"
                  >
                    {isRegistering ? 'Ro\'yxatdan o\'tish' : 'Tizimga kirish'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                   <button 
                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                    className="text-sm font-bold text-orange-500 hover:underline"
                   >
                     {isRegistering ? 'Akkauntingiz bormi? Kirish' : 'Hisobingiz yo\'qmi? Ro\'yxatdan o\'tish'}
                   </button>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-50">
                  <button 
                    onClick={signInWithGoogle}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all text-sm font-bold text-gray-600"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                    Google orqali kirish
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'admin' && isFullAdmin && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminDashboard />
            </motion.div>
          )}

          {view === 'analytics' && isFullAdmin && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminAnalytics />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer (Simplified) */}
      <footer className="mt-auto py-8 text-center text-gray-400 text-xs border-t border-gray-100">
        &copy; 2026 SmartMenu QR Tizimi. Google AI Studio bilan yaratilgan.
      </footer>
    </div>
  );
}

