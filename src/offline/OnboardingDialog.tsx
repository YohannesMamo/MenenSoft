import React, { useState } from 'react';
import { sqliteDb } from './db';
import type { LocalUser } from './types';
import { GraduationCap, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  onCompleted: (user: LocalUser) => void;
}

export const OnboardingDialog: React.FC<Props> = ({ onCompleted }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const metadata = sqliteDb.getAppMetadata();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name to personalize your study offline profile.');
      return;
    }
    const user = sqliteDb.registerUser(name.trim());
    onCompleted(user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Menen Student Assistant</h2>
            <p className="text-xs text-emerald-400 font-medium">{metadata.grade_label} • Ethiopian Secondary Curriculum</p>
          </div>
        </div>

        <div className="space-y-3 mb-6 text-sm text-slate-300">
          <p>
            Welcome! Menen is your <span className="text-emerald-400 font-medium">100% offline-first</span> study companion. All textbooks, chapter quizzes{metadata.grade === 'G12' ? ', and national ESLCE past papers' : ' and timed exams'} run directly from your device&apos;s local SQLite database.
          </p>
          <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Offline SQLite storage (zero internet required)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Adapted automatically for {metadata.grade_label}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Single local profile (no password needed)</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="studentName" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              What is your name?
            </label>
            <input
              id="studentName"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Caleb Benyofoni"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
            />
            {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start {metadata.grade_label} Study</span>
            <Sparkles className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
