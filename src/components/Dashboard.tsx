import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Clock, Zap, Target, BookOpen, ChevronRight, Plus, CheckSquare, Loader2, Rocket } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, onSnapshot, collection, query, where, limit, orderBy } from 'firebase/firestore';
import { UserProfile, Task, ExamGoal, View } from '../types';
import { format, differenceInDays } from 'date-fns';

export const Dashboard = ({ onViewChange }: { onViewChange: (view: View) => void }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<ExamGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVibrant, setIsVibrant] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userUnsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) setProfile(doc.data() as UserProfile);
    });

    const tasksUnsub = onSnapshot(
      query(collection(db, 'users', auth.currentUser.uid, 'tasks'), where('status', '!=', 'done'), limit(4)),
      (snapshot) => {
        setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Task[]);
        setLoading(false);
      }
    );

    const goalsUnsub = onSnapshot(
      query(collection(db, 'users', auth.currentUser.uid, 'examGoals'), orderBy('targetDate', 'asc'), limit(1)),
      (snapshot) => {
        setGoals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ExamGoal[]);
      }
    );

    return () => {
      userUnsub();
      tasksUnsub();
      goalsUnsub();
    };
  }, []);

  const activeGoal = goals[0];
  const daysLeft = activeGoal ? differenceInDays(activeGoal.targetDate.toDate(), new Date()) : 0;

  const stats = [
    { 
      label: 'TOTAL POINTS', 
      value: profile ? profile.score.toString() : '0', 
      subValue: '+0% VS LAST WEEK', 
      color: 'text-emerald-500', 
      icon: Trophy 
    },
    { 
      label: 'GLOBAL RANK', 
      value: profile ? `#${profile.rank}` : '#--', 
      subValue: 'COMPUTING TRAJECTORY...', 
      color: 'text-pink-500', 
      icon: Target 
    },
  ];

  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight italic uppercase">Dashboard</h2>
            <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px]">{today}</p>
          </div>
          <button 
            onClick={() => setIsVibrant(!isVibrant)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isVibrant ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-800 text-slate-500'
            }`}
            title="Vibrant Mode"
          >
            <Rocket size={18} />
          </button>
        </div>
        
        {activeGoal && (
          <div className="bg-bg-card border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
              <Target size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{activeGoal.title}</p>
              <p className="text-sm font-bold text-white">{daysLeft} days until exam</p>
            </div>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-bg-card border border-slate-800 p-10 rounded-[40px] relative overflow-hidden group">
            <div className="relative z-10 space-y-6">
              <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
              <h3 className="text-7xl font-black text-white tracking-tighter italic">{stat.value}</h3>
              <div className="flex items-center gap-2">
                {i === 0 && <ChevronRight size={14} className={stat.color} />}
                <p className={`text-[10px] font-black uppercase tracking-widest ${stat.color}`}>
                  {stat.subValue}
                </p>
              </div>
            </div>
            <stat.icon size={160} className="absolute -bottom-8 -right-8 text-slate-800/10 group-hover:scale-110 transition-transform duration-700" />
            <div className={`absolute top-0 right-0 w-32 h-32 bg-current opacity-[0.05] blur-3xl rounded-full ${stat.color}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-8">
        <div className="col-span-2 bg-gradient-to-br from-indigo-900/20 to-bg-card border border-slate-800 p-8 rounded-[40px]">
          <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-500 mb-8">Daily Goal</h4>
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="16" className="text-slate-800/50" />
                <circle
                  cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="16"
                  strokeDasharray={552}
                  strokeDashoffset={552 - (552 * (profile ? Math.min(profile.totalHours / 6, 1) : 0))}
                  className="text-indigo-500 transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center italic">
                <span className="text-4xl font-black">{profile ? Math.round(Math.min(profile.totalHours / 6, 1) * 100) : 0}%</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">completed</span>
              </div>
            </div>
            <p className="mt-8 text-sm font-bold text-white italic">{profile ? profile.totalHours.toFixed(1) : '0.0'}h / 6h studied today</p>
          </div>
        </div>

        <div className="col-span-3 bg-bg-card border border-slate-800 p-8 rounded-[40px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-500">Upcoming Tasks</h4>
            <button onClick={() => onViewChange('tasks')} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-500/20">Expand</button>
          </div>
          <div className="flex-1 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-700" size={32} /></div>
            ) : tasks.length > 0 ? (
              <div className="space-y-4">
                {tasks.map(task => (
                  <div key={task.id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                      <span className="font-bold text-sm text-slate-200">{task.title}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{task.priority}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20"><CheckSquare size={64} /><p className="mt-4 font-black italic">CLOAK ENGAGED</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
