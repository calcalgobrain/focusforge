import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Gem, Zap, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { UserProfile } from '../types';

export const Leaderboard = () => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('score', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc, index) => ({ 
        ...(doc.data() as UserProfile),
        id: doc.id, 
        leaderboardRank: index + 1
      })) as (UserProfile & { leaderboardRank: number })[];
      setStudents(list);
      
      if (auth.currentUser) {
        const myProfile = list.find(s => s.uid === auth.currentUser?.uid);
        if (myProfile) {
          setCurrentUserProfile(myProfile);
        } else {
          // Fetch current user profile separately if not in top 20
          onSnapshot(doc(db, 'users', auth.currentUser.uid), (snapshot) => {
            if (snapshot.exists()) {
              setCurrentUserProfile({ ...snapshot.data(), leaderboardRank: -1 } as UserProfile & { leaderboardRank: number });
            }
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getRankIcon = (rank: number) => {
    switch(rank) {
      case 1: return <Medal className="text-amber-400" size={20} />;
      case 2: return <Medal className="text-slate-400" size={20} />;
      case 3: return <Medal className="text-amber-700" size={20} />;
      default: return <span className="text-slate-500 font-bold ml-1">#{rank}</span>;
    }
  };

  const getBadgeIcon = (rank: string) => {
    switch(rank) {
      case 'Grandmaster': return <Crown size={16} className="text-amber-500" />;
      case 'Diamond': return <Gem size={16} className="text-sky-400" />;
      case 'Gold': return <Zap size={16} className="text-amber-400" />;
      default: return <Zap size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header>
        <h2 className="text-3xl font-bold text-white mb-1">Leaderboard</h2>
        <p className="text-slate-500 font-medium tracking-wide">Compete with students across India</p>
      </header>

      {/* Your Rank Banner */}
      {currentUserProfile && (
        <div className="bg-bg-card border border-slate-800 p-6 rounded-[32px] flex items-center justify-between shadow-2xl relative overflow-hidden group">
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-700">
              <Medal size={32} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Your Rank</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-white">
                  #{currentUserProfile.leaderboardRank > 0 ? currentUserProfile.leaderboardRank : '20+'}
                </span>
                <span className="text-sm font-bold text-slate-400">Globally</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Zap size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">{currentUserProfile.rank}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-10 relative z-10 mr-4">
            <div className="text-center">
              <p className="text-2xl font-black text-white">{currentUserProfile.totalHours}h</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Ranked Hours</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">{currentUserProfile.totalQuestions}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Questions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-brand-primary">{currentUserProfile.score}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Score</p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
      )}

      <div className="flex gap-3">
        {['All Time', 'This Week', 'This Month'].map((t, i) => (
          <button
            key={t}
            className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              i === 0 ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-slate-800/40 text-slate-500 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-bg-card border border-slate-800 rounded-[32px] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/50">
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rank</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Hours</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Questions</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.uid} className={`hover:bg-slate-800/20 transition-colors group ${student.uid === auth.currentUser?.uid ? 'bg-indigo-500/5' : ''}`}>
                <td className="px-8 py-4">{getRankIcon(student.leaderboardRank)}</td>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={student.photoURL || `https://ui-avatars.com/api/?name=${student.displayName}&background=random&color=fff`} 
                      className="w-8 h-8 rounded-lg shadow-inner"
                      alt={student.displayName}
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-200">{student.displayName} {student.uid === auth.currentUser?.uid && '(You)'}</p>
                      <div className="flex items-center gap-1">
                        {getBadgeIcon(student.rank)}
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{student.rank}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4 text-right tabular-nums text-sm font-bold text-slate-300">{student.totalHours}h</td>
                <td className="px-8 py-4 text-right tabular-nums text-sm font-bold text-slate-300">{student.totalQuestions}</td>
                <td className="px-8 py-4 text-right flex flex-col items-end">
                  <span className="text-sm font-black text-indigo-400 tabular-nums">{student.score}</span>
                  <div className={`flex items-center gap-0.5 text-[10px] font-black text-emerald-500`}>
                    <TrendingUp size={10} />
                    +0
                  </div>
                </td>
              </tr>
            ))}
            {currentUserProfile && !students.find(s => s.uid === auth.currentUser?.uid) && (
              <tr className="bg-slate-800/30">
                <td className="px-8 py-4"><span className="text-slate-400 font-bold ml-1">#20+</span></td>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-primary/20 rounded-lg flex items-center justify-center text-brand-primary">
                      {currentUserProfile.photoURL ? <img src={currentUserProfile.photoURL} alt="pro" className="w-full h-full rounded-lg" /> : <Gem size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-indigo-400">{currentUserProfile.displayName} (You)</p>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{currentUserProfile.rank}</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4 text-right tabular-nums text-sm font-bold text-slate-300">{currentUserProfile.totalHours}h</td>
                <td className="px-8 py-4 text-right tabular-nums text-sm font-bold text-slate-300">{currentUserProfile.totalQuestions}</td>
                <td className="px-8 py-4 text-right font-black text-indigo-400 tabular-nums text-sm">{currentUserProfile.score}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-900/50 p-4 rounded-2xl flex justify-center items-center gap-4 border border-slate-800">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
          <span className="text-indigo-400">Productivity Score = </span> (Ranked Hours × 0.6) + (Questions × 0.4) — Only Monk Mode, Deep Work & 52/17 sessions count as ranked.
        </p>
      </div>
    </div>
  );
};
