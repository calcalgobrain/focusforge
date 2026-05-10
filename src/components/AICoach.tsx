import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Bot, User, X, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const AICoach = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !auth.currentUser) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Get context from user profile
      const profileSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const profile = profileSnap.data();
      
      const context = `
        You are FocusForge AI Study Coach. 
        User Profile: ${JSON.stringify(profile)}
        Tone: Motivational, technical, helpful student coach.
        Goal: Answer questions, provide motivation, suggest study topics.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: context }] },
          ...messages.map(m => ({ 
            role: m.role === 'assistant' ? 'model' : 'user', 
            parts: [{ text: m.content }] 
          })),
          { role: 'user', parts: [{ text: userMessage }] }
        ]
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "I'm speachless! Try asking something else." }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the forge. Please try again later!" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-brand-primary text-white rounded-full shadow-2xl shadow-brand-primary/40 flex items-center justify-center hover:scale-110 transition-transform z-[60]"
      >
        <Sparkles size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-8 w-96 h-[500px] bg-bg-card border border-slate-800 rounded-3xl shadow-2xl z-[60] flex flex-col overflow-hidden"
          >
            <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-indigo-500/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                  <Bot size={20} />
                </div>
                <h4 className="font-bold text-sm">Study Coach</h4>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-2 opacity-50">
                  <Sparkles size={32} className="mx-auto text-indigo-500" />
                  <p className="text-sm font-bold">How can I help you today?</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-brand-primary text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-200 rounded-tl-none'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Forging response...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex gap-2">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask your coach anything..."
                className="flex-1 bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="p-3 bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 disabled:opacity-50 transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
