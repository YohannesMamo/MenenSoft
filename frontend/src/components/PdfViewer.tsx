// PdfViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { highlightPlugin,type  HighlightArea } from '@react-pdf-viewer/highlight';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import type { RenderHighlightTargetProps } from '@react-pdf-viewer/highlight';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import * as pdfjsLib from 'pdfjs-dist';

const viewerStyles = `
  .rpv-core__page {
    margin-bottom: 20px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
  }
  .rpv-core__page:last-child {
    margin-bottom: 0 !important;
  }
`;

export interface HighlightData {
  content: string;
  areas: HighlightArea[];
  pageIndex: number;
}

interface PdfViewerProps {
  fileUrl: string;
  scale?: number;
  onLoad?: (pageCount: number) => void;
  onPageChange?: (pageNumber: number) => void;
  onError?: (error: string) => void;
  onTextSelection?: (text: string, highlightAreas: any[], pageNumber: number) => void;
  onRenderHighlightTarget?: (props: RenderHighlightTargetProps) => React.ReactElement;
  highlights?: HighlightData[];
}

export interface PdfViewerRef {
  jumpToPage: (pageIndex: number) => void;
  getCurrentPageText: () => Promise<string>;
  getPageText: (pageIndex: number) => Promise<string>;
  getCurrentPage: () => number;
  getCurrentPageNumber: () => number;
  getTotalPages: () => number;
  getScale: () => number;
}

const PdfViewer = React.forwardRef<PdfViewerRef, PdfViewerProps>(({
  fileUrl,
  scale = 1.1,
  onLoad,
  onPageChange,
  onTextSelection,
  onRenderHighlightTarget,
}, ref) => {
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [currentScale, setCurrentScale] = useState(scale);
  const zoomPluginRef = useRef<any>(null);
  const docRef = useRef<any>(null);
  const docUrlRef = useRef<string | null>(null);

  const pageNavigationPluginInstance = pageNavigationPlugin();
  const { jumpToPage } = pageNavigationPluginInstance;

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: onRenderHighlightTarget,
    onTextSelection: (props: any) => {
      console.log('[PdfViewer] Text selected:', props.text, 'on page', props.pageIndex);
      if (onTextSelection && props.text) {
        onTextSelection(props.text, props.areas, props.pageIndex + 1);
      }
    },
  } as any);

  const zoomPluginInstance = zoomPlugin();
  zoomPluginRef.current = zoomPluginInstance;

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const getPdfDocument = async () => {
    try {
      if (!fileUrl) return null;
      if (docRef.current && docUrlRef.current === fileUrl) return docRef.current;
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
      const doc = await loadingTask.promise;
      docRef.current = doc;
      docUrlRef.current = fileUrl;
      return doc;
    } catch (err) {
      console.error('[PdfViewer] Failed to load PDF document:', err);
      return null;
    }
  };

  const extractPageText = async (pageNumber: number): Promise<string> => {
    try {
      const doc = await getPdfDocument();
      if (!doc) return '';
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items as any[]) {
        if (item && item.str) {
          text += item.str;
          text += item.hasEOL ? '\n' : ' ';
        }
      }
      return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    } catch (err) {
      console.error(`[PdfViewer] Failed to extract text from page ${pageNumber}:`, err);
      return '';
    }
  };

  React.useImperativeHandle(ref, () => ({
    jumpToPage: (pageIndex: number) => {
      jumpToPage(pageIndex);
    },
    getCurrentPageText: async () => extractPageText(currentPageNumber),
    getPageText: async (pageIndex: number) => extractPageText(pageIndex + 1),
    getCurrentPageNumber: () => currentPageNumber,
    getCurrentPage: () => currentPageNumber,
    getTotalPages: () => totalPages,
    getScale: () => currentScale,
  }), [currentPageNumber, totalPages, currentScale, jumpToPage, fileUrl]);

  const handleDocumentLoad = (e: any) => {
    setTotalPages(e.doc.numPages);
    if (onLoad) {
      onLoad(e.doc.numPages);
    }
  };

  const handlePageChange = (e: any) => {
    const page = e.currentPage + 1;
    setCurrentPageNumber(page);
    if (onPageChange) {
      onPageChange(page);
    }
  };

  useEffect(() => {
    if (zoomPluginRef.current && scale !== currentScale) {
      console.log('[PdfViewer] Zooming to:', scale);
      zoomPluginRef.current.zoomTo(scale);
      setCurrentScale(scale);
    }
  }, [scale]);

  useEffect(() => {
    if (scale !== currentScale) {
      setCurrentScale(scale);
    }
  }, [scale]);

  useEffect(() => {
    return () => {
      if (docRef.current && docRef.current.destroy) {
        docRef.current.destroy();
      }
      docRef.current = null;
      docUrlRef.current = null;
    };
  }, [fileUrl]);

  return (
    <div className="pdf-viewer-container h-full flex flex-col bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden shadow-inner">
      <style>{viewerStyles}</style>
      <div className="flex-1 overflow-hidden relative">
        <Worker workerUrl="/pdf.worker.min.js">
          <Viewer
            key={`${fileUrl}-${currentScale}`}
            fileUrl={fileUrl}
            plugins={[
              pageNavigationPluginInstance,
              highlightPluginInstance,
              zoomPluginInstance,
              defaultLayoutPluginInstance
            ]}
            onDocumentLoad={handleDocumentLoad}
            onPageChange={handlePageChange}
            defaultScale={currentScale}
            theme="light"
          />
        </Worker>
      </div>
    </div>
  );
});

export default PdfViewer;