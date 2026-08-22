/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { 
  Activity, 
  Brain, 
  ChevronRight, 
  Zap,
  TrendingUp,
  Clock,
  Target,
  ShieldCheck,
  AlertCircle,
  MoreHorizontal,
  X,
  BookOpen,
  Calculator,
  Lightbulb,
  Battery,
  BarChart3,
  Gauge,
  AlertTriangle,
  CheckCircle,
  
} from 'lucide-react';
import { motion } from 'motion/react';
import { METRIC_DEFINITIONS } from '../constants/metricDefinitions';

// --- TYPES ---
export interface BehaviorMetrics {
  accuracy: number;
  avgResponseTimeSeconds: number;
  consistency: number;
  completionRate: number;
  learningGain: number;
}

export interface ProgressMetrics {
  totalStudyHours: number;
  avgExamScore: number;
  overallMasteryPercent: number;
  improvementRatePerDay: number;
  totalSessionsCompleted: number;
}

export interface LearningState {
  studentId: string;
  status: 'OnTrack' | 'AtRisk' | 'HighRisk';
  behavior: BehaviorMetrics;
  progress: ProgressMetrics;
  computedSignals: {
    riskScore: number;
    velocity: string;
    stability: string;
  };
}

export interface Recommendation {
  type: string;
  topic: string;
  priority: number;
}

export interface InterventionData {
  studentId: string;
  riskLevel: string;
  signals: {
    lowConsistency: boolean;
    slowResponse: boolean;
    lowMastery: boolean;
  };
  recommendations: Recommendation[];
}

// =====================================================
// METRIC DETAIL MODAL COMPONENT
// =====================================================

interface MetricDetailModalProps {
  metricId: string;
  currentValue: number | null;
  onClose: () => void;
}

