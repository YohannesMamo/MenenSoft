// src/constants/metricDefinitions.ts

export interface MetricDefinition {
  id: string;
  name: string;
  shortDescription: string;  // NEW: for tooltips
  longDescription: string;    // replaces 'description'
  icon: string;
  calculation: string;
  interpretation: {
    high: string;
    medium: string;
    low: string;
  };
  example: string;
  howToImprove: string[];
  color: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  consistency: {
    id: 'consistency',
    name: 'Consistency',
    shortDescription: 'How regular and steady your study habits are',
    longDescription: 'Measures how stable and predictable your performance is across different study sessions. High consistency means you perform similarly well each time.',
    icon: 'Battery',
    calculation: 'Based on the standard deviation of your quiz scores. Lower variation in scores means higher consistency.',
    interpretation: {
      high: 'Excellent! You maintain steady performance. Your study habits are working well.',
      medium: 'Good, but there are some ups and downs. Try to study at the same time each day.',
      low: 'Your scores vary a lot. Set a regular study schedule to build consistency.'
    },
    example: 'Student A: 70%, 72%, 71% → High consistency. Student B: 45%, 85%, 60% → Low consistency.',
    howToImprove: [
      'Set a fixed daily study time (e.g., 7 PM every night)',
      'Create a quiet, distraction-free study space',
      'Take short breaks every 25-30 minutes',
      'Review notes before each study session'
    ],
    color: 'blue'
  },
  accuracy: {
    id: 'accuracy',
    name: 'Accuracy',
    shortDescription: 'How often you get answers correct',
    longDescription: 'The percentage of questions you answer correctly across all quizzes and exams.',
    icon: 'Target',
    calculation: '(Number of correct answers ÷ Total questions) × 100',
    interpretation: {
      high: 'Outstanding! You have strong command of the material.',
      medium: 'Solid understanding. Focus on problem areas to improve further.',
      low: 'Review fundamentals. Master basic concepts before advancing.'
    },
    example: 'Answering 18 out of 20 questions correctly = 90% accuracy.',
    howToImprove: [
      'Review study materials before taking quizzes',
      'Take notes while studying and review them',
      'Practice with flashcards on weak topics',
      'Ask teachers for clarification on confusing concepts'
    ],
    color: 'green'
  },
  responseTime: {
    id: 'responseTime',
    name: 'Response Speed',
    shortDescription: 'Average time to answer each question',
    longDescription: 'The average time you take to answer each question. Faster doesn\'t always mean better - balance speed with accuracy.',
    icon: 'Clock',
    calculation: 'Total quiz time ÷ Number of questions answered',
    interpretation: {
      high: 'Very fast! Make sure you are not rushing through questions.',
      medium: 'Good pace. You\'re thinking through answers appropriately.',
      low: 'Taking too long. Review material before quizzing.'
    },
    example: 'Completing 20 questions in 8 minutes = 24 seconds per question.',
    howToImprove: [
      'Take practice quizzes under timed conditions',
      'Skip difficult questions and come back later',
      'Read questions carefully but avoid overthinking',
      'Study more to reduce hesitation on answers'
    ],
    color: 'purple'
  },
  completion: {
    id: 'completion',
    name: 'Completion Rate',
    shortDescription: 'How many quizzes you finish once started',
    longDescription: 'The percentage of quizzes you complete after starting them. Abandoning quizzes means missed learning opportunities.',
    icon: 'BarChart3',
    calculation: '(Completed quizzes ÷ Total quizzes started) × 100',
    interpretation: {
      high: 'Excellent commitment! You see things through.',
      medium: 'Good but sometimes abandon quizzes. Push through difficult questions.',
      low: 'Often leave quizzes unfinished. Try shorter quizzes first.'
    },
    example: 'Starting 10 quizzes and finishing 9 = 90% completion rate.',
    howToImprove: [
      'Start with shorter quizzes (5-10 questions)',
      'Set a goal to finish every quiz you start',
      'Take a break if frustrated, then return',
      'Remember: incomplete quizzes don\'t help learning'
    ],
    color: 'orange'
  },
  mastery: {
    id: 'mastery',
    name: 'Mastery',
    shortDescription: 'Your cumulative understanding across subjects',
    longDescription: 'A weighted average of your performance. Harder questions count more toward your mastery score.',
    icon: 'Brain',
    calculation: 'Weighted average where hard questions count 3x, medium 2x, easy 1x',
    interpretation: {
      high: 'Ready for exams! Focus on review and advanced topics.',
      medium: 'Solid progress. Keep studying actively.',
      low: 'Building foundation. Master basics before moving on.'
    },
    example: 'Scoring well on hard questions increases mastery faster than easy ones.',
    howToImprove: [
      'Master easy topics first, then tackle hard ones',
      'Use spaced repetition for better retention',
      'Teach concepts to someone else',
      'Take practice exams under real conditions'
    ],
    color: 'indigo'
  },
  improvement: {
    id: 'improvement',
    name: 'Improvement Rate',
    shortDescription: 'How much your scores increase daily',
    longDescription: 'The average daily change in your quiz scores. Positive numbers mean you\'re getting better!',
    icon: 'TrendingUp',
    calculation: 'Average daily score improvement over the last 7 days',
    interpretation: {
      high: 'Excellent growth! You\'re learning efficiently.',
      medium: 'Steady progress. Keep the momentum.',
      low: 'Slower improvement. Try different study methods.'
    },
    example: 'Score 60% today and 64% tomorrow = 4% improvement rate.',
    howToImprove: [
      'Track your weak areas and focus on them',
      'Study in shorter, more frequent sessions',
      'Use active recall instead of passive reading',
      'Get feedback on your mistakes'
    ],
    color: 'emerald'
  },
  risk: {
    id: 'risk',
    name: 'Risk Level',
    shortDescription: 'Likelihood of falling behind',
    longDescription: 'A combined score predicting your chance of falling behind if no action is taken. Lower is better.',
    icon: 'Gauge',
    calculation: 'Combines consistency (30%), accuracy (20%), mastery (30%), and completion (20%)',
    interpretation: {
      high: 'Low risk (0-40%). You\'re on the right track!',
      medium: 'Medium risk (41-69%). Pay attention to weak areas.',
      low: 'High risk (70-100%). Immediate action recommended.'
    },
    example: 'Low consistency + low accuracy + low mastery = High risk.',
    howToImprove: [
      'Address low-scoring metrics first',
      'Create a weekly study schedule',
      'Set small, achievable daily goals',
      'Ask for help when stuck'
    ],
    color: 'rose'
  }
};