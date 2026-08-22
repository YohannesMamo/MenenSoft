export interface BehaviorMetricsDto {
  accuracy: number;
  avgResponseTimeSeconds: number;
  consistency: number;
  completionRate: number;
  learningGain: number;
}

export interface ProgressMetricsDto {
  totalStudyHours: number;
  avgExamScore: number;
  overallMasteryPercent: number;
  improvementRatePerDay: number;
  totalSessionsCompleted: number;
}

export interface LearningStateDto {
  studentId: string;
  status: "HighRisk" | "AtRisk" | "OnTrack";

  behavior: BehaviorMetricsDto | null;
  progress: ProgressMetricsDto | null;

  computedSignals: {
    riskScore: number;
    velocity: "Fast" | "Moderate" | "Slow" | "Unknown";
    stability: "High" | "Medium" | "Low" | "Unknown";
  };
}