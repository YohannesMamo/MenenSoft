from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import os
import aiofiles
from database import get_db
from models.Message import Message
from models.MessageRead import MessageRead
from models.Conversation import Conversation
from models.ConversationParticipant import ConversationParticipant
from models.StudentInfo import StudentInfo
from fastapi import Request  # ✅ Add this import
from core.storage import CHAT_UPLOAD_DIR
from core.config import settings
from models.user import user
from routes.auth import get_current_user
from jose import JWTError, jwt
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()

# Set by init_socketio so REST handlers can broadcast over Socket.IO.
_sio = None

ALGORITHM = "HS256"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_UPLOAD_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg",
    ".pdf", ".txt", ".csv", ".rtf",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".zip", ".rar", ".7z",
    ".mp3", ".wav", ".m4a", ".mp4", ".mov", ".webm",
}

limiter = Limiter(key_func=get_remote_address)

UPLOAD_DIR = str(CHAT_UPLOAD_DIR)

class ConversationCreate(BaseModel):
    Name: Optional[str] = None
    CName: Optional[str] = None
    IsGroup: bool = False
    ParticipantIDs: List[str]

    @property
    def effective_name(self) -> Optional[str]:
        return self.Name or self.CName

class MessageCreate(BaseModel):
    ConversationID: str
    MContent: str = ""  # Allow empty string for file-only messages
    FileURL: Optional[str] = None
    # Client-generated id used to reconcile the optimistic bubble with the
    # server's stored message (echoed back on every response/broadcast).
    ClientID: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "ConversationID": "550e8400-e29b-41d4-a716-446655440000",
                "MContent": "Hello, this is a test message!",
                "FileURL": None,
                "ClientID": "temp_1730000000000_0.123"
            }
        }

class MessageResponse(BaseModel):
    MessageID: str
    MConversationID: str
    SenderID: str
    MContent: str
    SentAt: str
    IsRead: bool
    FileURL: Optional[str] = None
    ClientID: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "MessageID": "550e8400-e29b-41d4-a716-446655440000",
                "MConversationID": "550e8400-e29b-41d4-a716-446655440000",
                "SenderID": "STU001",
                "MContent": "Hello, this is a test message!",
                "SentAt": "2024-01-15T10:30:00",
                "IsRead": False,
                "FileURL": "/files/chat_files/uuid.pdf"
            }
        }

try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except OSError as exc:
    # Read-only filesystem: keep importing so the rest of the API stays up.
    print(f"⚠️ Chat upload directory unavailable ({exc}); uploads will fail.")

# Online users tracking
online_users = set()  # Store user IDs
user_sessions = {}  # Map user ID to socket IDs
last_seen = {}  # Map user ID to last-seen datetime (ISO string)


def get_message_rooms(conversation_id: str, participant_ids: List[str]) -> List[str]:
    """Return all socket rooms that should receive a new chat message."""
    rooms = {f"conv_{conversation_id}"}
    rooms.update(f"user_{user_id}" for user_id in participant_ids)
    return sorted(rooms)


def get_current_student(db: Session, current_user) -> StudentInfo:
    """Map the authenticated account to its student profile (chat identity)."""
    student = db.query(StudentInfo).filter(
        StudentInfo.UserID == current_user.UserID
    ).first()
    if not student:
        raise HTTPException(status_code=403, detail="No student profile linked to this account")
    return student


