// App.tsx - ADD CHANGE PASSWORD ROUTE
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AuthManager from './components/AuthManager';

import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import StudyPage from './components/StudyPage';
import QuizPage from './components/QuizPage';
import QuizGateway from './components/QuizGateway';
import ExamPage from './components/ExamPage';
import ExamSessionPage from './components/ExamSessionPage';
import PracticeExamPage from './components/PracticeExamPage';
import FormalExamPage from './components/FormalExamPage';
import ExamReviewPage from './components/ExamReviewPage';
import StudentStatusDashboard from "./components/StudentStatusDashboard";
import { ChatHub } from './components/ChatHub';
import CompleteProfile from "./components/CompleteProfile";
import About from './components/About';
import { ChatProvider } from './contexts/ChatContext';

// ESLCE Integration
import EslceExamLibrary from './components/eslce/EslceExamLibrary';
import EslceExamDetail from './components/eslce/EslceExamDetail';
import EslceExamSession from './components/eslce/EslceExamSession';
import EslcePracticeMode from './components/eslce/EslcePracticeMode';
import EslceResults from './components/eslce/EslceResults';
import EslceProgress from './components/eslce/EslceProgress';
import EslceSessionDetail from './components/eslce/EslceSessionDetail';
import StudentReportPage from './components/StudentReportPage';
import DetailedReportPage from './components/DetailedReportPage';
import { EvaluationProvider } from './context/EvaluationContext';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <ChatProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<About />} />
        
        {/* Auth Routes - All handled by AuthManager */}
        <Route path="/login" element={<AuthManager />} />
        <Route path="/register" element={<AuthManager />} />
        <Route path="/forgot-password" element={<AuthManager />} />
        <Route path="/reset-password" element={<AuthManager />} />
        <Route path="/verify-email" element={<AuthManager />} />
        
        {/* ✅ ADD THIS: Change Password Route */}
        <Route path="/change-password" element={<AuthManager />} />
        
        {/* Redirect old student registration */}
        <Route path="/student-registration" element={<Navigate to="/register" replace />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/study/:stbId/:chapterId?/:sectionId?" element={<StudyPage />} />
            <Route path="/quiz" element={<QuizGateway />} />
            <Route path="/quiz/:stbId" element={<QuizGateway />} />
            <Route path="/quiz/:stbId/:chapterId/:sectionId" element={<QuizPage />} />
            <Route path="/exam" element={<ExamPage />} />
            <Route path="/exam/session" element={<ExamSessionPage />} />
            <Route path="/exam/practice" element={<PracticeExamPage />} />
            <Route path="/exam/formal" element={<FormalExamPage />} />
            <Route path="/student-status" element={<StudentStatusDashboard />} />
            <Route path="/student-report" element={<EvaluationProvider><StudentReportPage /></EvaluationProvider>} />
            <Route path="/report-detailed" element={<EvaluationProvider><DetailedReportPage /></EvaluationProvider>} />
            <Route path="/exam-review" element={<ExamReviewPage />} />
            <Route path="/chat" element={<ChatHub />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />

            {/* ESLCE Integration Routes */}
            <Route path="/eslce" element={<EslceExamLibrary />} />
            <Route path="/eslce/:examId" element={<EslceExamDetail />} />
            <Route path="/eslce/session" element={<EslceExamSession />} />
            <Route path="/eslce/practice" element={<EslcePracticeMode />} />
            <Route path="/eslce/results" element={<EslceResults />} />
            <Route path="/eslce/progress" element={<EslceProgress />} />
            <Route path="/eslce/history/:sessionId" element={<EslceSessionDetail />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ChatProvider>
  );
}

export default App;