import React, { useEffect, useState } from 'react';
import { User, Mail, Zap, Trophy, Target, Award, Calendar, ChevronRight, Plus, Rocket, Book, Star, Shield, Layout, Ghost, Loader2, Trash2 } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, onSnapshot, collection, addDoc, query, orderBy, deleteDoc, Timestamp } from 'firebase/firestore';
import { UserProfile, ExamGoal } from '../types';
import { differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<ExamGoal[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userUnsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
      setLoading(false);
    });

    const goalsUnsub = onSnapshot(
      query(collection(db, 'users', auth.currentUser.uid, 'examGoals'), orderBy('targetDate', 'asc')),
      (snapshot) => {
        setGoals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ExamGoal[]);
      }
    );

    const sessionsUnsub = onSnapshot(
      collection(db, 'users', auth.currentUser.uid, 'sessions'),
      (snapshot) => {
        setSessions(snapshot.docs.map(d => d.data()));
      }
    );

    return () => {
      userUnsub();
      goalsUnsub();
      sessionsUnsub();
    };
  }, []);

  const handleAddGoal = async () => {
    if (!auth.currentUser) return;
    const title = prompt('Enter exam title (e.g., JEE Mains 2026):');
    if (!title) return;
    const dateStr = prompt('Enter target date (YYYY-MM-DD):');
    if (!dateStr) return;
    const description = prompt('Enter target/description (e.g., 99 percentile):');

    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'examGoals'), {
        userId: auth.currentUser.uid,
        title,
        targetDate: Timestamp.fromDate(new Date(dateStr)),
        description: description || '',
        subjects: ['Mathematics', 'Physics', 'Chemistry']
      });
    } catch (error) {
      console.error('Failed to add goal', error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!auth.currentUser || !confirm('Are you sure you want to delete this goal?')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'examGoals', id));
    } catch (error) {
      console.error('Failed to delete goal', error);
    }
  };

  const exportStats = () => {
    if (!profile || sessions.length === 0) return;
    
    const headers = ['Date', 'Subject', 'Mode', 'Duration (min)', 'Status'];
    const csvContent = [
      headers.join(','),
      ...sessions.map(s => [
        s.startTime?.toDate().toLocaleDateString() || 'N/A',
        s.subject || 'General',
        s.mode || 'Focus',
        Math.round((s.durationSec || 0) / 60),
        s.completed ? 'Completed' : 'Discarded'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `study_stats_${profile.displayName.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 gap-4">
      <Loader2 className="animate-spin" size={40} />
      <p className="font-bold">Loading profile...</p>
    </div>
  );

  if (!profile) return (
    <div className="text-center py-20 font-bold text-slate-500 italic">
      Please sign in to view your profile
    </div>
  );

  const achievements = [
    { title: 'First Steps', desc: 'Complete your first session', unlocked: (profile?.totalSessions || 0) > 0, icon: FlameIcon, color: 'text-orange-500 bg-orange-500/10' },
    { title: 'Century', desc: '100 questions in total', unlocked: (profile?.totalQuestions || 0) >= 100, icon: Book, color: 'text-sky-500 bg-sky-500/10' },
    { title: 'Week Warrior', desc: '7-day streak', unlocked: (profile?.streak || 0) >= 7, icon: Layout, color: 'text-indigo-500 bg-indigo-500/10' },
    { title: 'Iron Streak', desc: '30-day streak', unlocked: (profile?.streak || 0) >= 30, icon: Shield, color: 'text-emerald-500 bg-emerald-500/10' },
    { title: 'Dedicated', desc: '10 total hours studied', unlocked: (profile?.totalHours || 0) >= 10, icon: Star, color: 'text-amber-500 bg-amber-500/10' },
    { title: 'Grinder', desc: '50 total hours studied', unlocked: (profile?.totalHours || 0) >= 50, icon: Award, color: 'text-brand-primary bg-brand-primary/10' },
    { title: 'Scholar', desc: '100 total hours studied', unlocked: (profile?.totalHours || 0) >= 100, icon: Target, color: 'text-rose-500 bg-rose-500/10' },
    { title: 'Monk Mastery', desc: 'Complete a Monk Mode session', unlocked: sessions.some(s => s.type === 'Monk Mode'), icon: Ghost, color: 'text-indigo-400 bg-indigo-900/20' },
  ];

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <header className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white mb-1">Profile</h2>
        <button 
          onClick={exportStats}
          className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-bold text-xs hover:bg-slate-700 transition-colors uppercase tracking-widest"
        >
          Export Stats
        </button>
      </header>

      {/* User Info Card */}
      <div className="bg-bg-card border border-slate-800 p-8 rounded-[40px] flex items-center justify-between shadow-2xl relative overflow-hidden group">
        <div className="flex items-center gap-10 relative z-10">
          <div className="relative">
            <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-indigo-800 rounded-3xl flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-indigo-500/30 overflow-hidden">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                profile.displayName.charAt(0)
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-slate-700 p-2 rounded-xl text-slate-300">
              <Award size={20} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-3xl font-black text-white">{profile.displayName}</h3>
              {profile.isPremium && <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-amber-500/20">PRO</span>}
            </div>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <Mail size={16} /> {profile.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Zap size={14} className="text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-widest text-indigo-400">{profile.rank}</span>
            </div>
          </div>
        </div>

        <div className="w-80 h-full flex flex-col justify-center gap-4 relative z-10 pr-4">
          <div className="flex justify-between items-end">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Score Progress</p>
            <p className="text-sm font-black text-white text-right">{profile.score} / {Math.ceil((profile.score + 100) / 100) * 100}</p>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 font-bold">
            <div 
              className="h-full bg-brand-secondary shadow-[0_0_12px_rgba(14,165,233,0.5)] transition-all duration-1000" 
              style={{ width: `${(profile.score % 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* User Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-bg-card border border-slate-800 p-10 rounded-[40px] relative overflow-hidden group">
          <div className="relative z-10 space-y-6">
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">TOTAL POINTS</p>
            <h3 className="text-7xl font-black text-white tracking-tighter italic">{profile.score}</h3>
            <div className="flex items-center gap-2">
              <ChevronRight size={14} className="text-emerald-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                +0% VS LAST WEEK
              </p>
            </div>
          </div>
          <Trophy size={160} className="absolute -bottom-8 -right-8 text-emerald-500/5 group-hover:scale-110 transition-transform duration-700" />
        </div>

        <div className="bg-bg-card border border-slate-800 p-10 rounded-[40px] relative overflow-hidden group">
          <div className="relative z-10 space-y-6">
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">GLOBAL RANK</p>
            <h3 className="text-7xl font-black text-white tracking-tighter italic">#{profile.rank}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-pink-500">
              COMPUTING TRAJECTORY...
            </p>
          </div>
          <Target size={160} className="absolute -bottom-8 -right-8 text-pink-500/5 group-hover:scale-110 transition-transform duration-700" />
        </div>
      </div>

      {/* Achievements Section */}
      <div className="bg-bg-card border border-slate-800 p-10 rounded-[40px] space-y-10">
        <div className="flex items-center justify-between">
          <h3 className="text-3xl font-black text-white tracking-tight italic uppercase">Achievements</h3>
          <button 
            onClick={() => setShowAllAchievements(true)}
            className="text-[10px] font-black text-pink-500 uppercase tracking-widest hover:text-pink-400 transition-colors"
          >
            View All
          </button>
        </div>
        
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-6">
          {achievements.slice(0, 8).map((ach, i) => (
            <div 
              key={i} 
              className={`aspect-square rounded-full border-2 flex items-center justify-center group cursor-help transition-all ${
                ach.unlocked 
                  ? 'border-indigo-500/50 bg-indigo-500/5 grayscale-0' 
                  : 'border-dashed border-slate-800 grayscale opacity-30'
              }`}
              title={`${ach.title}: ${ach.desc}`}
            >
              <ach.icon size={24} className={ach.unlocked ? ach.color.split(' ')[0] : 'text-slate-600'} />
            </div>
          ))}
        </div>
      </div>

      {/* Focus History Section */}
      <div className="bg-bg-card border border-slate-800 p-10 rounded-[40px] space-y-10">
        <div className="flex items-center justify-between">
          <h3 className="text-3xl font-black text-white tracking-tight italic uppercase">Focus History</h3>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {sessions.length} Total Sessions
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">
                <th className="pb-4 pt-2">Date</th>
                <th className="pb-4 pt-2">Subject</th>
                <th className="pb-4 pt-2 text-center">Mode</th>
                <th className="pb-4 pt-2 text-center">Duration</th>
                <th className="pb-4 pt-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sessions.sort((a, b) => (b.startTime?.toMillis() || 0) - (a.startTime?.toMillis() || 0)).slice(0, 10).map((session, i) => (
                <tr key={i} className="group hover:bg-slate-800/20 transition-colors">
                  <td className="py-5">
                    <p className="text-sm font-bold text-white tracking-tight">
                      {session.startTime?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500">
                      {session.startTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="py-5">
                    <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-400">
                      {session.subject || 'General'}
                    </span>
                  </td>
                  <td className="py-5 text-center">
                    <span className="text-xs font-bold text-slate-400 italic">{session.mode || 'Focus'}</span>
                  </td>
                  <td className="py-5 text-center">
                    <span className="text-sm font-black text-white">{Math.round((session.durationSec || 0) / 60)}m</span>
                  </td>
                  <td className="py-5 text-right">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${session.completed ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {session.completed ? 'Success' : 'Discarded'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && (
            <div className="py-20 text-center opacity-20 italic font-black text-xl uppercase tracking-widest">
              No battle history yet
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAllAchievements && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-slate-800 p-8 rounded-[40px] w-full max-w-2xl max-h-[80vh] flex flex-col space-y-8 overflow-hidden shadow-2xl shadow-indigo-500/10"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-4xl font-black text-white italic uppercase tracking-tight">All Achievements</h3>
                <button 
                  onClick={() => setShowAllAchievements(false)}
                  className="p-3 bg-slate-800 text-slate-400 rounded-2xl hover:text-white hover:bg-slate-700 transition-all"
                >
                  <Rocket size={24} className="rotate-45" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 custom-scrollbar">
                {achievements.map((ach, i) => (
                  <div 
                    key={i} 
                    className={`p-6 rounded-[32px] border-2 flex items-center gap-5 transition-all ${
                      ach.unlocked 
                        ? 'border-indigo-500/30 bg-indigo-500/5' 
                        : 'border-slate-800 bg-slate-900/40 opacity-50 grayscale'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${ach.color}`}>
                      <ach.icon size={32} />
                    </div>
                    <div className="space-y-1">
                      <h4 className={`text-lg font-black italic uppercase tracking-tight ${ach.unlocked ? 'text-white' : 'text-slate-500'}`}>
                        {ach.title}
                      </h4>
                      <p className="text-xs font-medium text-slate-500 leading-relaxed">
                        {ach.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FlameIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 3.333 3 5 1.333 2.222.5 4.667-1 6" /><path d="M15.817 3.42c-.563.306-1.08.744-1.527 1.284-1.12 1.354-1.637 3.125-1.42 4.903.047.39.083.745.109 1.062.06.727.273 1.391.644 1.945.371.554.89 1.008 1.545 1.32.656.312 1.391.43 2.113.344.721-.086 1.344-.406 1.812-.906.469-.5.789-1.149.922-1.899.133-.75.055-1.5-.235-2.148a7.026 7.026 0 0 0-1.148-1.813c-.469-.5-1.031-.914-1.672-1.226a4.84 4.84 0 0 0-2.043-.532l.109 1.062z" /></svg>
);
