import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface MetricDef {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  icon: string;
  color: string;
  unit: string;
  calculation: string;
  interpretation: { high: string; medium: string; low: string };
  example: string;
  howToImprove: string[];
}

export interface ScoreThreshold {
  min?: number;
  max?: number;
  label: string;
  color: string;
}

export interface LetterGrade {
  grade: string;
  min: number;
  color: string;
  label: string;
}

export interface StatusLabel {
  id: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  riskRange: { min?: number; max?: number };
}

export interface EslceGrade {
  grade: string;
  min: number;
  label: string;
}

export interface EvaluationConfig {
  metric_definitions: { metrics: MetricDef[] };
  score_thresholds: Record<string, { high: ScoreThreshold; medium: ScoreThreshold; low: ScoreThreshold }>;
  letter_grades: { grades: LetterGrade[]; passThreshold: number; description: string };
  status_labels: { statuses: StatusLabel[]; defaultStatus: string };
  risk_formula: {
    baseScore: number;
    penalties: Array<{ metric: string; condition: string; threshold: number; add: number; description: string }>;
    cap: number;
    description: string;
  };
  eslce_config: {
    passThreshold: number;
    gradeScale: EslceGrade[];
    scoreColors: Array<{ min: number; color: string; label: string }>;
    description: string;
  };
  report_sections: {
    sections: Array<{ id: string; title: string; description: string; icon: string; order: number }>;
  };
}

interface EvalCtx {
  config: EvaluationConfig | null;
  loading: boolean;
  getMetricDef: (id: string) => MetricDef | undefined;
  getLetterGrade: (pct: number) => LetterGrade;
  getScoreLabel: (value: number, metricId?: string) => ScoreThreshold;
  getStatusForRisk: (riskPct: number) => StatusLabel;
  getEslceGrade: (pct: number) => EslceGrade;
}

const EvaluationContext = createContext<EvalCtx | undefined>(undefined);

export const useEvaluation = () => {
  const ctx = useContext(EvaluationContext);
  if (!ctx) throw new Error('useEvaluation must be used within EvaluationProvider');
  return ctx;
};

export const EvaluationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<EvaluationConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/evaluation/config`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setConfig(await res.json());
      } catch (e) {
        console.error('[EvalConfig] Failed to load:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getMetricDef = (id: string) =>
    config?.metric_definitions?.metrics?.find(m => m.id === id);

  const getLetterGrade = (pct: number): LetterGrade => {
    const grades = config?.letter_grades?.grades;
    if (!grades) return { grade: 'N/A', min: 0, color: 'slate', label: 'No Data' };
    for (const g of grades) {
      if (pct >= g.min) return g;
    }
    return grades[grades.length - 1];
  };

  const getScoreLabel = (value: number, metricId = 'default'): ScoreThreshold => {
    const t = config?.score_thresholds?.[metricId] || config?.score_thresholds?.['default'];
    if (!t) return { label: 'N/A', color: 'slate' };
    if (metricId === 'responseTime') {
      if (value <= (t.high.max ?? 15)) return t.high;
      if (value <= (t.medium.max ?? 30)) return t.medium;
      return t.low;
    }
    if (metricId === 'improvement') {
      if (value >= (t.high.min ?? 2)) return t.high;
      if (value >= (t.medium.min ?? 1)) return t.medium;
      return t.low;
    }
    if (metricId === 'risk') {
      if (value <= (t.high.max ?? 40)) return t.high;
      if (value <= (t.medium.max ?? 69)) return t.medium;
      return t.low;
    }
    if (value >= (t.high.min ?? 80)) return t.high;
    if (value >= (t.medium.min ?? 60)) return t.medium;
    return t.low;
  };

  const getStatusForRisk = (riskPct: number): StatusLabel => {
    const statuses = config?.status_labels?.statuses;
    if (!statuses) return { id: 'OnTrack', label: 'On Track', description: '', color: 'emerald', icon: 'CheckCircle', riskRange: {} };
    for (const s of statuses) {
      const r = s.riskRange;
      if (r.max !== undefined && riskPct < r.max * 100) return s;
      if (r.min !== undefined && riskPct >= r.min * 100) {
        const nextMax = statuses.indexOf(s) < statuses.length - 1 ? statuses[statuses.indexOf(s) + 1]?.riskRange?.min : undefined;
        if (nextMax === undefined || riskPct < nextMax * 100) return s;
      }
    }
    return statuses[statuses.length - 1];
  };

  const getEslceGrade = (pct: number): EslceGrade => {
    const scale = config?.eslce_config?.gradeScale;
    if (!scale) return { grade: 'N/A', min: 0, label: 'No Data' };
    for (const g of scale) {
      if (pct >= g.min) return g;
    }
    return scale[scale.length - 1];
  };

  return (
    <EvaluationContext.Provider value={{ config, loading, getMetricDef, getLetterGrade, getScoreLabel, getStatusForRisk, getEslceGrade }}>
      {children}
    </EvaluationContext.Provider>
  );
};
