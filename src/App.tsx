/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { FocusTimer } from './components/FocusTimer';
import { Tasks } from './components/Tasks';
import { Stats } from './components/Stats';
import { Leaderboard } from './components/Leaderboard';
import { Resources } from './components/Resources';
import { Profile } from './components/Profile';
import { AICoach } from './components/AICoach';
import { motion, AnimatePresence } from 'motion/react';
import { auth, testConnection } from './lib/firebase';
import { UserProfile, View } from './types';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');

  useEffect(() => {
    testConnection();
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard onViewChange={setActiveView} />;
      case 'timer': return <FocusTimer />;
      case 'tasks': return <Tasks />;
      case 'stats': return <Stats />;
      case 'leaderboard': return <Leaderboard />;
      case 'resources': return <Resources />;
      case 'profile': return <Profile />;
      default: return <Dashboard onViewChange={setActiveView} />;
    }
  };

  return (
    <div className="flex bg-bg-deep min-h-screen text-slate-200">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <main className="flex-1 ml-64 min-h-screen overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto px-10 py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AICoach />

      {/* Decorative background elements */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-brand-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="fixed bottom-0 left-64 w-[300px] h-[300px] bg-brand-secondary/5 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/2 pointer-events-none" />
    </div>
  );
}
