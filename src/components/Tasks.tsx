import React, { useState, useEffect } from 'react';
import { Search, Plus, CheckCircle, Circle, Clock, Book, AlertCircle, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { Task } from '../types';

type TaskStatus = 'all' | 'todo' | 'in_progress' | 'done';
type Priority = 'low' | 'medium' | 'high' | 'critical';

export const Tasks = () => {
  const [filter, setFilter] = useState<TaskStatus>('all');
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'tasks'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(taskList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'get' as any, 'tasks');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newTitle.trim()) return;

    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'tasks'), {
        userId: auth.currentUser.uid,
        title: newTitle,
        subject: newSubject || 'General',
        duration: 0,
        questions: 0,
        status: 'todo',
        priority: newPriority,
        createdAt: Timestamp.now()
      });
      setIsModalOpen(false);
      setNewTitle('');
      setNewSubject('');
      setNewPriority('medium');
    } catch (error) {
      handleFirestoreError(error, 'write' as any, 'tasks');
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    if (!auth.currentUser) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'tasks', task.id), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, 'update' as any, `tasks/${task.id}`);
    }
  };

  const deleteTask = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, 'delete' as any, `tasks/${id}`);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) || 
                         task.subject.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusCount = (status: TaskStatus) => {
    if (status === 'all') return tasks.length;
    return tasks.filter(t => t.status === status).length;
  };

  const priorityColors = {
    critical: 'text-red-400 bg-red-400/10 border-red-400/20',
    high: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    low: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Tasks</h2>
          <p className="text-slate-500 font-medium">
            {loading ? 'Loading tasks...' : `${tasks.length} total tasks`}
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Plus size={18} /> New Task
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-bg-card border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div className="flex gap-2">
        {(['all', 'todo', 'in_progress', 'done'] as TaskStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              filter === f 
                ? 'bg-brand-primary text-white' 
                : 'bg-slate-800/40 text-slate-500 hover:text-slate-200'
            }`}
          >
            {f === 'all' ? `All ${getStatusCount('all')}` : 
             f === 'todo' ? `To Do ${getStatusCount('todo')}` : 
             f === 'in_progress' ? `In Progress ${getStatusCount('in_progress')}` : 
             `Done ${getStatusCount('done')}`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
            <Loader2 className="animate-spin" size={20} />
            <span>Syncing tasks...</span>
          </div>
        ) : (
          <AnimatePresence>
            {filteredTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-bg-card border border-slate-800 p-6 rounded-[24px] flex items-center gap-6 group hover:border-slate-700 transition-colors"
              >
                <button 
                  onClick={() => toggleTaskStatus(task)}
                  className={`transition-transform hover:scale-110 ${task.status === 'done' ? 'text-emerald-500' : 'text-slate-600'}`}
                >
                  {task.status === 'done' ? <CheckCircle size={24} /> : <Circle size={24} />}
                </button>
                
                <div className="flex-1 space-y-1">
                  <h3 className={`font-bold text-lg transition-all ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Book size={14} className="text-indigo-400" />
                      {task.subject}
                    </div>
                    {task.duration > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-sky-400" />
                        {task.duration} min
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                    {task.priority}
                  </div>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-2 rounded-lg hover:bg-red-400/10"
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {!loading && filteredTasks.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p className="font-bold">No tasks found</p>
            <p className="text-sm">Try a different filter or search term</p>
          </div>
        )}
      </div>

      {/* New Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-bg-card border border-slate-800 w-full max-w-sm rounded-3xl p-8 relative z-10"
            >
              <h3 className="text-2xl font-black text-white mb-6">Create Task</h3>
              <form onSubmit={addTask} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Title</label>
                  <input
                    autoFocus
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    placeholder="e.g. Study Physics Chapter 1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Subject</label>
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    placeholder="e.g. Physics"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Priority</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['low', 'medium', 'high', 'critical'] as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPriority(p)}
                        className={`py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${
                          newPriority === p 
                            ? priorityColors[p] 
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full py-3 mt-4 bg-brand-primary text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-primary/20">
                  Add Task
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
