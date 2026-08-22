import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, CheckCircle } from "lucide-react";

type Textbook = {
  stbId: string;
  subjectName: string;
  textbookTitle: string;
  total: number;
  completed: number;
  progressPercentage: number;
};

type Chapter = {
  id: number;
  title: string;
};

type Section = {
  id: string;
  title: string;
  isCompleted?: boolean;
};

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const QuizGateway = () => {
  const { stbId } = useParams();
  const navigate = useNavigate();

  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [step, setStep] = useState<"textbooks" | "chapters" | "sections">(
    stbId ? "chapters" : "textbooks"
  );
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [quizWarnings, setQuizWarnings] = useState<Record<string, boolean>>({});
  const [loadingTextbooks, setLoadingTextbooks] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const token = localStorage.getItem("token");

  // LOAD TEXTBOOKS (only when no stbId)
  useEffect(() => {
    if (stbId) return;
    const loadTextbooks = async () => {
      setLoadingTextbooks(true);
      try {
        const res = await axios.get(`${API_BASE}/api/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const books: Textbook[] = (res.data.textbookProgress || []).filter(
          (b: Textbook) => b.total > 0
        );
        setTextbooks(books);
      } catch {
        setTextbooks([]);
      } finally {
        setLoadingTextbooks(false);
      }
    };
    loadTextbooks();
  }, [stbId, token]);

  // LOAD CHAPTERS
  useEffect(() => {
    if (!stbId) return;
    const loadChapters = async () => {
      setLoadingChapters(true);
      try {
        const res = await axios.get(`${API_BASE}/api/study/chapters/${stbId}`);
        setChapters(res.data || []);
      } catch {
        setChapters([]);
      } finally {
        setLoadingChapters(false);
      }
    };
    loadChapters();
  }, [stbId]);

  // LOAD SECTIONS
  const loadSections = async (chapterId: number) => {
    const res = await axios.get(`${API_BASE}/api/study/sections/${stbId}/${chapterId}`);
    setSections(res.data || []);
  };

  // TEXTBOOK SELECTED → navigate to chapters for that textbook
  const handleTextbookSelect = (book: Textbook) => {
    setSelectedTextbook(book);
    navigate(`/quiz/${book.stbId}`, { replace: true });
  };

  // CHAPTER SELECTED → load sections
  const handleChapterSelect = async (chapterId: number) => {
    setSelectedChapter(chapterId);
    await loadSections(chapterId);
    setStep("sections");
  };

  // SECTION SELECTED → start quiz
  const startQuiz = (chapterId: number, sectionId: string, isCompleted: boolean) => {
    if (!isCompleted) {
      setQuizWarnings((prev) => ({ ...prev, [sectionId]: true }));
    }
    const effectiveStbId = stbId || selectedTextbook?.stbId || "";
    navigate(`/quiz/${effectiveStbId}/${chapterId}/${sectionId}`);
  };

  const goBack = () => {
    if (step === "sections") {
      setStep("chapters");
      setSelectedChapter(null);
      setSections([]);
      setQuizWarnings({});
    } else if (step === "chapters") {
      if (stbId) {
        navigate("/quiz", { replace: true });
      } else {
        setStep("textbooks");
      }
    }
  };

  // ============== RENDER ==============

  // TEXTBOOKS STEP
  if (step === "textbooks") {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <BookOpen size={24} /> Choose a Subject
        </h1>

        {loadingTextbooks ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading subjects...
          </div>
        ) : textbooks.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            No textbooks available.
          </div>
        ) : (
          <div className="grid gap-3">
            {textbooks.map((book) => (
              <button
                key={book.stbId}
                onClick={() => handleTextbookSelect(book)}
                className="flex items-center gap-4 p-4 border rounded-2xl dark:border-gray-700 dark:text-gray-300 hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/30 transition-all group active:scale-[0.98] shadow-sm dark:shadow-gray-800/50 hover:shadow-md text-left"
              >
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {book.stbId.split("-").pop()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 dark:text-gray-300 leading-tight">
                    {book.subjectName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {book.textbookTitle}
                  </p>
                  {book.total > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="h-1.5 flex-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${book.progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {book.completed}/{book.total}
                      </span>
                    </div>
                  )}
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // CHAPTERS STEP
  if (step === "chapters") {
    const backLabel = stbId ? "← Back to Subjects" : "← Back to Subjects";
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <button
          className="text-blue-600 dark:text-blue-400 underline flex items-center gap-1"
          onClick={goBack}
        >
          <ArrowLeft size={16} /> {backLabel}
        </button>

        <h1 className="text-2xl font-bold dark:text-white">Select a Chapter</h1>

        {loadingChapters ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading chapters...
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            No chapters found.
          </div>
        ) : (
          <div className="grid gap-3">
            {chapters.map((c) => (
              <div
                key={c.id}
                className="p-4 border rounded flex justify-between items-center dark:border-gray-700 dark:text-gray-300"
              >
                <span>{c.title}</span>
                <button
                  className="bg-indigo-600 text-white px-3 py-1 rounded"
                  onClick={() => handleChapterSelect(c.id)}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // SECTIONS STEP
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button
        className="text-blue-600 dark:text-blue-400 underline flex items-center gap-1"
        onClick={goBack}
      >
        <ArrowLeft size={16} /> ← Back to Chapters
      </button>

      <h1 className="text-2xl font-bold dark:text-white">Select a Section</h1>

      {sections.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          No sections found.
        </div>
      ) : (
        <div className="grid gap-3">
          {sections.map((s) => (
            <div key={s.id} className="space-y-2">
              <div className="p-4 border rounded flex justify-between items-center dark:border-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-3">
                  {s.isCompleted ? (
                    <CheckCircle size={18} className="text-green-500 dark:text-green-400" />
                  ) : (
                    <AlertCircle size={18} className="text-amber-500 dark:text-amber-400" />
                  )}
                  <span>{s.title}</span>
                </div>

                <button
                  className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => startQuiz(selectedChapter!, s.id, s.isCompleted || false)}
                >
                  Start Quiz
                </button>
              </div>

              {quizWarnings[s.id] && !s.isCompleted && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Tip:</strong> You haven't completed studying this section yet. For the best quiz experience, consider finishing the study material first.
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizGateway;
