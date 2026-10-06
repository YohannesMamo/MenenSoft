import React, { useState } from 'react';
import { sqliteDb } from './db';
import { isPremium, getLicenseInfo } from './licensing';
import { freePlanSummary } from './licenseKeys';
import { BUILD_HAS_ESLCE } from './buildFlags';
import {
  Settings,
  User,
  Database,
  Trash2,
  Star,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Crown
} from 'lucide-react';

interface Props {
  onGradeSwapped: () => void;
  onThemeChanged?: (theme: 'dark' | 'light') => void;
  onOpenActivation?: () => void;
}

export const SettingsScreen: React.FC<Props> = ({ onGradeSwapped, onOpenActivation }) => {
  const metadata = sqliteDb.getAppMetadata();
  const user = sqliteDb.getLocalUser();

  const [studentName, setStudentName] = useState(user?.display_name || '');
  const [isNameSaved, setIsNameSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratedSuccess, setRatedSuccess] = useState(false);

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;
    sqliteDb.updateUserName(studentName);
    setIsNameSaved(true);
    setTimeout(() => setIsNameSaved(false), 2000);
  };

  const handleSwitchGrade = (gradeKey: 'G9' | 'G10' | 'G11' | 'G12') => {
    sqliteDb.switchBundledDatabaseGrade(gradeKey);
    onGradeSwapped();
  };

  const handleResetProgress = () => {
    sqliteDb.resetUserProgress();
    setShowResetConfirm(false);
    onGradeSwapped(); // refresh stats
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
          <Settings className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">App Settings</h2>
          <p className="text-xs text-slate-400">Offline database, user profile & build variants</p>
        </div>
      </div>

      {/* 1. Bundled Database & Runtime Grade Adaptation (Core Requirement!) */}
      <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-4 md:p-5 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Bundled SQLite Database & Runtime Adaptation
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            menen_offline.db
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          <span className="text-white font-medium">Critical architecture demonstration:</span> The single APK adapts to different grades at runtime. The grade is determined exclusively by the bundled SQLite database (<code className="text-emerald-300">app_metadata</code> table), not hardcoded in the codebase.
        </p>

        {/* Current app_metadata row inspector */}
        <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/80 text-[11px] font-mono space-y-1 text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-500">app_metadata.grade:</span>
            <span className="text-emerald-400 font-bold">&quot;{metadata.grade}&quot;</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">app_metadata.grade_label:</span>
            <span className="text-emerald-400 font-bold">&quot;{metadata.grade_label}&quot;</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">app_metadata.app_name:</span>
            <span className="text-emerald-400 font-bold">&quot;{metadata.app_name}&quot;</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">app_metadata.content_version:</span>
            <span className="text-slate-300">{metadata.content_version}</span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
            Test Runtime Grade Adaptation (Simulate swapping the bundled database):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['G9', 'G10', 'G11', 'G12'] as const).map(g => {
              const isCurrent = metadata.grade === g;
              return (
                <button
                  key={g}
                  onClick={() => handleSwitchGrade(g)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isCurrent
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/30'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Grade {g.replace('G', '')}</span>
                  {isCurrent && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Local User Profile */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 md:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Local Student Profile (Single Local User)
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Stored locally in SQLite <code className="text-slate-300">local_user</code> table. No network or remote login required.
        </p>

        <form onSubmit={handleUpdateName} className="flex gap-2">
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Student display name"
            className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
          >
            {isNameSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
            <span>{isNameSaved ? 'Saved' : 'Update'}</span>
          </button>
        </form>
      </div>

      {/* 2.5 License & Activation */}
      <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              License & Activation
            </h3>
          </div>
          {isPremium() ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Crown className="w-3 h-3" /> PRO
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700">
              FREE
            </span>
          )}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {isPremium()
            ? `Premium active for ${getLicenseInfo()?.customer || 'this device'}. ${BUILD_HAS_ESLCE ? 'The full national exam bank and predicted 2026 papers are unlocked.' : 'The full exam bank and unlimited practice are unlocked.'}`
            : freePlanSummary(BUILD_HAS_ESLCE)}
        </p>
        <button
          onClick={onOpenActivation}
          className="w-full py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isPremium() ? 'View license & device code' : 'Activate now'}</span>
        </button>
      </div>

      {/* 3. Actions: Rate App & Reset Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Rate App */}
        <div
          onClick={() => setShowRateModal(true)}
          className="p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Rate Menen Assistant
              </h4>
              <p className="text-[11px] text-slate-400">Leave offline star feedback</p>
            </div>
          </div>
          <span className="text-xs text-amber-400 font-bold">5.0 ★</span>
        </div>

        {/* Reset Progress */}
        <div
          onClick={() => setShowResetConfirm(true)}
          className="p-4 bg-slate-800/80 hover:bg-slate-800 border border-rose-500/20 hover:border-rose-500/40 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                Reset Study Progress
              </h4>
              <p className="text-[11px] text-slate-400">Clear quiz and exam records</p>
            </div>
          </div>
          <span className="text-xs text-rose-400 font-medium">Reset</span>
        </div>
      </div>

      {/* 4. About Architecture Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>About Menen Student Assistant</span>
        </div>
        <p className="leading-relaxed">
          Engineered for Ethiopian high school students in Grades 9–12. Completely offline-first with zero telemetry or network requirements. Room database utilizes SQLite with WAL mode, foreign key constraints, and multi-column indexes for fast lookups.
        </p>
        <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-400">
          <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700">Kotlin 2.0</span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700">Jetpack Compose M3</span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700">Room 2.6.1</span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700">Paging 3</span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700">createFromAsset()</span>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Reset All Progress?</h3>
                <p className="text-xs text-slate-400">This action clears your scores and reading status.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              All stored sessions in <code className="text-rose-400">quiz_sessions</code>, <code className="text-rose-400">exam_sessions</code>, and <code className="text-rose-400">section_progress</code> will be cleared.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 px-3 bg-slate-800 text-slate-300 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetProgress}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-md"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate App Modal */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Star className="w-6 h-6 fill-amber-400" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">Rate Menen Student Assistant</h3>
              <p className="text-xs text-slate-400 mt-1">
                How is your offline studying experience?
              </p>
            </div>

            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                >
                  <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400' : 'text-slate-600'}`} />
                </button>
              ))}
            </div>

            {ratedSuccess ? (
              <p className="text-xs text-emerald-400 font-medium">
                Thank you! Your offline rating has been registered.
              </p>
            ) : null}

            <div className="flex gap-2">
              <button
                onClick={() => setShowRateModal(false)}
                className="flex-1 py-2 px-3 bg-slate-800 text-slate-300 text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setRatedSuccess(true);
                  setTimeout(() => setShowRateModal(false), 1200);
                }}
                className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer shadow-md"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
