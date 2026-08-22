from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.TextHighlight import TextHighlight
from models.StudyBookmark import StudyBookmark
from datetime import datetime
import uuid

router = APIRouter()

class HighlightCreateRequest(BaseModel):
    studentId: str
    stbId: str
    chapterId: int
    sectionId: str
    pageNumber: int
    textContent: str
    highlightColor: str = 'yellow'
    note: str | None = None

class HighlightUpdateRequest(BaseModel):
    highlightColor: str | None = None
    note: str | None = None

class BookmarkCreateRequest(BaseModel):
    studentId: str
    stbId: str
    chapterId: int
    sectionId: str
    pageNumber: int
    bookmarkType: str = 'basic'
    note: str | None = None

class BookmarkUpdateRequest(BaseModel):
    bookmarkType: str | None = None
    note: str | None = None

@router.post("/api/highlights")
def create_highlight(request: HighlightCreateRequest, db: Session = Depends(get_db)):
    highlight = TextHighlight(
        HighlightID=uuid.uuid4(),
        StudentID=request.studentId,
        STBID=request.stbId,
        ChapterID=request.chapterId,
        SectionID=request.sectionId,
        PageNumber=request.pageNumber,
        TextContent=request.textContent,
        HighlightColor=request.highlightColor,
        Note=request.note,
        CreatedAt=datetime.now(),
        UpdatedAt=datetime.now()
    )
    db.add(highlight)
    db.commit()
    db.refresh(highlight)
    
    return {
        "success": True,
        "highlight": {
            "highlightId": str(highlight.HighlightID),
            "studentId": highlight.StudentID,
            "stbId": highlight.STBID,
            "chapterId": highlight.ChapterID,
            "sectionId": highlight.SectionID,
            "pageNumber": highlight.PageNumber,
            "textContent": highlight.TextContent,
            "highlightColor": highlight.HighlightColor,
            "note": highlight.Note,
            "createdAt": highlight.CreatedAt.isoformat()
        }
    }

@router.get("/api/highlights/{studentId}")
def get_highlights(studentId: str, stbId: str | None = None, chapterId: int | None = None, db: Session = Depends(get_db)):
    query = db.query(TextHighlight).filter(TextHighlight.StudentID == studentId)
    
    if stbId:
        query = query.filter(TextHighlight.STBID == stbId)
    if chapterId:
        query = query.filter(TextHighlight.ChapterID == chapterId)
    
    highlights = query.order_by(TextHighlight.CreatedAt.desc()).all()
    
    return {
        "success": True,
        "highlights": [
            {
                "highlightId": str(h.HighlightID),
                "studentId": h.StudentID,
                "stbId": h.STBID,
                "chapterId": h.ChapterID,
                "sectionId": h.SectionID,
                "pageNumber": h.PageNumber,
                "textContent": h.TextContent,
                "highlightColor": h.HighlightColor,
                "note": h.Note,
                "createdAt": h.CreatedAt.isoformat()
            }
            for h in highlights
        ]
    }

@router.get("/api/highlights/{studentId}/section/{sectionId}")
def get_highlights_by_section(studentId: str, sectionId: str, db: Session = Depends(get_db)):
    highlights = db.query(TextHighlight).filter(
        TextHighlight.StudentID == studentId,
        TextHighlight.SectionID == sectionId
    ).order_by(TextHighlight.PageNumber, TextHighlight.CreatedAt).all()
    
    return {
        "success": True,
        "highlights": [
            {
                "highlightId": str(h.HighlightID),
                "studentId": h.StudentID,
                "stbId": h.STBID,
                "chapterId": h.ChapterID,
                "sectionId": h.SectionID,
                "pageNumber": h.PageNumber,
                "textContent": h.TextContent,
                "highlightColor": h.HighlightColor,
                "note": h.Note,
                "createdAt": h.CreatedAt.isoformat()
            }
            for h in highlights
        ]
    }

@router.put("/api/highlights/{highlightId}")
def update_highlight(highlightId: str, request: HighlightUpdateRequest, db: Session = Depends(get_db)):
    highlight = db.query(TextHighlight).filter(TextHighlight.HighlightID == highlightId).first()
    
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    
    if request.highlightColor:
        highlight.HighlightColor = request.highlightColor
    if request.note is not None:
        highlight.Note = request.note
    
    highlight.UpdatedAt = datetime.now()
    db.commit()
    db.refresh(highlight)
    
    return {
        "success": True,
        "highlight": {
            "highlightId": str(highlight.HighlightID),
            "studentId": highlight.StudentID,
            "stbId": highlight.STBID,
            "chapterId": highlight.ChapterID,
            "sectionId": highlight.SectionID,
            "pageNumber": highlight.PageNumber,
            "textContent": highlight.TextContent,
            "highlightColor": highlight.HighlightColor,
            "note": highlight.Note,
            "createdAt": highlight.CreatedAt.isoformat(),
            "updatedAt": highlight.UpdatedAt.isoformat()
        }
    }

