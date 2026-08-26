/**
 * Offline Mode Context
 * Provides online/offline mode switching and manages the offline database lifecycle.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { isContentLoaded, loadBundledJsonContent } from '../services/contentLoader';
import { ensureInitialized, getTextbooks, getOverviewStats } from '../services/offlineDb';

interface OfflineContextType {
  isOfflineMode: boolean;
  isContentReady: boolean;
  isLoadingContent: boolean;
  loadError: string | null;
  gradeId: string;
  enableOfflineMode: (gradeId: string) => Promise<void>;
  disableOfflineMode: () => void;
  textbooks: any[];
  stats: any;
  refreshStats: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
  isOfflineMode: false,
  isContentReady: false,
  isLoadingContent: false,
  loadError: null,
  gradeId: 'HIG12A',
  enableOfflineMode: async () => {},
  disableOfflineMode: () => {},
  textbooks: [],
  stats: {},
  refreshStats: async () => {},
});

export function useOfflineMode() {
  return useContext(OfflineContext);
}

interface OfflineProviderProps {
  children?: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gradeId, setGradeId] = useState('HIG12A');
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  const refreshStats = useCallback(async () => {
    if (!isOfflineMode || !isContentReady) return;
    try {
      const s = await getOverviewStats(gradeId);
      setStats(s);
    } catch (e) {
      console.error('Failed to refresh stats:', e);
    }
  }, [isOfflineMode, isContentReady, gradeId]);

  const enableOfflineMode = useCallback(async (selectedGradeId: string) => {
    setIsLoadingContent(true);
    setLoadError(null);
    try {
      setGradeId(selectedGradeId);
      await ensureInitialized();

      const hasContent = await isContentLoaded();
      if (!hasContent) {
        // Load bundled JSON content
        await loadBundledJsonContent(selectedGradeId);
      }

      const tb = await getTextbooks(selectedGradeId);
      setTextbooks(tb);
      setIsContentReady(true);
      setIsOfflineMode(true);

      const s = await getOverviewStats(selectedGradeId);
      setStats(s);

      localStorage.setItem('offlineMode', 'true');
      localStorage.setItem('offlineGrade', selectedGradeId);
    } catch (error: any) {
      console.error('Failed to enable offline mode:', error);
      setLoadError(error.message || 'Failed to load content');
      throw error;
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  const disableOfflineMode = useCallback(() => {
    setIsOfflineMode(false);
    setIsContentReady(false);
    setTextbooks([]);
    setStats({});
    localStorage.removeItem('offlineMode');
    localStorage.removeItem('offlineGrade');
  }, []);

  // Auto-enter offline mode for bundled APKs (built with VITE_OFFLINE_BUILD=true).
  // Also restore previously-enabled offline mode from localStorage.
  useEffect(() => {
    // Bundled mode: VITE_OFFLINE_BUILD is set at build time
    if (import.meta.env.VITE_OFFLINE_BUILD === 'true') {
      const savedGrade = localStorage.getItem('offlineGrade') || 'HIG12A';
      enableOfflineMode(savedGrade).catch(console.error);
      return;
    }

    // Online mode: restore previously-enabled offline mode if user chose it
    const wasOffline = localStorage.getItem('offlineMode');
    const savedGrade = localStorage.getItem('offlineGrade');
    if (wasOffline === 'true' && savedGrade) {
      enableOfflineMode(savedGrade).catch(console.error);
    }
  }, []);

  return (
    <OfflineContext.Provider value={{
      isOfflineMode,
      isContentReady,
      isLoadingContent,
      loadError,
      gradeId,
      enableOfflineMode,
      disableOfflineMode,
      textbooks,
      stats,
      refreshStats,
    }}>
      {children ?? <Outlet />}
    </OfflineContext.Provider>
  );
}
