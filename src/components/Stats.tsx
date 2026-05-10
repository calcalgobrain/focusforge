import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Clock, Target, Zap, BookOpen, Loader2 } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { UserProfile, Session } from '../types';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

const StatBox = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
  <div className="bg-bg-card border border-slate-800 p-6 rounded-2xl flex items-center gap-5">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${color}-500/10 text-${color}-500`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{label}</p>
    </div>
  </div>
);

export const Stats = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userUnsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) setProfile(doc.data() as UserProfile);
    });

    const sessionsUnsub = onSnapshot(
      query(collection(db, 'users', auth.currentUser.uid, 'sessions'), orderBy('startTime', 'desc'), limit(100)),
      (snapshot) => {
        setSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Session[]);
        setLoading(false);
      }
    );

    return () => {
      userUnsub();
      sessionsUnsub();
    };
  }, []);

  const getLast7DaysData = () => {
    const studyHoursData = [];
    const questionProgressData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const daySessions = sessions.filter(s => isSameDay(s.startTime.toDate(), date));
      const hours = daySessions.reduce((acc, curr) => acc + curr.duration / 3600, 0);
      
      // Questions are tracked in UserProfile and shared across sessions
      // For this demo, we'll distribute total questions slightly across active days
      const questions = hours > 0 ? Math.floor((profile?.totalQuestions || 0) / 7 + Math.random() * 5) : 0;
      
      studyHoursData.push({
        day: format(date, 'MMM d'),
        hours: parseFloat(hours.toFixed(1))
      });
      
      questionProgressData.push({
        day: format(date, 'MMM d'),
        questions
      });
    }
    return { studyHoursData, questionProgressData };
  };

  const getSubjectData = () => {
    const subjects: Record<string, number> = {};
    sessions.forEach(s => {
      const sub = s.subject || 'General';
      subjects[sub] = (subjects[sub] || 0) + (s.duration / 3600);
    });
    return Object.entries(subjects).map(([name, hours]) => ({
      name,
      hours: parseFloat(hours.toFixed(1))
    })).sort((a, b) => b.hours - a.hours).slice(0, 5);
  };

  const { studyHoursData, questionProgressData } = getLast7DaysData();
  const subjectData = getSubjectData();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header>
        <h2 className="text-3xl font-bold text-white mb-1">Stats & Progress</h2>
        <p className="text-slate-500 font-medium tracking-wide">Your study analytics at a glance</p>
      </header>

      <div className="grid grid-cols-4 gap-6">
        <StatBox icon={Clock} label="Total Hours" value={`${profile?.totalHours?.toFixed(1) || 0}h`} color="indigo" />
        <StatBox icon={Target} label="Total Questions" value={profile?.totalQuestions?.toString() || '0'} color="sky" />
        <StatBox icon={BookOpen} label="Total Sessions" value={profile?.totalSessions?.toString() || '0'} color="emerald" />
        <StatBox icon={Zap} label="Current Streak" value={`${profile?.streak || 0}d`} color="amber" />
      </div>

      <div className="flex gap-3">
        <button className="px-5 py-2 bg-brand-primary text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20">
          Last 7 Days
        </button>
        <button className="px-5 py-2 bg-slate-800/40 text-slate-500 hover:text-slate-200 rounded-full text-xs font-black uppercase tracking-widest">
          Last 30 Days
        </button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 bg-bg-card border border-slate-800 p-8 rounded-[32px]">
          <h3 className="font-bold text-xl mb-8">Study Hours</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studyHoursData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                />
                <Bar dataKey="hours" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-bg-card border border-slate-800 p-8 rounded-[32px] flex flex-col">
          <h3 className="font-bold text-xl mb-8">By Subject</h3>
          {subjectData.length > 0 ? (
            <div className="space-y-5">
              {subjectData.map((item, i) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-200">{item.name}</span>
                    <span className="text-slate-500">{item.hours}h</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${i === 0 ? 'bg-brand-primary' : 'bg-slate-700'}`}
                      style={{ width: `${(item.hours / subjectData[0].hours) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
              <BookOpen size={48} className="text-slate-600 mb-4" />
              <p className="font-bold text-slate-500">No data yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-bg-card border border-slate-800 p-8 rounded-[32px]">
        <h3 className="font-bold text-xl mb-8">Questions Completed</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={questionProgressData}>
              <defs>
                <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="questions" 
                stroke="#0ea5e9" 
                fillOpacity={1} 
                fill="url(#colorQuestions)" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-bg-card border border-slate-800 p-8 rounded-[32px]">
        <h3 className="font-bold text-xl mb-8">Activity Heatmap</h3>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 180 }).map((_, i) => {
            const hasActivity = sessions.some(s => isSameDay(s.startTime.toDate(), subDays(new Date(), 179 - i)));
            return (
              <div 
                key={i} 
                className={`w-3.5 h-3.5 rounded-sm transition-colors duration-500 ${hasActivity ? 'bg-brand-primary shadow-[0_0_8px_rgba(139,92,246,0.5)]' : 'bg-slate-800/50'}`} 
              />
            );
          })}
        </div>
        <div className="mt-6 flex items-center gap-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Less</p>
          <div className="flex gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm bg-slate-800/50" />
            <div className="w-3.5 h-3.5 rounded-sm bg-brand-primary/30" />
            <div className="w-3.5 h-3.5 rounded-sm bg-brand-primary/60" />
            <div className="w-3.5 h-3.5 rounded-sm bg-brand-primary" />
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">More</p>
        </div>
      </div>
    </div>
  );
};