def student_id_from_token(token: Optional[str]) -> Optional[str]:
    """Resolve a JWT to the chat identity (StudentInfo.StudentID)."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None

    db = next(get_db())
    try:
        account = db.query(user).filter(user.UserID == user_id).first()
        if not account:
            return None
        student = db.query(StudentInfo).filter(
            StudentInfo.UserID == account.UserID
        ).first()
        return student.StudentID if student else None
    finally:
        db.close()


def require_participant(db: Session, conversation_uuid, student_id: str):
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.CPConversationID == conversation_uuid,
        ConversationParticipant.CPUserID == student_id,
    ).first()
    if not participant:
        raise HTTPException(status_code=403, detail="User is not a participant in this conversation")
    return participant

@router.post("/api/chat/conversations")
def create_conversation(
    data: ConversationCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    me = get_current_student(db, current_user)
    participant_ids = list(dict.fromkeys(str(user_id) for user_id in (data.ParticipantIDs or [])))
    # The creator is always a participant, whatever the client sent.
    if me.StudentID not in participant_ids:
        participant_ids.insert(0, me.StudentID)

    conversation = Conversation(
        CName=data.effective_name,
        IsGroup=data.IsGroup,
        CreatedAt=datetime.now(),
        CreatedBy=me.StudentID
    )
    db.add(conversation)
    db.flush()  # Flush to get the generated UUID
    
    # Add participants
    for user_id in participant_ids:
        participant = ConversationParticipant(
            CPConversationID=conversation.ConversationID,
            CPUserID=user_id,
            JoinedAt=datetime.now()
        )
        db.add(participant)
    
    db.commit()
    db.refresh(conversation)
    
    return {
        "ConversationID": str(conversation.ConversationID),
        "Name": data.effective_name,
        "CName": data.effective_name,
        "IsGroup": data.IsGroup,
        "ParticipantIDs": participant_ids
    }


def serialize_conversations(db: Session, student_id: str):
    participations = db.query(ConversationParticipant).filter(
        ConversationParticipant.CPUserID == student_id
    ).all()

    conversations = []
    for p in participations:
        conv = db.query(Conversation).filter(
            Conversation.ConversationID == p.CPConversationID
        ).first()

        if conv:
            participants = db.query(ConversationParticipant).filter(
                ConversationParticipant.CPConversationID == conv.ConversationID
            ).all()

            last_msg = None
            if conv.LastMessageID:
                last_msg = db.query(Message).filter(
                    Message.MessageID == conv.LastMessageID
                ).first()

            conversations.append({
                "ConversationID": str(conv.ConversationID),
                "CName": conv.CName,
                "IsGroup": conv.IsGroup,
                "Participants": [pt.CPUserID for pt in participants],
                "LastMessage": {
                    "MContent": last_msg.MContent if last_msg else None,
                    "SentAt": last_msg.SentAt if last_msg else None,
                    "SenderID": last_msg.SenderID if last_msg else None
                } if last_msg else None
            })

    return conversations


@router.get("/api/chat/conversations")
def get_my_conversations(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    me = get_current_student(db, current_user)
    return serialize_conversations(db, me.StudentID)


@router.get("/api/chat/conversations/{user_id}")
def get_user_conversations(
    user_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deprecated path-based variant kept for older clients; identity comes
    from the JWT, so a caller can only list their own conversations."""
    me = get_current_student(db, current_user)
    if user_id != me.StudentID:
        raise HTTPException(status_code=403, detail="You can only list your own conversations")
    return serialize_conversations(db, me.StudentID)

