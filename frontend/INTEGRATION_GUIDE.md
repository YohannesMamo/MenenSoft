# Integration Guide: Highlighting System

This guide explains how to integrate the new highlighting and bookmark system into the StudyPage.

## 📁 New Files Created

### Backend
1. `backend/models/TextHighlight.py` - Highlight data model
2. `backend/models/StudyBookmark.py` - Bookmark data model
3. `backend/routes/highlights.py` - API endpoints for highlights and bookmarks
4. `backend/scripts/create_highlight_tables.py` - Database migration script

### Frontend
1. `frontend/src/components/HighlightToolbar.tsx` - Color picker toolbar for creating highlights
2. `frontend/src/components/HighlightsPanel.tsx` - Panel for viewing/managing highlights
3. `frontend/src/components/BookmarksPanel.tsx` - Panel for viewing/managing bookmarks
4. `frontend/src/hooks/useTextSelection.ts` - Custom hook for detecting text selection

## 🔧 Integration Steps

### Step 1: Run Database Migration
```bash
cd backend
python -m scripts.create_highlight_tables
```

### Step 2: Import New Components in StudyPage.tsx
Add these imports at the top of the file:
```tsx
import HighlightToolbar from './HighlightToolbar';
import HighlightsPanel from './HighlightsPanel';
import BookmarksPanel from './BookmarksPanel';
import { useTextSelection } from '../hooks/useTextSelection';
```

### Step 3: Add Highlight/Bookmark State
Add these state variables to the component:
```tsx
// ==================== HIGHLIGHT STATE ====================
const [showHighlightToolbar, setShowHighlightToolbar] = useState(false);
const [activeHighlight, setActiveHighlight] = useState<any>(null);
const [activeBookmarksTab, setActiveBookmarksTab] = useState(false);
const { selection, clearSelection } = useTextSelection();
```

### Step 4: Add API Functions
Add these functions to handle highlight operations:
```tsx
const createHighlight = async (color: string) => {
  if (!selection || !activeSection) return;
  try {
    const token = localStorage.getItem('token');
    const studentId = localStorage.getItem('studentId');
    const response = await fetch('/api/highlights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        studentId,
        stbId,
        chapterId: activeSection.chapterId,
        sectionId: activeSection.sectionId,
        pageNumber: currentPage,
        textContent: selection.text,
        highlightColor: color,
      })
    });
    if (response.ok) {
      showNotification('Highlight saved!', 'success');
    }
  } catch (error) {
    console.error('Failed to create highlight:', error);
    showNotification('Failed to save highlight', 'error');
  }
  clearSelection();
  setShowHighlightToolbar(false);
};

const createBookmark = async (type: string = 'basic') => {
  if (!activeSection) return;
  try {
    const token = localStorage.getItem('token');
    const studentId = localStorage.getItem('studentId');
    const response = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        studentId,
        stbId,
        chapterId: activeSection.chapterId,
        sectionId: activeSection.sectionId,
        pageNumber: currentPage,
        bookmarkType: type,
      })
    });
    if (response.ok) {
      showNotification('Bookmark added!', 'success');
    }
  } catch (error) {
    console.error('Failed to create bookmark:', error);
    showNotification('Failed to save bookmark', 'error');
  }
};

const handleNavigateToHighlight = (chapterId: number, sectionId: string, pageNumber: number) => {
  const section = chapters
    .flatMap(ch => ch.sections)
    .find(s => s.chapterId === chapterId && s.sectionId === sectionId);
  if (section) {
    setActiveSection(section);
    goToPage(pageNumber);
    setShowHelpersPanel(false);
  }
};

const handleNavigateToBookmark = (chapterId: number, sectionId: string, pageNumber: number) => {
  handleNavigateToHighlight(chapterId, sectionId, pageNumber);
};
```

### Step 5: Add UI Components
Add these components inside the main return statement (near the PdfViewer):

#### After PdfViewer:
```tsx
{showHighlightToolbar && selection && (
  <>
    <div className="fixed inset-0 z-40" onClick={() => {
      setShowHighlightToolbar(false);
      clearSelection();
    }} />
    <HighlightToolbar
      selectedText={selection.text}
      position={selection.position}
      onHighlight={createHighlight}
      onClose={() => {
        setShowHighlightToolbar(false);
        clearSelection();
      }}
      existingHighlight={activeHighlight}
      onUpdateHighlight={(id, color, note) => updateHighlight(id, color, note)}
      onDeleteHighlight={deleteHighlight}
    />
  </>
)}
```

