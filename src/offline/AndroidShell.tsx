import React, { useState, useEffect } from 'react';
import { sqliteDb } from './db';
import { DashboardScreen } from './DashboardScreen';
import { StudyScreen } from './StudyScreen';
import { SectionReaderScreen } from './SectionReaderScreen';
import { QuizScreen } from './QuizScreen';
import { ExamScreen } from './ExamScreen';
import { EslceScreen } from './EslceScreen';
import { SettingsScreen } from './SettingsScreen';
import { OnboardingDialog } from './OnboardingDialog';
import { ActivationScreen } from './ActivationScreen';
import { isPremium, onLicenseChanged } from './licensing';
import { eslceAvailable as eslceAvailableFor } from './buildFlags';
import {
  LayoutDashboard,
  BookOpen,
  BrainCircuit,
  FileText,
  School,
  Settings,
  Award,
  WifiOff,
  Battery,
  Crown
} from 'lucide-react';

export const AndroidShell: React.FC = () => {
  const [metadata, setMetadata] = useState(sqliteDb.getAppMetadata());
  const [user, setUser] = useState(sqliteDb.getLocalUser());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'study' | 'quiz' | 'exam' | 'eslce'>('dashboard');

  // ESLCE only ships in the Grade-12 APK; G9/G10/G11 builds have no ESLCE content.
  const eslceAvailable = eslceAvailableFor(metadata.grade);

  // Study Reader drilldown state
  const [readerState, setReaderState] = useState<{
    stbId: string;
    chapterId: number;
    sectionId: string;
  } | null>(null);

  // Direct quiz shortcut from reader or dashboard
  const [directQuizParams, setDirectQuizParams] = useState<{
    stbId: string;
    chapterId: number;
    sectionId: string;
  } | null>(null);

  // Modals & Panels
  const [showSettings, setShowSettings] = useState(false);
  const [showActivation, setShowActivation] = useState(false);

  // Re-render shell when the license changes (activation/removal elsewhere).
  const [, forceRender] = useState(0);
  useEffect(() => onLicenseChanged(() => forceRender(x => x + 1)), []);

  // Refresh on grade switch or progress reset
  const handleRefresh = () => {
    setMetadata(sqliteDb.getAppMetadata());
    setUser(sqliteDb.getLocalUser());
    setReaderState(null);
  };

  const handleSelectSection = (stbId: string, chapterId: number, sectionId: string) => {
    setReaderState({ stbId, chapterId, sectionId });
    setActiveTab('study');
    setShowSettings(false);
  };

  const handleTakeQuizFromSection = (stbId: string, chapterId: number, sectionId: string) => {
    setDirectQuizParams({ stbId, chapterId, sectionId });
    setReaderState(null);
    setActiveTab('quiz');
    setShowSettings(false);
  };

  const overallScore = sqliteDb.getDashboardAnalytics().overallAverage;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start py-2 sm:py-4 px-2 sm:px-4 font-sans select-none antialiased">
      {/* First launch onboarding prompt for student's name */}
      {!user && (
        <OnboardingDialog
          onCompleted={(newUser) => {
            setUser(newUser);
          }}
        />
      )}

      {/* App Shell Container */}
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800/80 shadow-xl bg-slate-900 overflow-hidden">
        {/* Offline Status Bar */}
        <div className="bg-slate-950 px-5 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/60">
          <span className="font-bold text-slate-200">09:41</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </span>
            <div className="flex items-center gap-0.5 text-slate-300">
              <span className="text-[10px] font-bold">98%</span>
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Material 3 TopAppBar */}
        <div className="bg-slate-900/90 backdrop-blur-md px-4 py-3 border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shadow-md shadow-emerald-600/20">
              M
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                {showSettings ? 'Settings' : metadata.app_name}
              </h1>
              <p className="text-[10px] text-emerald-400 font-medium leading-tight mt-0.5">
                {metadata.grade_label} • National Prep
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* License Status / Upgrade Entry */}
            <button
              onClick={() => {
                setShowActivation(true);
                setShowSettings(false);
                setReaderState(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition-all ${
                showActivation
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : isPremium()
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              } text-[10px] font-bold`}
              title="License & Activation"
            >
              {isPremium() ? <Crown className="w-3 h-3" /> : null}
              <span>{isPremium() ? 'PRO' : 'Free'}</span>
            </button>
            {/* Overall Academic Mastery Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>{overallScore}% Mastery</span>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                setReaderState(null);
              }}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                showSettings
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Settings & Grade Selector"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Main Content Container */}
        <div className="p-4 sm:p-5 min-h-[580px] max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {showActivation ? (
            <ActivationScreen
              onClose={() => setShowActivation(false)}
              onLicenseChanged={() => forceRender(x => x + 1)}
            />
          ) : showSettings ? (
            <SettingsScreen
              onGradeSwapped={handleRefresh}
              onOpenActivation={() => setShowActivation(true)}
            />
          ) : readerState ? (
            <SectionReaderScreen
              stbId={readerState.stbId}
              chapterId={readerState.chapterId}
              sectionId={readerState.sectionId}
              onBack={() => setReaderState(null)}
              onTakeQuiz={handleTakeQuizFromSection}
            />
          ) : activeTab === 'dashboard' ? (
            <DashboardScreen
              onNavigateTab={(tab) => {
                if (tab === 'settings') setShowSettings(true);
                else {
                  setShowSettings(false);
                  setActiveTab(tab);
                }
              }}
              onOpenTextbook={() => {
                setActiveTab('study');
                setShowSettings(false);
              }}
              onLaunchQuiz={(stbId, chapterId, sectionId) => {
                setDirectQuizParams({ stbId, chapterId, sectionId });
                setActiveTab('quiz');
                setShowSettings(false);
              }}
            />
          ) : activeTab === 'study' ? (
            <StudyScreen
              selectedBookId={null}
              onSelectSection={handleSelectSection}
            />
          ) : activeTab === 'quiz' ? (
            <QuizScreen
              initialStbId={directQuizParams?.stbId}
              initialChapterId={directQuizParams?.chapterId}
              initialSectionId={directQuizParams?.sectionId}
              onNavigateToStudy={() => setActiveTab('study')}
            />
          ) : activeTab === 'exam' ? (
            <ExamScreen />
          ) : activeTab === 'eslce' && eslceAvailable ? (
            <EslceScreen
              onUpgrade={() => setShowActivation(true)}
            />
          ) : (
            // ESLCE is not part of this build (Grade 9/10/11): fall back to the
            // dashboard rather than rendering an empty exam library.
            <DashboardScreen
              onNavigateTab={(tab) => {
                if (tab === 'settings') setShowSettings(true);
                else {
                  setShowSettings(false);
                  setActiveTab(tab);
                }
              }}
              onOpenTextbook={() => {
                setActiveTab('study');
                setShowSettings(false);
              }}
              onLaunchQuiz={(stbId, chapterId, sectionId) => {
                setDirectQuizParams({ stbId, chapterId, sectionId });
                setActiveTab('quiz');
                setShowSettings(false);
              }}
            />
          )}
        </div>

        {/* Material 3 Bottom Navigation Bar with 5 tabs */}
        <div className="bg-slate-950 border-t border-slate-800/80 px-2 py-2 flex items-center justify-around z-30">
          {/* 1. Dashboard */}
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setShowSettings(false);
              setReaderState(null);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard' && !showSettings
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'dashboard' && !showSettings ? 'bg-emerald-500/10' : ''}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Dashboard</span>
          </button>

          {/* 2. Study */}
          <button
            onClick={() => {
              setActiveTab('study');
              setShowSettings(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'study' && !showSettings
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'study' && !showSettings ? 'bg-emerald-500/10' : ''}`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Study</span>
          </button>

          {/* 3. Quiz */}
          <button
            onClick={() => {
              setActiveTab('quiz');
              setShowSettings(false);
              setReaderState(null);
              setDirectQuizParams(null);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'quiz' && !showSettings
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'quiz' && !showSettings ? 'bg-emerald-500/10' : ''}`}>
              <BrainCircuit className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Quiz</span>
          </button>

          {/* 4. Exam */}
          <button
            onClick={() => {
              setActiveTab('exam');
              setShowSettings(false);
              setReaderState(null);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'exam' && !showSettings
                ? 'text-indigo-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeTab === 'exam' && !showSettings ? 'bg-indigo-500/10' : ''}`}>
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Exam</span>
          </button>

          {eslceAvailable && (
            /* 5. ESLCE */
            <button
              onClick={() => {
                setActiveTab('eslce');
                setShowSettings(false);
                setReaderState(null);
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'eslce' && !showSettings
                  ? 'text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-xl ${activeTab === 'eslce' && !showSettings ? 'bg-amber-500/10' : ''}`}>
                <School className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">ESLCE</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};