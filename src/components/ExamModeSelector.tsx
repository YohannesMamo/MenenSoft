import React from 'react';

interface ExamModeSelectorProps {
  onModeSelect: (mode: 'practice' | 'exam') => void;
  sectionInfo: { textbookId: string; chapterId: number; sectionId: string; questionCount: number };
}

const ExamModeSelector: React.FC<ExamModeSelectorProps> = ({ onModeSelect, sectionInfo }) => {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Ready to Start?</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Section {sectionInfo.sectionId} • {sectionInfo.questionCount} Questions
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Practice Mode */}
        <div 
          onClick={() => onModeSelect('practice')}
          className="bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-900 hover:border-green-500 rounded-3xl p-8 cursor-pointer transition-all hover:shadow-xl dark:shadow-gray-800/50 group"
        >
          <div className="text-green-600 dark:text-green-400 text-5xl mb-6">📚</div>
          <h3 className="text-2xl font-semibold mb-3 group-hover:text-green-600 dark:text-white">Practice Mode</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Get immediate feedback and explanations after every question.<br />
            <strong>Best for learning and improvement.</strong>
          </p>
          <div className="text-green-600 dark:text-green-400 font-medium">Start Learning →</div>
        </div>

        {/* Exam Mode */}
        <div 
          onClick={() => onModeSelect('exam')}
          className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-900 hover:border-blue-500 rounded-3xl p-8 cursor-pointer transition-all hover:shadow-xl dark:shadow-gray-800/50 group"
        >
          <div className="text-blue-600 dark:text-blue-400 text-5xl mb-6">📝</div>
          <h3 className="text-2xl font-semibold mb-3 group-hover:text-blue-600 dark:text-white">Exam Mode</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No feedback until the end.<br />
            Full exam experience with final score and detailed review.
          </p>
          <div className="text-blue-600 dark:text-blue-400 font-medium">Test Yourself →</div>
        </div>
      </div>
    </div>
  );
};

export default ExamModeSelector;