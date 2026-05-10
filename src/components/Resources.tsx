import React, { useState, useEffect } from 'react';
import { Book, Search, Star, ExternalLink, ShieldCheck, Lock, ArrowUpRight, Plus, Loader2, FileText, ChevronRight } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, where, addDoc, Timestamp, doc } from 'firebase/firestore';
import { Resource, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const Resources = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'curated' | 'mine'>('curated');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [myResources, setMyResources] = useState<Resource[]>([]);
  const [curatedResources, setCuratedResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFile, setSelectedFile] = useState<Resource | null>(null);

  const subjects = ['All Subjects', 'Physics', 'Chemistry', 'Mathematics', 'Biology'];

  const handleOpenResource = (res: Resource) => {
    if (res.isPremium && !profile?.isPremium) {
      alert('This is a premium resource. Please upgrade to Pro.');
      return;
    }
    setSelectedFile(res);
  };

  if (selectedFile) {
    return (
      <div className="fixed inset-0 z-50 bg-bg-deep flex flex-col h-screen">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-bg-card">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedFile(null)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <h3 className="font-bold text-white">{selectedFile.title}</h3>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-brand-primary text-white text-xs font-black uppercase rounded-lg">Share</button>
          </div>
        </header>
        
        <div className="flex-1 flex overflow-hidden">
          {/* PDF Viewer Side (Simulator) */}
          <div className="flex-1 overflow-y-auto bg-slate-900/50 p-10 flex flex-col items-center gap-10 custom-scrollbar">
            {[1, 2, 3].map(p => (
              <div key={p} className="w-[800px] aspect-[1/1.41] bg-white rounded shadow-2xl flex flex-col items-center justify-center p-20 text-slate-200">
                <FileText size={100} className="text-slate-100" />
                <p className="mt-10 font-bold text-xl text-slate-400">PDF PAGE {p}</p>
                <div className="w-full mt-10 space-y-4">
                   <div className="h-4 bg-slate-100/50 rounded w-full" />
                   <div className="h-4 bg-slate-100/50 rounded w-3/4" />
                   <div className="h-4 bg-slate-100/50 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Notes Side */}
          <div className="w-[450px] border-l border-slate-800 bg-bg-card flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-black text-sm uppercase tracking-widest text-indigo-400">Smart Notes</h4>
              <Plus size={18} className="text-slate-500" />
            </div>
            <textarea 
              placeholder="Take notes while studying..."
              className="flex-1 p-6 bg-transparent text-slate-300 resize-none focus:outline-none text-sm leading-relaxed"
            />
          </div>
        </div>
      </div>
    );
  }
  const levels = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

  // Static curated resources for now, but following the structure
  const initialCurated: Resource[] = [
    { id: '1', title: 'HC Verma — Concepts of Physics Vol. 1', author: 'H.C. Verma', subject: 'Physics', level: 'Intermediate', rating: 4.9, isPremium: false, url: '#' },
    { id: '2', title: 'HC Verma — Concepts of Physics Vol. 2', author: 'H.C. Verma', subject: 'Physics', level: 'Advanced', rating: 4.9, isPremium: false, url: '#' },
    { id: '3', title: 'NCERT Chemistry Part 1 — Class 12', author: 'NCERT', subject: 'Chemistry', level: 'Beginner', rating: 4.7, isPremium: false, url: '#' },
    { id: '4', title: 'RD Sharma — Mathematics Class 12', author: 'R.D. Sharma', subject: 'Mathematics', level: 'Intermediate', rating: 4.6, isPremium: false, url: '#' },
    { id: '5', title: 'Arihant — 41 Years JEE Advanced', author: 'Arihant', subject: 'Physics', level: 'Advanced', rating: 4.8, isPremium: true, url: '#' },
    { id: '6', title: 'MS Chauhan — Organic Chemistry', author: 'MS Chauhan', subject: 'Chemistry', level: 'Advanced', rating: 4.8, isPremium: true, url: '#' },
    { id: '7', title: 'NCERT Biology — Class 12', author: 'NCERT', subject: 'Biology', level: 'Beginner', rating: 4.8, isPremium: false, url: '#' },
    { id: '8', title: 'Cengage — Calculus', author: 'Cengage', subject: 'Mathematics', level: 'Advanced', rating: 4.7, isPremium: true, url: '#' },
  ];

  useEffect(() => {
    setCuratedResources(initialCurated);
    
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const profileUnsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) setProfile(doc.data() as UserProfile);
    });

    const unsub = onSnapshot(collection(db, 'users', auth.currentUser.uid, 'resources'), (snapshot) => {
      setMyResources(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Resource[]);
      setLoading(false);
    });

    return () => {
      profileUnsub();
      unsub();
    };
  }, []);

  const resourcesToDisplay = (activeTab === 'curated' ? curatedResources : myResources).filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         res.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'All Subjects' || res.subject === selectedSubject;
    const matchesLevel = selectedLevel === 'All Levels' || res.level === selectedLevel;
    return matchesSearch && matchesSubject && matchesLevel;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', subject: 'Physics' });

  const handleAddDocument = async () => {
    if (!auth.currentUser || !newDoc.title) return;
    
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'resources'), {
        title: newDoc.title,
        author: 'Me',
        subject: newDoc.subject,
        level: 'Intermediate',
        rating: 5.0,
        url: '#',
        isPremium: false,
        createdAt: Timestamp.now()
      });
      setShowAddModal(false);
      setNewDoc({ title: '', subject: 'Physics' });
    } catch (error) {
      console.error('Failed to add resource', error);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header>
        <h2 className="text-3xl font-bold text-white mb-1">Resource Library</h2>
        <p className="text-slate-500 font-medium tracking-wide">Browse curated materials or view your own PDFs</p>
      </header>

      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => setActiveTab('curated')}
          className={`px-6 py-3 border-b-2 font-bold text-sm transition-all ${activeTab === 'curated' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Curated Library
        </button>
        <button 
          onClick={() => setActiveTab('mine')}
          className={`px-6 py-3 border-b-2 font-bold text-sm transition-all ${activeTab === 'mine' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          My Documents ({myResources.length})
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search books, authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-card border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <select 
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="bg-bg-card border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none appearance-none cursor-pointer hover:border-slate-700"
        >
          {subjects.map(c => <option key={c}>{c}</option>)}
        </select>
        <select 
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="bg-bg-card border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none appearance-none cursor-pointer hover:border-slate-700"
        >
          {levels.map(l => <option key={l}>{l}</option>)}
        </select>
        {activeTab === 'mine' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-brand-primary text-white p-3 rounded-xl hover:bg-brand-primary/90 transition-colors"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-slate-800 p-8 rounded-[32px] w-full max-w-sm space-y-6 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-white italic uppercase">Add Resource</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Document Title</label>
                  <input 
                    type="text"
                    placeholder="e.g. Physics Notes"
                    value={newDoc.title}
                    onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl text-white font-bold focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject</label>
                  <select 
                    value={newDoc.subject}
                    onChange={(e) => setNewDoc({...newDoc, subject: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl text-white font-bold focus:outline-none appearance-none"
                  >
                    {subjects.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="py-3 bg-slate-800 text-slate-400 rounded-xl font-bold hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddDocument}
                    className="py-3 bg-brand-primary text-white rounded-xl font-black uppercase tracking-widest"
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-brand-primary" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {resourcesToDisplay.map((res) => (
            <div key={res.id} className="bg-bg-card border border-slate-800 p-6 rounded-[28px] hover:border-slate-700 transition-all group relative">
              <div className="flex gap-5">
                <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-500 flex-shrink-0 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
                  {activeTab === 'curated' ? <Book size={28} /> : <FileText size={28} />}
                </div>
                <div className="space-y-1 pr-12">
                  <h3 className="font-bold text-lg text-slate-100 group-hover:text-white transition-colors line-clamp-1">{res.title}</h3>
                  <p className="text-xs font-medium text-slate-500 tracking-wide">{res.author}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2.5 py-0.5 bg-brand-secondary/10 text-brand-secondary text-[10px] font-black uppercase rounded-lg border border-brand-secondary/20">
                      {res.subject}
                    </span>
                    <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-lg border border-amber-500/20">
                      {res.level}
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-black uppercase rounded-lg border border-slate-700">
                      JEE
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span className="text-sm font-black text-slate-300">{res.rating}</span>
                </div>
                <button 
                  onClick={() => handleOpenResource(res)}
                  className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest ${res.isPremium ? 'text-slate-600' : 'text-indigo-400 hover:text-indigo-300 transition-colors'}`}>
                  {res.isPremium ? <Lock size={12} /> : <ShieldCheck size={12} />}
                  {res.isPremium ? 'Premium' : activeTab === 'curated' ? 'Access' : 'Open'}
                  <ArrowUpRight size={12} />
                </button>
              </div>
              
              {res.isPremium && (
                <div className="absolute top-4 right-6 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
                  <Lock size={14} className="text-amber-500" />
                </div>
              )}
            </div>
          ))}
          {resourcesToDisplay.length === 0 && (
            <div className="col-span-2 py-20 text-center opacity-40">
              <Search size={48} className="mx-auto mb-4" />
              <p className="font-bold">No resources found</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-bg-card border border-slate-800 rounded-[32px] p-10 text-center space-y-6">
        <div className="space-y-2">
          <h4 className="text-xl font-bold">Can't find what you need?</h4>
          <p className="text-sm text-slate-500 font-medium tracking-wide">Request specific books or materials to be added to the library</p>
        </div>
        <button className="px-10 py-3 bg-brand-primary text-white font-black text-sm rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-105 transition-transform tracking-widest uppercase">
          Request a Resource
        </button>
      </div>
    </div>
  );
};
