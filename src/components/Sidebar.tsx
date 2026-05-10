import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Timer, CheckSquare, BarChart2, Trophy, BookOpen, User, LogOut, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, loginWithGoogle, logout, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { UserProfile } from '../types';

type View = 'dashboard' | 'timer' | 'tasks' | 'stats' | 'leaderboard' | 'resources' | 'profile';

export const Sidebar = ({ activeView, onViewChange }: { activeView: View, onViewChange: (view: View) => void }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setProfile(null);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile);
      }
    });
  }, [user]);

  const handleUpgrade = async () => {
    if (!user) {
      await loginWithGoogle();
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isPremium: true
      });
      alert('Congratulations! You are now a Premium user.');
    } catch (error) {
      console.error('Upgrade failed', error);
    }
  };

  const menuItems: { id: View; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timer', label: 'Focus Timer', icon: Timer },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'stats', label: 'Stats', icon: BarChart2 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'resources', label: 'Resources', icon: BookOpen },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="w-64 h-screen bg-bg-deep border-r border-slate-800 flex flex-col p-4 fixed left-0 top-0 z-50">
      <div className="px-2 mb-10">
        <Logo size={42} />
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-800">
        {!profile?.isPremium && (
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-800/40 p-4 rounded-2xl mb-4 border border-indigo-500/20">
            <p className="text-xs font-semibold text-indigo-400 mb-1 uppercase tracking-wider">Go Premium</p>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">Unlock Monk Mode, AI tools & more</p>
            <button 
              onClick={handleUpgrade}
              className="w-full py-2 bg-brand-primary text-white rounded-lg text-sm font-semibold hover:bg-brand-primary/90 transition-colors"
            >
              Upgrade — ₹50/mo
            </button>
          </div>
        )}

        {profile?.isPremium && (
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 rounded-2xl mb-4 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-amber-500" />
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Premium Plan</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">Early access to all new features</p>
          </div>
        )}

        {user ? (
          <div className="flex items-center gap-3 px-2">
            <Avatar state={profile?.avatarState} size={40} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
              <button 
                onClick={logout} 
                className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <LogOut size={10} /> Logout
              </button>
            </div>
            <ChevronRight size={16} className="text-slate-600" />
          </div>
        ) : (
          <button 
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors"
          >
            Sign In with Google
          </button>
        )}
      </div>
    </div>
  );
};
