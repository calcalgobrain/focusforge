import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Flame, Loader2, ChevronRight, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, Timestamp, doc, increment, updateDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';

type TimerMode = 'Pomodoro' | 'Deep Work' | '52/17' | 'Stopwatch' | 'Custom' | 'Monk Mode';
type SessionState = 'focus' | 'break';

export const FocusTimer = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<TimerMode>('Pomodoro');
  const [subject, setSubject] = useState('General');
  const [cycleQueue, setCycleQueue] = useState<string[]>([]);
  const [isCycleActive, setIsCycleActive] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [saving, setSaving] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Timestamp | null>(null);
  const [cycles, setCycles] = useState(0);
  const [sound, setSound] = useState('none');
  const [monkViolations, setMonkViolations] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitPassword, setExitPassword] = useState('');
  const [exitCooldown, setExitCooldown] = useState(0);

  // Soundscape management
  useEffect(() => {
    if (!isActive || sound === 'none') return;
    const audio = new Audio(`/sounds/${sound}.mp3`); // Note: Assets would need to exist
    audio.loop = true;
    if (isActive) audio.play().catch(() => {});
    return () => audio.pause();
  }, [isActive, sound]);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showViolationOverlay, setShowViolationOverlay] = useState(false);

  // Monk Mode Strictness
  useEffect(() => {
    if (!isActive || mode !== 'Monk Mode') {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      return;
    }

    const requestFS = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullScreen(true);
        }
      } catch (err) {
        console.warn("Fullscreen request failed", err);
      }
    };

    requestFS();

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setShowViolationOverlay(true);
        setMonkViolations(v => v + 1);
        if (profile?.uid) {
           updateDoc(doc(db, 'users', profile.uid), {
             monkViolations: increment(1),
             score: increment(-5) // Penalty for violation
           });
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActive && mode === 'Monk Mode') {
        e.preventDefault();
        e.returnValue = 'Monk Mode active! Exiting will injure your avatar and streak.';
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isActive && mode === 'Monk Mode') {
        setIsFullScreen(false);
        setMonkViolations(v => v + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActive, mode, profile]);

  const startExitCooldown = () => {
    if (exitPassword !== 'EXIT') {
      alert('Invalid password');
      return;
    }
    setExitCooldown(10); // 10s cooldown
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (exitCooldown > 0) {
      timer = setInterval(() => setExitCooldown(c => c - 1), 1000);
    } else if (exitCooldown === 0 && showExitModal && exitPassword === 'EXIT') {
       // Cooldown done, allow exit
    }
    return () => clearInterval(timer);
  }, [exitCooldown, showExitModal, exitPassword]);

  useEffect(() => {
    if (!auth.currentUser) return;
    return onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) setProfile(doc.data() as UserProfile);
    });
  }, []);

  const handleModeChange = (m: TimerMode) => {
    if (m === 'Monk Mode' && !profile?.isPremium) {
      alert('🧘 Monk Mode is a Premium feature. Upgrade to unlock it!');
      return;
    }
    setMode(m);
  };

  const getInitialTime = (m: TimerMode, s: SessionState) => {
    if (m === 'Stopwatch') return 0;
    if (s === 'break') return m === 'Pomodoro' ? 5 * 60 : m === '52/17' ? 17 * 60 : 15 * 60;
    
    switch (m) {
      case 'Pomodoro': return 25 * 60;
      case 'Deep Work': return 90 * 60;
      case 'Monk Mode': return 120 * 60;
      case '52/17': return 52 * 60;
      case 'Custom': return totalTime;
      default: return 25 * 60;
    }
  };

  useEffect(() => {
    if (mode === 'Custom') {
      const customMin = prompt('Enter focus time in minutes:', '25');
      const time = (parseInt(customMin || '25') || 25) * 60;
      setTimeLeft(time);
      setTotalTime(time);
    } else {
      const time = getInitialTime(mode, 'focus');
      setTimeLeft(time);
      setTotalTime(time);
    }
    setSessionState('focus');
    setIsActive(false);
  }, [mode]);

  const saveSession = useCallback(async (completed: boolean) => {
    if (!auth.currentUser || !sessionStartTime) return;
    
    setSaving(true);
    const durationSec = mode === 'Stopwatch' ? timeLeft : (totalTime - timeLeft);
    if (durationSec < 10) { 
      setSaving(false);
      return;
    }

    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'sessions'), {
        userId: auth.currentUser.uid,
        type: mode,
        subject,
        duration: durationSec,
        startTime: sessionStartTime,
        endTime: Timestamp.now(),
        completed,
        state: sessionState
      });

      if (sessionState === 'focus') {
        const hoursWeight = 60;
        const questionsWeight = 40;
        // Basic score increment: 10 points per hour completed, 5 bonus for completion
        const baseScore = completed ? Math.floor(durationSec / 60) : Math.floor(durationSec / 120);
        
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          totalHours: increment(durationSec / 3600),
          totalSessions: increment(1),
          lastActive: Timestamp.now(),
          score: increment(baseScore)
        });
      }

    } catch (error) {
      handleFirestoreError(error, 'write' as any, 'sessions');
    } finally {
      setSaving(false);
      setSessionStartTime(null);
    }
  }, [mode, timeLeft, totalTime, sessionStartTime, sessionState]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        if (mode === 'Stopwatch') {
          setTimeLeft((prev) => prev + 1);
        } else {
          if (timeLeft > 0) {
            setTimeLeft((prev) => prev - 1);
          } else {
            // Timer ended
            setIsActive(false);
            const isFocusEnd = sessionState === 'focus';
            if (isFocusEnd) {
              setCycles(c => c + 1);
              saveSession(true);
              
              // Handle Cycle Rotation
              if (isCycleActive && cycleQueue.length > 0) {
                const nextSubject = cycleQueue[0];
                const newQueue = [...cycleQueue.slice(1), nextSubject];
                setCycleQueue(newQueue);
                setSubject(nextSubject);
              }

              setSessionState('break');
              const breakTime = getInitialTime(mode, 'break');
              setTimeLeft(breakTime);
              setTotalTime(breakTime);
              alert('Focus session complete! Time for a break.');
            } else {
              setSessionState('focus');
              const focusTime = getInitialTime(mode, 'focus');
              setTimeLeft(focusTime);
              setTotalTime(focusTime);
              alert('Break over! Ready to focus?');
            }
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, sessionState, saveSession]);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleTimer = async () => {
    if (!isActive && !sessionStartTime) {
      setSessionStartTime(Timestamp.now());
      speak("Session started. Stay focused.");
      
      if (mode === 'Monk Mode') {
        try {
          await document.documentElement.requestFullscreen();
          setIsFullScreen(true);
        } catch (err) {
          console.warn("Fullscreen request failed", err);
        }
      }
    } else {
      speak(isActive ? "Paused" : "Resumed");
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    if (isActive || (timeLeft < totalTime)) {
      if (confirm('Discard your current progress?')) {
        setIsActive(false);
        setTimeLeft(getInitialTime(mode, sessionState));
        setSessionStartTime(null);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const strokeDashoffset = 440 - (440 * progress) / 100;

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <header className="text-center space-y-2">
        <h2 className="text-4xl font-black text-white">Focus Timer</h2>
        <p className="text-slate-500 font-medium tracking-wide">Choose your mode and start focusing</p>
      </header>

      <AnimatePresence>
        {showViolationOverlay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-rose-950/90 backdrop-blur-xl p-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md w-full bg-bg-card border-4 border-rose-500 p-10 rounded-[40px] text-center space-y-8 shadow-[0_0_100px_rgba(244,63,94,0.3)]"
            >
              <div className="w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Shield size={48} className="text-rose-500" />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-white italic uppercase tracking-tight">VIOLATION DETECTED</h3>
                <p className="text-slate-400 font-medium">
                  Focus was lost or tab was switched during Monk Mode. Your score has been penalized and your avatar is weakened.
                </p>
              </div>
              <div className="p-6 bg-slate-900 rounded-3xl border border-rose-500/20">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Penalty</p>
                <p className="text-2xl font-black text-white">-5 POINTS</p>
              </div>
              <button 
                onClick={() => setShowViolationOverlay(false)}
                className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-rose-400 transition-colors shadow-xl shadow-rose-500/20"
              >
                I Am Disciplined
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex justify-center flex-wrap gap-3">
        {(['Pomodoro', 'Deep Work', '52/17', 'Stopwatch', 'Custom', 'Monk Mode'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              mode === m 
                ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/30 ring-2 ring-brand-primary/50' 
                : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {m === 'Monk Mode' && !profile?.isPremium ? '🔒 ' : m === 'Monk Mode' ? '🧘 ' : ''}{m}
          </button>
        ))}
      </div>

      <div className="flex justify-center items-center gap-6">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject:</p>
          <select 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="bg-bg-card border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-primary/50 text-slate-200"
          >
            {['General', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ambient:</p>
          <select 
            value={sound}
            onChange={(e) => setSound(e.target.value)}
            className="bg-bg-card border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-primary/50 text-slate-200"
          >
            <option value="none">Silence</option>
            <option value="rain">Rain</option>
            <option value="white-noise">White Noise</option>
            <option value="lofi">Lofi Beats</option>
            <option value="meditation">Meditation</option>
          </select>
        </div>
      </div>

      <div className="bg-bg-card border border-slate-800 rounded-[40px] p-16 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-800/50 px-4 py-1.5 rounded-full border border-slate-700 flex items-center gap-2">
          <Flame size={14} className={sessionState === 'focus' ? "text-orange-500" : "text-sky-500"} />
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
            {sessionState === 'focus' ? 'Focus' : 'Break'}
          </span>
        </div>

        <div className="relative w-80 h-80 mx-auto">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="160"
              cy="160"
              r="140"
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              className="text-slate-800/50"
            />
            <motion.circle
              cx="160"
              cy="160"
              r="140"
              fill="none"
              stroke="url(#timerGradient)"
              strokeWidth="16"
              strokeDasharray={880}
              initial={{ strokeDashoffset: 880 }}
              animate={{ strokeDashoffset: 880 - (880 * progress) / 100 }}
              transition={{ duration: 1, ease: "linear" }}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-7xl font-black tracking-tighter text-white tabular-nums">
              {formatTime(timeLeft)}
            </span>
            <span className="text-slate-500 font-bold uppercase tracking-widest mt-2">remaining</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 mt-12">
          <button 
            onClick={resetTimer}
            className="w-14 h-14 rounded-full border border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:border-slate-500 transition-all active:scale-95"
          >
            <RotateCcw size={24} />
          </button>
          <button 
            onClick={toggleTimer}
            className="w-20 h-20 bg-brand-primary text-white rounded-3xl shadow-2xl shadow-brand-primary/40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all relative group"
          >
            {isActive ? <Pause size={36} fill="white" /> : <Play size={36} fill="white" className="ml-1" />}
          </button>
          
          {mode === 'Monk Mode' && isActive && (
            <button 
              onClick={() => setShowExitModal(true)}
              className="w-14 h-14 rounded-full border border-red-500/30 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all"
              title="Emergency Exit"
            >
              <RotateCcw size={24} className="text-red-500" />
            </button>
          )}
          {!(mode === 'Monk Mode' && isActive) && <div className="w-14 h-14" />}
        </div>
      </div>

      <div className="bg-bg-card border border-slate-800 p-8 rounded-[32px] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <RotateCcw size={20} className="text-indigo-500" />
             <h3 className="font-bold text-lg">Cycle Mode</h3>
          </div>
          <button 
            onClick={() => setIsCycleActive(!isCycleActive)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              isCycleActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {isCycleActive ? 'Active' : 'Disabled'}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'].map(s => (
            <button 
              key={s}
              onClick={() => {
                if (cycleQueue.includes(s)) {
                  setCycleQueue(cycleQueue.filter(q => q !== s));
                } else {
                  setCycleQueue([...cycleQueue, s]);
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                cycleQueue.includes(s) 
                  ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        
        {cycleQueue.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {cycleQueue.map((s, i) => (
              <React.Fragment key={i}>
                <div className="px-4 py-2 bg-slate-800/80 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-700">
                  {s}
                </div>
                {i < cycleQueue.length - 1 && <ChevronRight size={14} className="text-slate-700 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showExitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-bg-card border border-red-500/30 p-8 rounded-[32px] w-full max-w-sm text-center space-y-6"
            >
              <h3 className="text-2xl font-black text-white">Emergency Exit</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Exiting Monk Mode early will violate your streak and injure your avatar.
              </p>
              
              <div className="space-y-4">
                <input 
                  type="password"
                  placeholder="Type 'EXIT' to confirm"
                  value={exitPassword}
                  onChange={(e) => setExitPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl text-center font-bold tracking-widest focus:outline-none focus:border-red-500/50"
                />
                
                {exitCooldown > 0 ? (
                  <div className="py-4 font-black text-3xl text-red-500">
                    {exitCooldown}s
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setShowExitModal(false)}
                      className="py-3 bg-slate-800 text-white rounded-xl font-bold"
                    >
                      Stay
                    </button>
                    <button 
                      onClick={startExitCooldown}
                      className="py-3 bg-red-500 text-white rounded-xl font-bold"
                    >
                      Initiate Exit
                    </button>
                  </div>
                )}
                
                {exitCooldown === 0 && exitPassword === 'EXIT' && (
                  <button 
                    onClick={() => {
                      setIsActive(false);
                      setShowExitModal(false);
                      saveSession(false);
                      setMode('Pomodoro');
                    }}
                    className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-red-600/30"
                  >
                    Confirm Emergency Exit
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'State', value: sessionState.charAt(0).toUpperCase() + sessionState.slice(1) },
          { label: 'Mode', value: mode },
          { label: 'Cycles', value: cycles.toString() },
        ].map((item, i) => (
          <div key={i} className="bg-bg-card border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center">
            <p className="text-2xl font-black text-white">{item.value}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
