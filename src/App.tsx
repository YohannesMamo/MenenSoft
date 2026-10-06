// App.tsx - ADD CHANGE PASSWORD ROUTE
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AuthManager from './components/AuthManager';
import Seo from './components/Seo';

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
import DownloadsPage from './components/DownloadsPage';
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
import PaymentPage from './components/PaymentPage';

import SettingsPage from './components/SettingsPage';
import { EvaluationProvider } from './context/EvaluationContext';

// Offline Mode (native APK shell)
import OfflineAppRoot from './offline/OfflineAppRoot';

function App() {
  const { loading } = useAuth();
  const isOfflineBuild = import.meta.env.VITE_OFFLINE_BUILD === 'true';

  if (loading && !isOfflineBuild) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>{isOfflineBuild ? (
      <OfflineAppRoot />
    ) : (
    <ChatProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<><Seo
          title="Menen Student Assistant — Ethiopian High School Study, Quiz & ESLCE Exam Prep"
          description="Menen is the Ethiopian high school learning platform. Study full subject notes, practice quizzes, take ESLCE & national exam past papers, and track your progress—online or fully offline."
          path="/" /><LandingPage /></>} />
        <Route path="/about" element={<><Seo
          title="About — Menen Student Assistant"
          description="Learn about Menen Student Assistant — our mission, vision, values, contact information, and how to reach us in Addis Ababa, Ethiopia."
          path="/about" /><About /></>} />
        <Route path="/downloads" element={<><Seo
          title="Download the App — Menen Student Assistant APKs"
          description="Download the Menen OSHS Android app for free: offline APKs for Grade 9, 10, 11 and 12, plus the online app for every grade. Study Ethiopian high school notes with or without internet."
          path="/downloads" /><DownloadsPage /></>} />
        
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
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/settings" element={<SettingsPage />} />

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
    )}</>
  );
}

export default App;