function MetricDetailModal({ metricId, currentValue, onClose }: MetricDetailModalProps) {
  const metric = METRIC_DEFINITIONS[metricId];
  
  if (!metric) return null;

  const getInterpretationText = () => {
    if (currentValue === null) return 'Complete more quizzes to see your score';
    
    if (metricId === 'responseTime') {
      if (currentValue < 15) return metric.interpretation.high;
      if (currentValue <= 30) return metric.interpretation.medium;
      return metric.interpretation.low;
    }
    
    if (metricId === 'improvement') {
      if (currentValue > 2) return metric.interpretation.high;
      if (currentValue >= 1) return metric.interpretation.medium;
      return metric.interpretation.low;
    }

    if (metricId === 'risk') {
      if (currentValue <= 40) return metric.interpretation.high;
      if (currentValue <= 69) return metric.interpretation.medium;
      return metric.interpretation.low;
    }

    if (currentValue >= 80) return metric.interpretation.high;
    if (currentValue >= 60) return metric.interpretation.medium;
    return metric.interpretation.low;
  };

  const getStatusColor = () => {
    if (currentValue === null) return 'text-slate-400';
    if (metricId === 'responseTime') {
      if (currentValue < 15) return 'text-emerald-600';
      if (currentValue <= 30) return 'text-blue-600';
      return 'text-amber-600';
    }
    if (metricId === 'risk') {
      if (currentValue <= 40) return 'text-emerald-600';
      if (currentValue <= 69) return 'text-amber-600';
      return 'text-rose-600';
    }
    if (currentValue >= 80) return 'text-emerald-600';
    if (currentValue >= 60) return 'text-blue-600';
    return 'text-amber-600';
  };

  const renderIcon = (iconName: string) => {
    const iconProps = { className: "w-5 h-5" };
    switch (iconName) {
      case 'Battery': return <Battery {...iconProps} />;
      case 'Target': return <Target {...iconProps} />;
      case 'Clock': return <Clock {...iconProps} />;
      case 'BarChart3': return <BarChart3 {...iconProps} />;
      case 'Brain': return <Brain {...iconProps} />;
      case 'TrendingUp': return <TrendingUp {...iconProps} />;
      case 'Gauge': return <Gauge {...iconProps} />;
      default: return <Activity {...iconProps} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex-shrink-0 bg-${metric.color}-50 dark:bg-${metric.color}-900/30 border-b border-${metric.color}-100 dark:border-gray-700 p-6 rounded-t-3xl`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-${metric.color}-100 dark:bg-${metric.color}-900/40 rounded-xl text-${metric.color}-600 dark:text-${metric.color}-400`}>
                {renderIcon(metric.icon)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{metric.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{metric.longDescription}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-black/20 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl p-4 text-center">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Your Current Score</p>
              {currentValue !== null ? (
                <>
                  <p className={`text-5xl font-black ${getStatusColor()} mt-2`}>
                    {metricId === 'responseTime' ? `${currentValue}s` : `${currentValue}%`}
                  </p>
                  <p className={`text-sm font-medium mt-2 ${getStatusColor()}`}>
                    {getInterpretationText()}
                  </p>
                </>
              ) : (
                <p className="text-slate-400 dark:text-slate-500 mt-2">No data yet. Complete more quizzes!</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider">What It Means</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{metric.longDescription}</p>
            </div>

            <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider">How It's Calculated</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{metric.calculation}</p>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-indigo-900 dark:text-indigo-200 uppercase text-xs tracking-wider">Real Example</h3>
              </div>
              <p className="text-sm text-indigo-800 dark:text-indigo-300">{metric.example}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider">Score Guide</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">80-100%</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{metric.interpretation.high}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <span className="font-medium text-blue-700 dark:text-blue-300">60-79%</span>
                  <span className="text-blue-600 dark:text-blue-400">{metric.interpretation.medium}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                  <span className="font-medium text-amber-700 dark:text-amber-300">0-59%</span>
                  <span className="text-amber-600 dark:text-amber-400">{metric.interpretation.low}</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-amber-900 dark:text-amber-300 uppercase text-xs tracking-wider">How to Improve</h3>
              </div>
              <ul className="space-y-2">
                {metric.howToImprove.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                    <span className="text-amber-500">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-slate-100 dark:border-gray-700 p-4 bg-slate-50 dark:bg-gray-800 rounded-b-3xl">
          <button onClick={onClose} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// BENTO CARD WITH THREE-DOT MENU
// =====================================================

interface BentoCardWithMenuProps {
  children: React.ReactNode;
  className?: string;
  metricId?: string;
  onInfoClick?: (metricId: string) => void;
}

function BentoCardWithMenu({ children, className = "", metricId, onInfoClick }: BentoCardWithMenuProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-[2.5rem] p-6 shadow-sm relative group ${className}`}
    >
      {metricId && onInfoClick && (
        <button
          onClick={() => onInfoClick(metricId)}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-50 dark:hover:bg-gray-800 z-10"
          title="Learn about this metric"
        >
          <MoreHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      )}
      {children}
    </motion.div>
  );
}

// =====================================================
// MAIN DASHBOARD COMPONENT
// =====================================================

export default function StudentStatusDashboard() {
  const [data, setData] = useState<LearningState | null>(null);
  const [interventions, setInterventions] = useState<InterventionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
 const handleInfoClick = (metricId: string) => {
    setSelectedMetric(metricId);
  };

  
  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const [stateRes, interRes] = await Promise.all([
          fetch(`${API_BASE}/api/students/learning-state`, { headers }),
          fetch(`${API_BASE}/api/students/interventions`, { headers })
        ]);

        if (!stateRes.ok || !interRes.ok) throw new Error('API connection failed');

        const stateData = await stateRes.json();
        const interData = await interRes.json();

        setData(stateData);
        setInterventions(interData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown Error');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [API_BASE]);

  // const handleInfoClick = (metricId: string) => {
  //   setSelectedMetric(metricId);
  // };


  // Helper function to format percentage (handles both 0-1 and 0-100 inputs)
  const formatPercentage = (value: number | undefined): number => {
    if (value === undefined) return 0;
    // If value is greater than 1, assume it's already a percentage (0-100)
    // Otherwise, multiply by 100
    return value > 1 ? Math.round(value) : Math.round(value * 100);
  };

  // Helper for decimal values (ensures 0-1 range)
  const normalizeDecimal = (value: number | undefined): number => {
    if (value === undefined) return 0;
    return value > 1 ? value / 100 : value;
  };

  const getCurrentMetricValue = (metricId: string): number | null => {
    if (!data) return null;
    switch(metricId) {
      case 'consistency': return formatPercentage(data.behavior?.consistency);
      case 'accuracy': return formatPercentage(data.behavior?.accuracy);
      case 'responseTime': return data.behavior?.avgResponseTimeSeconds ?? null;
      case 'completion': return formatPercentage(data.behavior?.completionRate);
      case 'mastery': return formatPercentage(data.progress?.overallMasteryPercent);
      case 'improvement': return data.progress?.improvementRatePerDay ?? null;
      case 'risk': return data.computedSignals?.riskScore ? Math.round(data.computedSignals.riskScore * 100) : null;
      default: return null;
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorView message={error} />;
  if (!data) return null;


// Info Button Component for individual metrics
// Add this after your existing component imports and before your main component
function InfoButton({ metricId, onInfoClick }: { metricId: string; onInfoClick: (id: string) => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onInfoClick(metricId);
      }}
      className="inline-flex items-center justify-center w-4 h-4 ml-1.5 rounded-full bg-slate-200 dark:bg-gray-700 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
      title="Learn more"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    </button>
  );
}
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 text-slate-900 dark:text-white font-sans p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
              <Brain className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Student Diagnostic Hub
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
              Data synchronized with your ASP.NET Backend
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 px-4 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active_Session</span>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{data?.studentId ?? 'NO_SESSION'}</span>
            </div>
          </div>
        </header>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[160px] gap-6">
          
          {/* Risk Gauge Card */}
          <BentoCardWithMenu 
            className="md:col-span-4 md:row-span-2 flex flex-col justify-between overflow-hidden"
            metricId="risk"
            onInfoClick={handleInfoClick}
          >
            <div className="flex justify-between items-start">
              <Label text="HEALTH_STATE" />
              <StatusBadge status={data?.status ?? 'OnTrack'} />
            </div>
            <div className="mt-4">
              <div className="text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
                {Math.round(data.computedSignals.riskScore * 100)}<span className="text-2xl text-slate-300 dark:text-slate-600 ml-1">%</span>
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-tight">System Risk Index</p>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-gray-700">
              <Indicator label="Velocity" value={data.computedSignals.velocity} />
              <Indicator label="Stability" value={data.computedSignals.stability} />
            </div>
          </BentoCardWithMenu>

          {/* Behavior Metrics Card - Fixed */}
         {/* Behavior Metrics Card */}
<div className="md:col-span-5 md:row-span-2 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-xl overflow-hidden rounded-[2.5rem] p-6 relative">
  <div className="flex items-center gap-2 mb-6">
    <Activity className="w-4 h-4 text-white/70" />
    <Label text="BEHAVIOR METRICS" className="text-white/70" />
  </div>
  <div className="space-y-5">
    {/* Consistency with Info Button */}
    <div>
      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-tight mb-1">
        <div className="flex items-center">
          <span className="text-white/60">Consistency</span>
          <InfoButton metricId="consistency" onInfoClick={handleInfoClick} />
        </div>
        <span className="text-white">{Math.round(normalizeDecimal(data?.behavior?.consistency))}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-white/20">
        <div className="h-full rounded-full bg-white" style={{ width: `${Math.round(normalizeDecimal(data?.behavior?.consistency) * 100)}%` }} />
      </div>
    </div>

    {/* Accuracy with Info Button */}
    <div>
      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-tight mb-1">
        <div className="flex items-center">
          <span className="text-white/60">Accuracy</span>
          <InfoButton metricId="accuracy" onInfoClick={handleInfoClick} />
        </div>
        <span className="text-white">{Math.round(normalizeDecimal(data?.behavior?.accuracy) * 100)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-white/20">
        <div className="h-full rounded-full bg-white" style={{ width: `${Math.round(normalizeDecimal(data?.behavior?.accuracy) * 100)}%` }} />
      </div>
    </div>

    {/* Completion Rate with Info Button */}
    <div>
      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-tight mb-1">
        <div className="flex items-center">
          <span className="text-white/60">Completion Rate</span>
          <InfoButton metricId="completion" onInfoClick={handleInfoClick} />
        </div>
        <span className="text-white">{Math.round(normalizeDecimal(data?.behavior?.completionRate) * 100)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-white/20">
        <div className="h-full rounded-full bg-white" style={{ width: `${Math.round(normalizeDecimal(data?.behavior?.completionRate) * 100)}%` }} />
      </div>
    </div>

    {/* Response Speed with Info Button */}
    <div className="flex justify-between items-center pt-2">
      <div className="flex items-center">
        <span className="text-[10px] uppercase font-bold text-white/60">Response Speed</span>
        <InfoButton metricId="responseTime" onInfoClick={handleInfoClick} />
      </div>
      <span className="text-sm font-bold text-white">{data?.behavior?.avgResponseTimeSeconds ?? 0}s</span>
    </div>
  </div>
</div>

          {/* Mastery Card - Fixed */}
       {/* Mastery Card - WITH INFO BUTTON (NO three-dot menu) */}
{/* Mastery Card - WITH INFO BUTTON */}
<div className="md:col-span-3 md:row-span-1 bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-center gap-1">
  <div className="flex items-center justify-between">
    <Label text="DOMAIN MASTERY" />
    <InfoButton metricId="mastery" onInfoClick={handleInfoClick} />
  </div>
  <div className="flex items-baseline gap-2">
    <span className="text-5xl font-black">
      {formatPercentage(data?.progress?.overallMasteryPercent)}%
    </span>
    <TrendingUp className="w-5 h-5 text-emerald-500" />
  </div>
  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Weighted average score</p>
</div>

          {/* Quick Stats Card - Fixed */}
          {/* Quick Stats Card - WITH INDIVIDUAL INFO BUTTONS (NO three-dot menu) */}
<div className="md:col-span-3 md:row-span-1 bg-slate-900 text-white rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-center">
  <div className="space-y-3">
    {/* Avg Exam Score */}
    <div className="flex justify-between items-center bg-white/10 rounded-xl px-3 py-2">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold uppercase text-white/50">Avg Exam Score</span>
        <InfoButton metricId="mastery" onInfoClick={handleInfoClick} />
      </div>
      <span className="text-sm font-bold">{formatPercentage(data?.progress?.avgExamScore)}%</span>
    </div>
    
    {/* Study Hours */}
    <div className="flex justify-between items-center px-3 py-1">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold uppercase text-white/50">Study Hours</span>
        <InfoButton metricId="improvement" onInfoClick={handleInfoClick} />
      </div>
      <span className="text-sm font-bold">{Math.round(data?.progress?.totalStudyHours ?? 0)} hrs</span>
    </div>
    
    {/* Sessions */}
    <div className="flex justify-between items-center px-3 py-1">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold uppercase text-white/50">Sessions</span>
        <InfoButton metricId="completion" onInfoClick={handleInfoClick} />
      </div>
      <span className="text-sm font-bold">{data?.progress?.totalSessionsCompleted ?? 0}</span>
    </div>
  </div>
</div>

          {/* Recommendations Card */}
          <BentoCardWithMenu className="md:col-span-8 md:row-span-2">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <Label text="AI RECOMMENDATIONS" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {interventions?.recommendations?.map((rec, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl group hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl flex items-center justify-center font-black text-xs text-slate-400 dark:text-slate-500">
                      0{rec.priority}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{rec.type}</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{rec.topic}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </div>
              ))}
              {(!interventions?.recommendations || interventions.recommendations.length === 0) && (
                <div className="col-span-full py-10 flex flex-col items-center justify-center opacity-40">
                  <ShieldCheck className="w-10 h-10 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No Alerts Detected</p>
                </div>
              )}
            </div>
          </BentoCardWithMenu>

          {/* Critical Signals Card - FIXED with all 4 items */}
         {/* Critical Signals Card - WITH INDIVIDUAL INFO BUTTONS */}
<div className="md:col-span-4 md:row-span-2 flex flex-col gap-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-[2.5rem] p-6 shadow-sm">
  <div className="flex items-center justify-between mb-2">
    <Label text="CRITICAL SIGNALS" />
  </div>

  {/* Consistency Gap Signal */}
  <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
    interventions?.signals?.lowConsistency ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-gray-800 border-slate-100 dark:border-gray-700'
  }`}>
    <div className="flex items-center gap-2">
      {interventions?.signals?.lowConsistency ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
      ) : (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
      )}
      <span className={`text-[11px] font-bold uppercase tracking-tight ${
        interventions?.signals?.lowConsistency ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'
      }`}>
        Consistency Gap
      </span>
      <InfoButton metricId="consistency" onInfoClick={handleInfoClick} />
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-xs font-bold ${interventions?.signals?.lowConsistency ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {Math.round(data?.behavior?.consistency)}%  
      </span>
      <div className={`w-2 h-2 rounded-full ${interventions?.signals?.lowConsistency ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
    </div>
  </div>

  {/* Response Latency Signal */}
  <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
    interventions?.signals?.slowResponse ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-gray-800 border-slate-100 dark:border-gray-700'
  }`}>
    <div className="flex items-center gap-2">
      {interventions?.signals?.slowResponse ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
      ) : (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
      )}
      <span className={`text-[11px] font-bold uppercase tracking-tight ${
        interventions?.signals?.slowResponse ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'
      }`}>
        Response Latency
      </span>
      <InfoButton metricId="responseTime" onInfoClick={handleInfoClick} />
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-xs font-bold ${interventions?.signals?.slowResponse ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {data?.behavior?.avgResponseTimeSeconds ?? 0}s
      </span>
      <div className={`w-2 h-2 rounded-full ${interventions?.signals?.slowResponse ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
    </div>
  </div>

  {/* Mastery Floor Signal */}
  <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
    interventions?.signals?.lowMastery ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-gray-800 border-slate-100 dark:border-gray-700'
  }`}>
    <div className="flex items-center gap-2">
      {interventions?.signals?.lowMastery ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
      ) : (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
      )}
      <span className={`text-[11px] font-bold uppercase tracking-tight ${
        interventions?.signals?.lowMastery ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'
      }`}>
        Mastery Floor
      </span>
      <InfoButton metricId="mastery" onInfoClick={handleInfoClick} />
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-xs font-bold ${interventions?.signals?.lowMastery ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {formatPercentage(data?.progress?.overallMasteryPercent)}%
      </span>
      <div className={`w-2 h-2 rounded-full ${interventions?.signals?.lowMastery ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
    </div>
  </div>

  {/* Accuracy Alert Signal */}
  <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
    (data?.behavior?.accuracy ?? 0) < 0.6 ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-gray-800 border-slate-100 dark:border-gray-700'
  }`}>
    <div className="flex items-center gap-2">
      {(data?.behavior?.accuracy ?? 0) < 0.6 ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
      ) : (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
      )}
      <span className={`text-[11px] font-bold uppercase tracking-tight ${
        (data?.behavior?.accuracy ?? 0) < 0.6 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'
      }`}>
        Accuracy Alert
      </span>
      <InfoButton metricId="accuracy" onInfoClick={handleInfoClick} />
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-xs font-bold ${(data?.behavior?.accuracy ?? 0) < 0.6 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {formatPercentage(data?.behavior?.accuracy)}%
      </span>
      <div className={`w-2 h-2 rounded-full ${(data?.behavior?.accuracy ?? 0) < 0.6 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
    </div>
  </div>

  {/* Improvement Rate Footer */}
  <div className="mt-auto p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
    <div className="flex items-center justify-between mb-1">
      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Improvement Rate</p>
      <InfoButton metricId="improvement" onInfoClick={handleInfoClick} />
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
        <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
          {data?.progress?.improvementRatePerDay?.toFixed(1) ?? 0}%/day
        </span>
      </div>
      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
        (data?.progress?.improvementRatePerDay ?? 0) > 2 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
        (data?.progress?.improvementRatePerDay ?? 0) > 1 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
        'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
      }`}>
        {(data?.progress?.improvementRatePerDay ?? 0) > 2 ? 'Fast' :
         (data?.progress?.improvementRatePerDay ?? 0) > 1 ? 'Moderate' : 'Slow'}
      </span>
    </div>
  </div>
</div>
        </div>
      </div>

      {/* Metric Detail Modal */}
      {selectedMetric && METRIC_DEFINITIONS[selectedMetric] && (
        <MetricDetailModal
          metricId={selectedMetric}
          currentValue={getCurrentMetricValue(selectedMetric)}
          onClose={() => setSelectedMetric(null)}
        />
      )}
      
    </div>
  );
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

function Label({ text, className = "" }: { text: string; className?: string }) {
  return <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 block ${className}`}>{text}</span>;
}

function StatusBadge({ status }: { status: LearningState['status'] }) {
  const configs = {
    OnTrack: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
    AtRisk: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
    HighRisk: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${configs[status]}`}>
      {status}
    </span>
  );
}

function Indicator({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-slate-50 dark:bg-gray-800 p-3 rounded-2xl border border-slate-100 dark:border-gray-700">
      <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">{label}</p>
      <p className="text-xs font-black text-slate-800 dark:text-gray-200 uppercase tracking-tight">{value}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900">
      <Activity className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900 p-6 text-center">
      <div className="max-w-md">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sync Error</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{message}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase">Retry</button>
      </div>
    </div>
  )
}
