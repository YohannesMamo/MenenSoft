// src/components/QuestionBank.tsx
import React, { useState, useEffect } from 'react';
import { Filter, BookOpen, Download, Eye } from 'lucide-react';
import { ChemicalText } from '../lib/chemical';
const API_BASE = import.meta.env.VITE_API_URL || '/api';
interface Question {
  id: string;
  text: string;
  subject: string;
  chapter: string;
  section: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'MCQ' | 'True/False' | 'Essay';
  year?: number;
}

const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    subject: '',
    chapter: '',
    section: '',
    difficulty: '',
    type: ''
  });
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, questions]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
        setFilteredQuestions(data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/study/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchChapters = async (subjectId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/study/chapters/${subjectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setChapters(data);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchSections = async (chapterId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/study/sections/${chapterId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSections(data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...questions];
    
    if (filters.subject) {
      filtered = filtered.filter(q => q.subject === filters.subject);
    }
    if (filters.chapter) {
      filtered = filtered.filter(q => q.chapter === filters.chapter);
    }
    if (filters.section) {
      filtered = filtered.filter(q => q.section === filters.section);
    }
    if (filters.difficulty) {
      filtered = filtered.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters.type) {
      filtered = filtered.filter(q => q.type === filters.type);
    }
    
    setFilteredQuestions(filtered);
  };

  const handleSubjectChange = (subject: string) => {
    setFilters(prev => ({ ...prev, subject: subject, chapter: '', section: '' }));
    if (subject) fetchChapters(subject);
    else setChapters([]);
  };

  const handleChapterChange = (chapter: string) => {
    setFilters(prev => ({ ...prev, chapter: chapter, section: '' }));
    if (chapter) fetchSections(chapter);
    else setSections([]);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'Hard': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Question Bank</h1>
        <p className="text-gray-600 dark:text-gray-400">Browse and practice questions from past exams and exercises</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-800/50 p-4 mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold mb-4"
        >
          <Filter className="h-5 w-5" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        {showFilters && (
          <div className="grid md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                value={filters.subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chapter</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                value={filters.chapter}
                onChange={(e) => handleChapterChange(e.target.value)}
                disabled={!filters.subject}
              >
                <option value="">All Chapters</option>
                {chapters.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Section</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                value={filters.section}
                onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
                disabled={!filters.chapter}
              >
                <option value="">All Sections</option>
                {sections.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                value={filters.difficulty}
                onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
              >
                <option value="">All Levels</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question Type</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="">All Types</option>
                <option value="MCQ">Multiple Choice</option>
                <option value="True/False">True/False</option>
                <option value="Essay">Essay</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">Found {filteredQuestions.length} questions</p>
        <button className="flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question, index) => (
            <div key={question.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-800/50 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Q{index + 1}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                    {question.difficulty}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                    {question.type}
                  </span>
                </div>
                <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                  <Eye className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-gray-800 dark:text-gray-300 mb-3"><ChemicalText text={question.text} /></p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {question.subject}
                </span>
                <span>• {question.chapter}</span>
                {question.section && <span>• {question.section}</span>}
                {question.year && <span>• {question.year}</span>}
              </div>
            </div>
          ))}

          {filteredQuestions.length === 0 && !loading && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
              <p className="text-gray-500 dark:text-gray-400">No questions found matching your criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionBank;