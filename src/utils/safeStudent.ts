import { type LearningStateDto } from "../types/studentDashboard";

export function safeLearningState(data: LearningStateDto | null) {
  return {
    behavior: data?.behavior ?? {
      accuracy: 0,
      avgResponseTimeSeconds: 0,
      consistency: 0,
      completionRate: 0,
      learningGain: 0,
    },
    progress: data?.progress ?? {
      totalStudyHours: 0,
      avgExamScore: 0,
      overallMasteryPercent: 0,
      improvementRatePerDay: 0,
      totalSessionsCompleted: 0,
    },
    status: data?.status ?? "OnTrack",
    computedSignals: data?.computedSignals ?? {
      riskScore: 0,
      velocity: "Unknown",
      stability: "Unknown",
    },
  };
}