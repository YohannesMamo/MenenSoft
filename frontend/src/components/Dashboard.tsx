import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';

// Import the wizard component (put it in the same folder or adjust path)
import TextbookToQuizWizard from './TextbookToQuizWizard';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
type TextbookProgress = {
  stbId: string;
  subjectName: string;
  progressPercentage: number;
  completed: number;
  total: number;
};

type DashboardData = {
  student: {
    fullName: string;
    gradeLevel: string;
  };
  overview: {
    quizzesPassed: number;
    quizzesFailed?: number;
    examsPassed: number;
    examsFailed?: number;
    overallProgress: number;
  };
  textbookProgress: TextbookProgress[];
  recommendedAction?: string;
  motivationalMessage?: string;
};

type QuizWizardTextbook = {
  STBID: string;
  STBTitle: string;
  STBGradeID: string;
  STBSubjectID: string;
};

const CombinedDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for wizard
  const [showQuizWizard, setShowQuizWizard] = useState(false);
  const [selectedTextbookForWizard, setSelectedTextbookForWizard] = useState<QuizWizardTextbook | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Token:', token);
        if (!token) {
          setError("Session expired. Please login again.");
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_BASE}/api/dashboard`, {
  headers: { Authorization: `Bearer ${token}` }
});
        
        console.log('Dashboard response:', response.data);
        console.log('Textbook progress:', response.data.textbookProgress);
        console.log('Number of textbooks:', response.data.textbookProgress?.length);
        setData(response.data);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        setError("Unable to sync dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // New handler: Open wizard instead of direct navigation
  const handleStartQuizFlow = (book: TextbookProgress) => {
    // Create a minimal textbook object that the wizard expects
    const textbook = {
      STBID: book.stbId,
      STBTitle: book.subjectName,        // using subjectName as title for display
      STBGradeID: data?.student?.gradeLevel || '',
      STBSubjectID: '',                  // optional, can be empty
    };

    setSelectedTextbookForWizard(textbook);
    setShowQuizWizard(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      <p className="text-gray-500 font-medium">Syncing your learning progress...</p>
    </div>
  );

  if (error) return <div className="p-10 text-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 max-w-7xl mx-auto space-y-10">

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Hi, {data?.student?.fullName}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Grade {data?.student?.gradeLevel} • Your learning journey continues
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all shadow-sm"
        >
          <LogOut size={18} />
          <span className="font-semibold">Logout</span>
        </button>
      </header>

      {/* HERO + STATS — 3 equal cards in one row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Progress */}
        <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Overall Progress</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black">{data?.overview?.overallProgress}%</span>
            </div>
            <p className="text-xs text-indigo-200 mt-2 line-clamp-2">{data?.recommendedAction || "Keep up the great work!"}</p>
          </div>
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Quizzes Card */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border dark:border-gray-700 hover:shadow-md transition-all">
          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Quizzes</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600">Passed</span>
              <span className="text-2xl font-bold text-green-600">{data?.overview?.quizzesPassed ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-500">Failed</span>
              <span className="text-2xl font-bold text-red-500">{data?.overview?.quizzesFailed ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Exams Card */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border dark:border-gray-700 hover:shadow-md transition-all">
          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Exams</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600">Passed</span>
              <span className="text-2xl font-bold text-green-600">{data?.overview?.examsPassed ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-500">Failed</span>
              <span className="text-2xl font-bold text-red-500">{data?.overview?.examsFailed ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* STUDY PACK */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">My Study Pack</h2>
          <span className="text-indigo-600 font-semibold bg-indigo-50 dark:bg-indigo-900/30 px-4 py-1 rounded-full text-sm">
            {data?.textbookProgress?.length || 0} Subjects
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.textbookProgress?.map((book) => (
            <div
              key={book.stbId}
              className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {book.subjectName}
                </h3>

                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  book.progressPercentage >= 100
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {book.progressPercentage >= 100 ? "Mastered" : "Active"}
                </span>
              </div>

              <div className="mb-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">
                    {book.completed}/{book.total} sections
                  </span>
                  <span className={`font-bold ${
                    book.progressPercentage >= 70
                      ? "text-green-600"
                      : book.progressPercentage >= 30
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}>
                    {book.progressPercentage}%
                  </span>
                </div>

                <div className="w-full bg-gray-100 dark:bg-gray-700 h-4 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      book.progressPercentage >= 70
                        ? "bg-gradient-to-r from-green-400 to-green-600"
                        : book.progressPercentage >= 30
                        ? "bg-gradient-to-r from-amber-400 to-amber-600"
                        : "bg-gradient-to-r from-red-400 to-red-600"
                    }`}
                    style={{ width: `${book.progressPercentage}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/study/${book.stbId}`)}
                  className="flex-1 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold py-2.5 rounded-xl transition-all"
                >
                  Study
                </button>

                <button
                  onClick={() => handleStartQuizFlow(book)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all"
                >
                  Take Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-6">
        <p className="italic text-gray-500 dark:text-gray-400 text-lg">
          "{data?.motivationalMessage || "You are doing amazing! Keep going!"}"
        </p>
      </footer>

      {/* QUIZ WIZARD MODAL - Improved */}
        {showQuizWizard && selectedTextbookForWizard && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div 
               className="relative w-full max-w-4xl max-h-[95vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Close button inside the white box */}
              <button 
                onClick={() => setShowQuizWizard(false)}
                className="absolute top-4 right-4 z-[110] p-2 bg-white/80 hover:bg-white text-gray-500 rounded-full transition-colors shadow-sm"
              >
                <X size={24} />
              </button>
              
              <div className="flex-1 overflow-y-auto custom-scroll">
                <TextbookToQuizWizard 
                  textbook={selectedTextbookForWizard} 
                  onClose={() => setShowQuizWizard(false)}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default CombinedDashboard;