@router.get("/api/chat/messages/{conversation_id}")
def get_messages(
    conversation_id: str,
    user_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve messages for a conversation with proper read status from MessageRead table.
    Returns messages in chronological order (oldest first).
    """
    me = get_current_student(db, current_user)
    if user_id and user_id != me.StudentID:
        raise HTTPException(status_code=403, detail="You can only read your own messages")

    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")

    require_participant(db, conv_uuid, me.StudentID)

    limit = max(1, min(limit, 200))

    # Get messages in reverse chronological order, then reverse for display
    messages = db.query(Message).filter(
        Message.MConversationID == conv_uuid
    ).order_by(Message.SentAt.desc()).limit(limit).offset(offset).all()
    
    # Get read status from MessageRead table (source of truth)
    message_reads = db.query(MessageRead).filter(
        MessageRead.MRUserID == me.StudentID,
        MessageRead.MRMessageID.in_([msg.MessageID for msg in messages])
    ).all()
    
    read_message_ids = {str(mr.MRMessageID) for mr in message_reads}
    
    return [
        {
            "MessageID": str(msg.MessageID),
            "MConversationID": str(msg.MConversationID),
            "SenderID": msg.SenderID,
            "MContent": msg.MContent if msg.MContent else "",
            "SentAt": msg.SentAt.isoformat() if msg.SentAt else None,
            "IsRead": str(msg.MessageID) in read_message_ids,
            "FileURL": msg.FileURL if msg.FileURL else None
        }
        for msg in reversed(messages)
    ]

@router.post("/api/chat/messages", response_model=MessageResponse)
@limiter.limit("60/minute")
async def send_message_http(
    request: Request,
    payload: MessageCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """HTTP fallback for sending a message when the socket is unavailable.

    Mirrors the validation performed by the Socket.IO ``send_message`` handler
    so behaviour is identical regardless of transport.
    """
    # Map the authenticated user account to the student identity used by chat.
    me = get_current_student(db, current_user)
    sender_id = me.StudentID

    try:
        conv_uuid = uuid.UUID(payload.ConversationID)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")

    conversation = db.query(Conversation).filter(
        Conversation.ConversationID == conv_uuid
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    require_participant(db, conv_uuid, sender_id)

    content = (payload.MContent or "").strip()
    file_url = payload.FileURL or None
    if not content and not file_url:
        raise HTTPException(status_code=400, detail="Message content or file URL is required")

    message = Message(
        MessageID=uuid.uuid4(),
        MConversationID=conv_uuid,
        SenderID=sender_id,
        MContent=content,
        FileURL=file_url,
        SentAt=datetime.utcnow(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    try:
        conversation.LastMessageID = message.MessageID
        db.commit()
    except Exception as exc:  # pragma: no cover - best effort
        print(f"⚠️ Warning: Could not update LastMessageID: {exc}")
        db.rollback()

    message_data = {
        "MessageID": str(message.MessageID),
        "MConversationID": str(message.MConversationID),
        "SenderID": message.SenderID,
        "MContent": message.MContent,
        "SentAt": message.SentAt.isoformat() if message.SentAt else None,
        "IsRead": False,
        "FileURL": message.FileURL,
        "ClientID": payload.ClientID,
    }

    # Broadcast to everyone in the conversation (including the sender's own
    # sockets) so live clients update without a refresh.
    if _sio is not None:
        participant_ids = [
            p.CPUserID
            for p in db.query(ConversationParticipant).filter(
                ConversationParticipant.CPConversationID == conv_uuid
            ).all()
        ]
        try:
            for room_name in get_message_rooms(str(conv_uuid), participant_ids):
                await _sio.emit("new_message", message_data, room=room_name)
        except Exception as exc:  # pragma: no cover - broadcast must not fail the send
            print(f"⚠️ Warning: Could not broadcast message: {exc}")

    return message_data


@router.post("/api/chat/upload")
@limiter.limit("20/minute")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only authenticated students may upload.
    get_current_student(db, current_user)
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"File type '{file_ext or 'unknown'}' is not allowed",
        )

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB",
        )
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    file_id = str(uuid.uuid4())
    file_name = f"{file_id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    try:
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(contents)
    except OSError as exc:
        raise HTTPException(status_code=503, detail="File uploads are temporarily unavailable.") from exc

    return {"FileURL": f"/files/chat_files/{file_name}", "FileName": file.filename}

@router.get("/api/chat/conversations/{conversation_id}/participants")
def get_participants(
    conversation_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    me = get_current_student(db, current_user)
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")

    require_participant(db, conv_uuid, me.StudentID)

    participants = db.query(ConversationParticipant).filter(
        ConversationParticipant.CPConversationID == conv_uuid
    ).all()
    
    return [{"UserID": p.CPUserID, "JoinedAt": p.JoinedAt.isoformat() if p.JoinedAt else None} for p in participants]

@router.post("/api/chat/conversations/{conversation_id}/participants")
def add_participants(
    conversation_id: str,
    participant_ids: List[str],
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add new participants to an existing conversation."""
    me = get_current_student(db, current_user)
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")
    
    # Verify conversation exists
    conversation = db.query(Conversation).filter(
        Conversation.ConversationID == conv_uuid
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    require_participant(db, conv_uuid, me.StudentID)
    
    if not participant_ids:
        raise HTTPException(status_code=400, detail="At least one participant ID is required")
    
    added_participants = []
    skipped_participants = []
    
    for user_id in participant_ids:
        # Check if participant already exists
        existing = db.query(ConversationParticipant).filter(
            ConversationParticipant.CPConversationID == conv_uuid,
            ConversationParticipant.CPUserID == user_id
        ).first()
        
        if existing:
            skipped_participants.append(user_id)
        else:
            participant = ConversationParticipant(
                CPConversationID=conv_uuid,
                CPUserID=user_id,
                JoinedAt=datetime.now()
            )
            db.add(participant)
            added_participants.append(user_id)
    
    db.commit()
    
    return {
        "AddedParticipants": added_participants,
        "SkippedParticipants": skipped_participants,
        "Message": f"Added {len(added_participants)} participant(s)"
    }

@router.post("/api/chat/conversations/{conversation_id}/read")
def mark_as_read(
    conversation_id: str,
    user_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    me = get_current_student(db, current_user)
    if user_id and user_id != me.StudentID:
        raise HTTPException(status_code=403, detail="You can only mark your own messages as read")

    try:
        conv_uuid = uuid.UUID(conversation_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")

    require_participant(db, conv_uuid, me.StudentID)

    unread_messages = db.query(Message).filter(
        Message.MConversationID == conv_uuid,
        Message.SenderID != me.StudentID
    ).all()
    
    read_count = 0
    for msg in unread_messages:
        existing = db.query(MessageRead).filter(
            MessageRead.MRMessageID == msg.MessageID,
            MessageRead.MRUserID == me.StudentID
        ).first()
        
        if not existing:
            message_read = MessageRead(
                MRMessageID=msg.MessageID,
                MRUserID=me.StudentID,
                ReadAt=datetime.now()
            )
            db.add(message_read)
            read_count += 1
    
    db.commit()
    
    return {"MarkedAsRead": read_count}

@router.get("/api/chat/students")
def get_all_students(
    exclude_user_id: str = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Authenticated students only: this endpoint exposes the student directory.
    get_current_student(db, current_user)

    students = db.query(StudentInfo).all()
    result = []
    for s in students:
        if exclude_user_id and s.StudentID == exclude_user_id:
            continue
        sid = s.StudentID
        last = last_seen.get(sid)
        # A user is "online" if they have a live socket registered
        is_online = sid in online_users
        # Only show a last-seen time reflecting a real session in the past;
        # if currently online, mark them as active now.
        result.append({
            "StudentID": sid,
            "FirstName": s.StuFirstName,
            "LastName": s.StuLastName,
            "DisplayName": f"{s.StuFirstName} {s.StuLastName}",
            "IsOnline": is_online,
            "LastSeen": last or (datetime.utcnow().isoformat() + "Z" if is_online else None),
        })
    # Sort: online users first, then by DisplayName
    result.sort(key=lambda r: (not r["IsOnline"], (r["DisplayName"] or "").lower()))
    return result

def init_socketio(sio):
    global _sio
    _sio = sio

    async def session_user_id(sid):
        """Identity established at connect time (never trusted from payloads)."""
        try:
            session = await sio.get_session(sid)
        except Exception:
            return None
        return (session or {}).get('user_id')

    @sio.event
    async def connect(sid, environ, auth=None):
        token = None
        if isinstance(auth, dict):
            token = auth.get('token') or auth.get('access_token')
        if not token:
            header = (environ or {}).get('HTTP_AUTHORIZATION', '')
            if header.lower().startswith('bearer '):
                token = header[7:]

        student_id = student_id_from_token(token)
        if not student_id:
            print(f"[SocketIO] Rejected unauthenticated connection: {sid}")
            raise ConnectionRefusedError('authentication required')

        await sio.save_session(sid, {'user_id': student_id})
        print(f"[SocketIO] Client connected: {sid} ({student_id})")

    @sio.event
    async def disconnect(sid, *args):
        print(f"[SocketIO] Client disconnected: {sid}")
        # Remove user from online list
        for user_id, sids in list(user_sessions.items()):
            if sid in sids:
                sids.discard(sid)
                if not sids:
                    online_users.discard(user_id)
                    user_sessions.pop(user_id, None)
                    last_seen[user_id] = datetime.utcnow().isoformat() + "Z"
                    # Notify all clients that user went offline
                    await sio.emit('user_offline', {'user_id': user_id})
                break

    @sio.event
    async def join_conversation(sid, data):
        conversation_id = data.get('conversation_id') or data.get('conversationId')
        user_id = await session_user_id(sid)
        print(f"[SocketIO] {user_id} joining conversation {conversation_id}")

        if not user_id:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return
        if not conversation_id:
            await sio.emit('error', {'message': 'Missing conversation ID for join_conversation'}, room=sid)
            return

        try:
            conv_uuid = uuid.UUID(str(conversation_id))
        except (ValueError, TypeError):
            await sio.emit('error', {'message': 'Invalid conversation ID format'}, room=sid)
            return

        db = next(get_db())
        try:
            participant = db.query(ConversationParticipant).filter(
                ConversationParticipant.CPConversationID == conv_uuid,
                ConversationParticipant.CPUserID == user_id
            ).first()
        finally:
            db.close()

        if not participant:
            await sio.emit('error', {'message': 'User is not a participant in this conversation'}, room=sid)
            return

        await sio.enter_room(sid, f"conv_{conversation_id}")
        await sio.emit('user_joined', {'user_id': user_id, 'conversation_id': conversation_id}, room=f"conv_{conversation_id}")

    @sio.event
    async def leave_conversation(sid, data):
        conversation_id = data.get('conversation_id') or data.get('conversationId')
        user_id = await session_user_id(sid)
        print(f"[SocketIO] {user_id} leaving conversation {conversation_id}")
        if not conversation_id:
            await sio.emit('error', {'message': 'Missing conversation ID for leave_conversation'}, room=sid)
            return
        await sio.leave_room(sid, f"conv_{conversation_id}")
        await sio.emit('user_left', {'user_id': user_id, 'conversation_id': conversation_id}, room=f"conv_{conversation_id}")


   #################################################### 
    @sio.event
    async def send_message(sid, data):
        """Handle sending a new message with proper validation and separation of content/file."""
        db = None
        try:
            print(f"📩 Received message data: {data}")
            
            # Extract fields with case-insensitive fallback
            conversation_id = data.get('conversation_id') or data.get('conversationId')
            content = data.get('content') or data.get('MContent') or ""
            file_url = data.get('file_url') or data.get('fileUrl')
            client_id = data.get('client_id') or data.get('clientId') or data.get('ClientID')

            # Identity always comes from the authenticated socket session.
            sender_id = await session_user_id(sid)

            # Validate required fields
            if not sender_id:
                await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
                return
            if not conversation_id:
                await sio.emit('error', {'message': 'Missing required field: conversation_id'}, room=sid)
                return
            
            # Validate at least content or file_url exists
            content = (content or "").strip() if isinstance(content, str) else ""
            if not content and not file_url:
                await sio.emit('error', {'message': 'Message content or file URL is required'}, room=sid)
                return
            
            # Get database session
            db = next(get_db())
            
            # Validate conversation_id format
            try:
                conv_uuid = uuid.UUID(conversation_id)
            except (ValueError, TypeError):
                await sio.emit('error', {'message': 'Invalid conversation ID format'}, room=sid)
                if db:
                    db.close()
                return
            
            # Verify conversation exists
            conversation = db.query(Conversation).filter(
                Conversation.ConversationID == conv_uuid
            ).first()
            
            if not conversation:
                await sio.emit('error', {'message': 'Conversation not found'}, room=sid)
                if db:
                    db.close()
                return
            
            # Verify user is a participant in the conversation
            participant = db.query(ConversationParticipant).filter(
                ConversationParticipant.CPConversationID == conv_uuid,
                ConversationParticipant.CPUserID == sender_id
            ).first()
            
            if not participant:
                await sio.emit('error', {'message': 'User is not a participant in this conversation'}, room=sid)
                if db:
                    db.close()
                return
            
            # Create message with proper field separation
            message = Message(
                MessageID=uuid.uuid4(),
                MConversationID=conv_uuid,
                SenderID=sender_id,
                MContent=content if content else "",  # Text content (can be empty if file-only)
                FileURL=file_url if file_url else None,  # File URL in separate column
                SentAt=datetime.utcnow()
            )
            
            db.add(message)
            db.commit()
            db.refresh(message)
            
            print(f"✅ Message created: ID={message.MessageID}, Content length={len(content)}, FileURL={bool(file_url)}")
            
            # Prepare broadcast message
            message_data = {
                'MessageID': str(message.MessageID),
                'MConversationID': str(message.MConversationID),
                'SenderID': message.SenderID,
                'MContent': message.MContent,
                'SentAt': message.SentAt.isoformat() if message.SentAt else None,
                'IsRead': False,
                'FileURL': message.FileURL,
                'ClientID': client_id
            }
            
            # Get all participants for room names
            participant_records = db.query(ConversationParticipant).filter(
                ConversationParticipant.CPConversationID == conv_uuid
            ).all()
            
            participant_ids = [p.CPUserID for p in participant_records]
            
            # Broadcast to all participants
            for room_name in get_message_rooms(str(conv_uuid), participant_ids):
                await sio.emit('new_message', message_data, room=room_name)
            
            # Confirm to sender
            await sio.emit('message_sent', {'success': True, 'message': message_data}, room=sid)
            
            # Update conversation's last message reference
            try:
                conversation.LastMessageID = message.MessageID
                db.commit()
            except Exception as e:
                print(f"⚠️ Warning: Could not update LastMessageID: {str(e)}")
                db.rollback()
            
        except Exception as e:
            print(f"❌ Error in send_message: {str(e)}")
            import traceback
            traceback.print_exc()
            await sio.emit('error', {'message': f'Failed to send message: {str(e)}'}, room=sid)
            if db:
                db.rollback()
        finally:
            if db:
                db.close()
 ###########################################################################   
    @sio.event
    async def typing(sid, data):
        conversation_id = data.get('conversation_id')
        user_id = await session_user_id(sid)
        is_typing = data.get('is_typing')
        if not user_id or not conversation_id:
            return
        await sio.emit('user_typing', {
            'user_id': user_id,
            'conversation_id': conversation_id,
            'is_typing': is_typing
        }, room=f"conv_{conversation_id}", skip_sid=sid)
    
    @sio.event
    async def register_user(sid, data=None):
        # Identity comes from the JWT presented at connect time, not the payload.
        user_id = await session_user_id(sid)
        if not user_id:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return

        print(f"[SocketIO] Registering user {user_id} with sid {sid}")
        await sio.enter_room(sid, f"user_{user_id}")
        
        # Add to online users
        if user_id not in user_sessions:
            user_sessions[user_id] = set()
        user_sessions[user_id].add(sid)
        online_users.add(user_id)
        last_seen[user_id] = datetime.utcnow().isoformat() + "Z"
        
        await sio.emit('registered', {'user_id': user_id, 'sid': sid})
        # Send current online users list
        await sio.emit('online_users', list(online_users))
        # Notify all clients that user came online
        await sio.emit('user_online', {'user_id': user_id})
