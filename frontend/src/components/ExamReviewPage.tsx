import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trophy, X, ChevronRight } from 'lucide-react';
import { ChemicalText } from '../lib/chemical';
import { RichText } from '../lib/content';

interface ReviewItem {
  questionText: string;
  yourAnswer: string;
  yourAnswerText: string;
  yourExplanation: string;
  correctAnswer: string;
  correctAnswerText: string;
  correctExplanation: string;
  isCorrect: boolean;
}

const ExamReviewPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions = [], answers = {}, sectionInfo } = location.state || {};
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);

  const normalize = (val: any) => val ? val.toString().trim().toUpperCase() : "";

  const review: ReviewItem[] = (questions || []).map((q: any) => {
    try {
      const selectedOptionLabel = answers?.[q.questionID];
      const options = Array.isArray(q.options) ? q.options : [];

      const selectedOpt = options.find((o: any) =>
        normalize(o.optionLabel) === normalize(selectedOptionLabel)
      );

      const correctOpt = options.find((o: any) => o.iCorrect === true || o.isCorrect === true);
      const correctOptionLabel = correctOpt?.optionLabel || q.correctOption;
      const isCorrect = normalize(selectedOptionLabel) === normalize(correctOptionLabel);

      return {
        questionText: q.qText || "Missing question text",
        yourAnswer: selectedOptionLabel || "Not answered",
        yourAnswerText: selectedOpt?.optionText || "",
        yourExplanation: selectedOpt?.opExplanation || selectedOpt?.OpExplanation || q.qExplanation || "",
        correctAnswer: correctOptionLabel || "?",
        correctAnswerText: correctOpt?.optionText || "",
        correctExplanation: correctOpt?.opExplanation || correctOpt?.OpExplanation || q.qExplanation || "",
        isCorrect,
      };
    } catch (err) {
      console.error("Error processing question", err);
      return {
        questionText: "Error loading question",
        yourAnswer: "",
        yourAnswerText: "",
        yourExplanation: "",
        correctAnswer: "",
        correctAnswerText: "",
        correctExplanation: "",
        isCorrect: false,
      };
    }
  });

  const correctCount = review.filter((r: ReviewItem) => r.isCorrect).length;
  const totalQuestions = questions.length;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const closePopup = () => setSelectedQuestion(null);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Score Header */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow dark:shadow-gray-800/50 p-10 mb-10 text-center">
        <Trophy className="h-20 w-20 text-amber-500 dark:text-amber-400 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-2 dark:text-white">Exam Review</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{sectionInfo?.textbookName} • Chapter {sectionInfo?.chapterId}</p>

        <div className="flex justify-center gap-12 text-3xl font-semibold dark:text-white">
          <div>Score: <span className="text-indigo-600 dark:text-indigo-400">{correctCount}</span> / {totalQuestions}</div>
          <div className={percentage >= 80 ? 'text-green-600 dark:text-green-400' : percentage >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}>
            {percentage}%
          </div>
        </div>
      </div>

      {/* Question Cards Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Quick Review</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {review.map((item: ReviewItem, index: number) => (
            <button
              key={index}
              onClick={() => setSelectedQuestion(index)}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 cursor-pointer text-left ${
                item.isCorrect
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 hover:border-green-500'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 hover:border-red-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-300">{index + 1}</span>
                {item.isCorrect ? (
                  <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">✓</span>
                ) : (
                  <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">✗</span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2"><RichText text={item.questionText} /></p>
              <ChevronRight className="absolute bottom-2 right-2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Detailed View Button */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Detailed Review</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Click any question card above to view detailed explanation</p>
      </div>

      {/* Popup Modal */}
      {selectedQuestion !== null && review[selectedQuestion] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl dark:shadow-gray-800/50">
            {/* Popup Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {review[selectedQuestion].isCorrect ? (
                  <span className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">✓</span>
                ) : (
                  <span className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white">✗</span>
                )}
                <div>
                  <h3 className="font-bold text-lg dark:text-white">Question {selectedQuestion + 1}</h3>
                  <span className={review[selectedQuestion].isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {review[selectedQuestion].isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
              </div>
              <button
                onClick={closePopup}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Popup Content */}
            <div className="p-6">
              {/* Question Text */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Question:</h4>
                <p className="text-lg text-gray-800 dark:text-gray-300 leading-relaxed">
                  <RichText text={review[selectedQuestion].questionText} />
                </p>
              </div>

              {/* Your Answer */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Your Answer:</h4>
                <div className={`p-4 rounded-xl ${
                  review[selectedQuestion].isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <p className={`font-medium ${
                    review[selectedQuestion].isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                  }`}>
                    {review[selectedQuestion].yourAnswer}. <RichText text={review[selectedQuestion].yourAnswerText} />
                  </p>
                </div>
              </div>

              {/* Feedback */}
              {review[selectedQuestion].isCorrect ? (
                /* CORRECT ANSWER FEEDBACK */
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border-l-4 border-green-600">
                  <p className="font-semibold text-green-700 dark:text-green-400 mb-2">✓ Your answer is correct!</p>
                  <div className="text-green-700 dark:text-green-400 leading-relaxed">
                    {review[selectedQuestion].yourExplanation || 'Great job! Your understanding is correct.'}
                  </div>
                </div>
              ) : (
                /* INCORRECT ANSWER FEEDBACK */
                <div className="space-y-4">
                  {/* Your Answer Explanation */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5 border-l-4 border-red-600">
                    <p className="font-semibold text-red-700 dark:text-red-400 mb-2">✗ Not Correct</p>
                    <p className="text-red-700 dark:text-red-400 leading-relaxed">
                      {review[selectedQuestion].yourExplanation || 'Your answer needs review.'}
                    </p>
                  </div>

                  {/* Correct Answer */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border-l-4 border-green-600">
                    <p className="font-semibold text-green-700 dark:text-green-400 mb-2">✓ Correct Answer:</p>
                    <p className="text-green-800 dark:text-green-400 font-medium mb-3">
                      {review[selectedQuestion].correctAnswer}. {review[selectedQuestion].correctAnswerText}
                    </p>
                      <div className="text-green-700 dark:text-green-400 leading-relaxed">
                        <ChemicalText text={review[selectedQuestion].correctExplanation || 'No detailed explanation available.'} />
                      </div>
                  </div>

                  {/* Learning Tip */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border-l-4 border-amber-500">
                    <p className="font-semibold text-amber-800 dark:text-amber-400 mb-2">💡 Learning Tip:</p>
                    <p className="text-amber-700 dark:text-amber-400 leading-relaxed">
                      Review why the correct answer is right and understand where your answer differs.
                      Focus on understanding the underlying concept rather than just memorizing the answer.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Arrows */}
            <div className="border-t dark:border-gray-700 px-6 py-4 flex justify-between">
              <button
                onClick={() => setSelectedQuestion(Math.max(0, selectedQuestion - 1))}
                disabled={selectedQuestion === 0}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-gray-500 dark:text-gray-400">
                {selectedQuestion + 1} / {review.length}
              </span>
              <button
                onClick={() => setSelectedQuestion(Math.min(review.length - 1, selectedQuestion + 1))}
                disabled={selectedQuestion === review.length - 1}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex justify-center gap-4 mt-8">
        <button 
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 border border-gray-300 dark:border-gray-700 rounded-2xl font-medium dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Back to Dashboard
        </button>
       <button 
  onClick={() => {
    window.dispatchEvent(new CustomEvent('openExamSelector'));
  }}
  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-medium hover:bg-indigo-700"
>
  Take Another Exam
</button>
      </div>
    </div>
  );
};

export default ExamReviewPage;
