/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sqliteDb } from './db';
import type { SectionBreakdownItem } from './types';

export const EVALUATION_THRESHOLDS = {
  EXAM_PASS_PERCENTAGE: 50,
  QUIZ_WEAK_SECTION_PERCENTAGE: 60,
  ESLCE_SUBJECT_PASS_SCALED: 350,
  ESLCE_MAX_SCALED: 700,
  MAX_PERCENTAGE: 100
};

export class EvaluationService {
  /**
   * Computes percentage score capped strictly at 100.
   * Score = (correct / total) * 100, capped at 100.
   */
  public static computePercentageScore(correct: number, total: number): number {
    if (total <= 0) return 0;
    const raw = (correct / total) * 100;
    return Math.min(EVALUATION_THRESHOLDS.MAX_PERCENTAGE, Math.max(0, Math.round(raw)));
  }

  /**
   * Converts raw score to linear approximation scaled score (0–700 scale) for ESLCE.
   * Formula: scaled = (raw / total) * 700, capped at 700. Labeled "Estimated" in UI.
   */
  public static computeEslceScaledScore(rawScore: number, totalQuestions: number): number {
    if (totalQuestions <= 0) return 0;
    const scaled = (rawScore / totalQuestions) * EVALUATION_THRESHOLDS.ESLCE_MAX_SCALED;
    return Math.min(EVALUATION_THRESHOLDS.ESLCE_MAX_SCALED, Math.max(0, Math.round(scaled)));
  }

  /**
   * Checks if an exam score meets the 50% pass threshold.
   */
  public static isExamPassed(percentage: number): boolean {
    return percentage >= EVALUATION_THRESHOLDS.EXAM_PASS_PERCENTAGE;
  }

  /**
   * Checks if an ESLCE subject score meets the 350/700 threshold.
   */
  public static isEslceSubjectPassed(scaledScore: number): boolean {
    return scaledScore >= EVALUATION_THRESHOLDS.ESLCE_SUBJECT_PASS_SCALED;
  }

  /**
   * Checks if a section score qualifies as weak (< 60%).
   */
  public static isWeakSection(percentage: number): boolean {
    return percentage < EVALUATION_THRESHOLDS.QUIZ_WEAK_SECTION_PERCENTAGE;
  }

  /**
   * Checks how many times the student has missed a question in question_history.
   * Returns warning if missed 3 or more times.
   */
  public static getQuestionFeedback(questionId: string | number): {
    missedCount: number;
    hasWarning: boolean;
    feedbackText: string | null;
  } {
    const missedCount = sqliteDb.getMissedCountForQuestion(questionId);
    if (missedCount >= 3) {
      return {
        missedCount,
        hasWarning: true,
        feedbackText: `⚠️ You've missed this question ${missedCount} times! Carefully review the rule and explanation.`
      };
    } else if (missedCount > 0) {
      return {
        missedCount,
        hasWarning: false,
        feedbackText: `Notice: Missed in ${missedCount} prior session${missedCount > 1 ? 's' : ''}.`
      };
    }
    return {
      missedCount: 0,
      hasWarning: false,
      feedbackText: null
    };
  }

  /**
   * Builds section-by-section breakdown for exams.
   */
  public static buildExamBreakdown(
    questions: {
      question: { section_id?: string; chapter_id?: number };
      options: { option_id?: string; record_id?: string; is_correct: number }[];
    }[],
    userAnswers: Record<string | number, string>
  ): SectionBreakdownItem[] {
    const sectionMap = new Map<string, { total: number; correct: number }>();

    questions.forEach((qItem, idx) => {
      const q = qItem.question;
      const secId = q.section_id || `Section 1.${(idx % 3) + 1}`;
      const selected = userAnswers[idx] || userAnswers[String(idx)];
      const correctOption = qItem.options.find(o => o.is_correct === 1);
      const correctId = correctOption?.record_id || correctOption?.option_id;
      const isCorrect = !!(selected && correctId && selected === correctId);

      const current = sectionMap.get(secId) || { total: 0, correct: 0 };
      current.total += 1;
      if (isCorrect) current.correct += 1;
      sectionMap.set(secId, current);
    });

    const breakdown: SectionBreakdownItem[] = [];
    sectionMap.forEach((val, secId) => {
      const percentage = Math.min(100, Math.round((val.correct / val.total) * 100));
      breakdown.push({
        section_id: secId,
        section_title: `Unit Section: ${secId}`,
        total_questions: val.total,
        correct_count: val.correct,
        percentage,
        is_weak: percentage < EVALUATION_THRESHOLDS.QUIZ_WEAK_SECTION_PERCENTAGE
      });
    });

    return breakdown;
  }
}
