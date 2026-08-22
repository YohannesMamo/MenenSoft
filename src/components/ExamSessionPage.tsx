// src/components/ExamSessionPage.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ExamSession from './ExamSession';

const ExamSessionPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, mode } = location.state || {};

  if (!sessionId || !mode) {
    // Redirect to dashboard if no session data
    navigate('/dashboard');
    return null;
  }

  const handleExamComplete = (result: any) => {
    // You can show results here or navigate to a results page
    console.log('Exam completed:', result);
    navigate('/dashboard');
  };

  return (
    <ExamSession 
      sessionId={sessionId} 
      mode={mode} 
      onExamComplete={handleExamComplete} 
    />
  );
};

export default ExamSessionPage;