#### Add to Study Helpers Panel Tabs:
Update the tab buttons to include 'highlights' and 'bookmarks':
```tsx
<button onClick={() => {
  setActiveHelperTab('highlights');
  setActiveBookmarksTab(false);
}} className={`px-2 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
  activeHelperTab === 'highlights' && !activeBookmarksTab 
    ? 'bg-indigo-50 text-indigo-600 border-t border-x border-slate-200' 
    : 'text-slate-500 hover:text-slate-700'
}`}>
  📝 Highlights
</button>
<button onClick={() => {
  setActiveHelperTab('bookmarks');
  setActiveBookmarksTab(true);
}} className={`px-2 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
  activeBookmarksTab 
    ? 'bg-indigo-50 text-indigo-600 border-t border-x border-slate-200' 
    : 'text-slate-500 hover:text-slate-700'
}`}>
  🔖 Bookmarks
</button>
```

#### Add Panel Content:
Add these conditions in the panel content area:
```tsx
{activeHelperTab === 'highlights' && !activeBookmarksTab && (
  <HighlightsPanel
    studentId={localStorage.getItem('studentId') || ''}
    stbId={stbId || ''}
    activeSection={activeSection}
    onNavigateToHighlight={handleNavigateToHighlight}
  />
)}

{activeBookmarksTab && (
  <BookmarksPanel
    studentId={localStorage.getItem('studentId') || ''}
    stbId={stbId || ''}
    onNavigateToBookmark={handleNavigateToBookmark}
  />
)}
```

### Step 6: Add Button to Trigger Highlight Toolbar
Add a button near the PDF viewer controls or in the toolbar that shows when text is selected:
```tsx
{selection && selection.text && (
  <button
    onClick={() => setShowHighlightToolbar(true)}
    className="fixed bottom-20 right-8 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors z-50 flex items-center gap-2"
  >
    <span>🎨</span> Highlight
  </button>
)}
```

### Step 7: Add Bookmark Button
Add a bookmark button near the PDF controls:
```tsx
<button
  onClick={() => createBookmark('basic')}
  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
  title="Add Bookmark"
>
  <Bookmark size={20} />
</button>
```

## 🎨 Visual Design

### Highlight Colors
- 🟡 **Yellow** (#FEF08A) - Key concepts
- 🔵 **Blue** (#93C5FD) - Definitions/formulas
- 🟢 **Green** (#86EFAC) - Examples/applications
- 🔴 **Red** (#FCA5A5) - Points to review
- 🟣 **Purple** (#C4B5FD) - Personal reflections

### Bookmark Types
- 📌 **Basic** - General bookmark
- ❓ **Review** - Marked for review
- 💡 **Important** - Important content
- 🎯 **Testable** - Quiz/exam material

## ✨ Features

### Text Selection & Highlighting
1. Select any text in the PDF
2. Click "Highlight" button that appears
3. Choose a color and optionally add a note
4. Highlight is saved and visible in Highlights panel

### Highlights Panel
- View all highlights by section or all
- Filter by color
- Navigate to highlight location
- Edit or delete highlights
- Add notes to existing highlights

### Bookmarks Panel
- View all bookmarks
- Filter by type
- Navigate to bookmark location
- Change bookmark type
- Add notes

### Keyboard Shortcuts
- Select text → Highlight button appears
- Press Escape → Clear selection
- Click outside → Close toolbar

## 🔍 Testing

1. Start the backend server
2. Start the frontend dev server
3. Navigate to Study page
4. Select a section to study
5. Try selecting text in the PDF
6. Create a highlight with a color and note
7. Check the Highlights panel in Study Helpers
8. Try creating a bookmark
9. Check the Bookmarks panel

## 📝 API Endpoints

### Highlights
- `POST /api/highlights` - Create highlight
- `GET /api/highlights/{studentId}` - Get all highlights for student
- `GET /api/highlights/{studentId}/section/{sectionId}` - Get highlights for section
- `PUT /api/highlights/{highlightId}` - Update highlight
- `DELETE /api/highlights/{highlightId}` - Delete highlight

### Bookmarks
- `POST /api/bookmarks` - Create bookmark
- `GET /api/bookmarks/{studentId}` - Get all bookmarks for student
- `GET /api/bookmarks/{studentId}/section/{sectionId}` - Get bookmarks for section
- `PUT /api/bookmarks/{bookmarkId}` - Update bookmark
- `DELETE /api/bookmarks/{bookmarkId}` - Delete bookmark