@router.delete("/api/highlights/{highlightId}")
def delete_highlight(highlightId: str, db: Session = Depends(get_db)):
    highlight = db.query(TextHighlight).filter(TextHighlight.HighlightID == highlightId).first()
    
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    
    db.delete(highlight)
    db.commit()
    
    return {"success": True, "message": "Highlight deleted successfully"}

@router.post("/api/bookmarks")
def create_bookmark(request: BookmarkCreateRequest, db: Session = Depends(get_db)):
    bookmark = StudyBookmark(
        BookmarkID=uuid.uuid4(),
        StudentID=request.studentId,
        STBID=request.stbId,
        ChapterID=request.chapterId,
        SectionID=request.sectionId,
        PageNumber=request.pageNumber,
        BookmarkType=request.bookmarkType,
        Note=request.note,
        CreatedAt=datetime.now(),
        UpdatedAt=datetime.now()
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    
    return {
        "success": True,
        "bookmark": {
            "bookmarkId": str(bookmark.BookmarkID),
            "studentId": bookmark.StudentID,
            "stbId": bookmark.STBID,
            "chapterId": bookmark.ChapterID,
            "sectionId": bookmark.SectionID,
            "pageNumber": bookmark.PageNumber,
            "bookmarkType": bookmark.BookmarkType,
            "note": bookmark.Note,
            "createdAt": bookmark.CreatedAt.isoformat()
        }
    }

@router.get("/api/bookmarks/{studentId}")
def get_bookmarks(studentId: str, stbId: str | None = None, chapterId: int | None = None, db: Session = Depends(get_db)):
    query = db.query(StudyBookmark).filter(StudyBookmark.StudentID == studentId)
    
    if stbId:
        query = query.filter(StudyBookmark.STBID == stbId)
    if chapterId:
        query = query.filter(StudyBookmark.ChapterID == chapterId)
    
    bookmarks = query.order_by(StudyBookmark.CreatedAt.desc()).all()
    
    return {
        "success": True,
        "bookmarks": [
            {
                "bookmarkId": str(b.BookmarkID),
                "studentId": b.StudentID,
                "stbId": b.STBID,
                "chapterId": b.ChapterID,
                "sectionId": b.SectionID,
                "pageNumber": b.PageNumber,
                "bookmarkType": b.BookmarkType,
                "note": b.Note,
                "createdAt": b.CreatedAt.isoformat()
            }
            for b in bookmarks
        ]
    }

@router.get("/api/bookmarks/{studentId}/section/{sectionId}")
def get_bookmarks_by_section(studentId: str, sectionId: str, db: Session = Depends(get_db)):
    bookmarks = db.query(StudyBookmark).filter(
        StudyBookmark.StudentID == studentId,
        StudyBookmark.SectionID == sectionId
    ).order_by(StudyBookmark.PageNumber, StudyBookmark.CreatedAt).all()
    
    return {
        "success": True,
        "bookmarks": [
            {
                "bookmarkId": str(b.BookmarkID),
                "studentId": b.StudentID,
                "stbId": b.STBID,
                "chapterId": b.ChapterID,
                "sectionId": b.SectionID,
                "pageNumber": b.PageNumber,
                "bookmarkType": b.BookmarkType,
                "note": b.Note,
                "createdAt": b.CreatedAt.isoformat()
            }
            for b in bookmarks
        ]
    }

@router.put("/api/bookmarks/{bookmarkId}")
def update_bookmark(bookmarkId: str, request: BookmarkUpdateRequest, db: Session = Depends(get_db)):
    bookmark = db.query(StudyBookmark).filter(StudyBookmark.BookmarkID == bookmarkId).first()
    
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    if request.bookmarkType:
        bookmark.BookmarkType = request.bookmarkType
    if request.note is not None:
        bookmark.Note = request.note
    
    bookmark.UpdatedAt = datetime.now()
    db.commit()
    db.refresh(bookmark)
    
    return {
        "success": True,
        "bookmark": {
            "bookmarkId": str(bookmark.BookmarkID),
            "studentId": bookmark.StudentID,
            "stbId": bookmark.STBID,
            "chapterId": bookmark.ChapterID,
            "sectionId": bookmark.SectionID,
            "pageNumber": bookmark.PageNumber,
            "bookmarkType": bookmark.BookmarkType,
            "note": bookmark.Note,
            "createdAt": bookmark.CreatedAt.isoformat(),
            "updatedAt": bookmark.UpdatedAt.isoformat()
        }
    }

@router.delete("/api/bookmarks/{bookmarkId}")
def delete_bookmark(bookmarkId: str, db: Session = Depends(get_db)):
    bookmark = db.query(StudyBookmark).filter(StudyBookmark.BookmarkID == bookmarkId).first()
    
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    db.delete(bookmark)
    db.commit()
    
    return {"success": True, "message": "Bookmark deleted successfully"}