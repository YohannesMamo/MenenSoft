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

router = APIRouter()

UPLOAD_DIR = "uploads/chat_files"

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
    
    class Config:
        json_schema_extra = {
            "example": {
                "ConversationID": "550e8400-e29b-41d4-a716-446655440000",
                "MContent": "Hello, this is a test message!",
                "FileURL": None
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

os.makedirs(UPLOAD_DIR, exist_ok=True)

# Online users tracking
online_users = set()  # Store user IDs
user_sessions = {}  # Map user ID to socket IDs
last_seen = {}  # Map user ID to last-seen datetime (ISO string)


def get_message_rooms(conversation_id: str, participant_ids: List[str]) -> List[str]:
    """Return all socket rooms that should receive a new chat message."""
    rooms = {f"conv_{conversation_id}"}
    rooms.update(f"user_{user_id}" for user_id in participant_ids)
    return sorted(rooms)

@router.post("/api/chat/conversations")
def create_conversation(data: ConversationCreate, db: Session = Depends(get_db)):
    participant_ids = list(dict.fromkeys(str(user_id) for user_id in (data.ParticipantIDs or [])))
    conversation = Conversation(
        CName=data.effective_name,
        IsGroup=data.IsGroup,
        CreatedAt=datetime.now(),
        CreatedBy=participant_ids[0] if participant_ids else None
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

@router.get("/api/chat/conversations/{user_id}")
def get_user_conversations(user_id: str, db: Session = Depends(get_db)):
    participations = db.query(ConversationParticipant).filter(
        ConversationParticipant.CPUserID == user_id
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

@router.get("/api/chat/messages/{conversation_id}")
def get_messages(conversation_id: str, user_id: str, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """
    Retrieve messages for a conversation with proper read status from MessageRead table.
    Returns messages in chronological order (oldest first).
    """
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")
    
    # Verify user is in the conversation
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.CPConversationID == conv_uuid,
        ConversationParticipant.CPUserID == user_id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="User not in conversation")
    
    # Get messages in reverse chronological order, then reverse for display
    messages = db.query(Message).filter(
        Message.MConversationID == conv_uuid
    ).order_by(Message.SentAt.desc()).limit(limit).offset(offset).all()
    
    # Get read status from MessageRead table (source of truth)
    message_reads = db.query(MessageRead).filter(
        MessageRead.MRUserID == user_id,
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

@router.post("/api/chat/upload")
async def upload_file(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    file_name = f"{file_id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    async with aiofiles.open(file_path, 'wb') as f:
        MContent = await file.read()
        await f.write(MContent)
    
    return {"FileURL": f"/files/chat_files/{file_name}", "FileName": file.filename}

@router.get("/api/chat/conversations/{conversation_id}/participants")
def get_participants(conversation_id: str, db: Session = Depends(get_db)):
    conv_uuid = uuid.UUID(conversation_id)
    participants = db.query(ConversationParticipant).filter(
        ConversationParticipant.CPConversationID == conv_uuid
    ).all()
    
    return [{"UserID": p.CPUserID, "JoinedAt": p.JoinedAt.isoformat() if p.JoinedAt else None} for p in participants]

@router.post("/api/chat/conversations/{conversation_id}/participants")
def add_participants(conversation_id: str, participant_ids: List[str], db: Session = Depends(get_db)):
    """Add new participants to an existing conversation."""
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
def mark_as_read(conversation_id: str, user_id: str, db: Session = Depends(get_db)):
    conv_uuid = uuid.UUID(conversation_id)
    unread_messages = db.query(Message).filter(
        Message.MConversationID == conv_uuid,
        Message.SenderID != user_id
    ).all()
    
    read_count = 0
    for msg in unread_messages:
        existing = db.query(MessageRead).filter(
            MessageRead.MRMessageID == msg.MessageID,
            MessageRead.MRUserID == user_id
        ).first()
        
        if not existing:
            message_read = MessageRead(
                MRMessageID=msg.MessageID,
                MRUserID=user_id,
                ReadAt=datetime.now()
            )
            db.add(message_read)
            read_count += 1
    
    db.commit()
    
    return {"MarkedAsRead": read_count}

@router.get("/api/chat/students")
def get_all_students(exclude_user_id: str = None, db: Session = Depends(get_db)):
    from datetime import timedelta
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
    
    @sio.event
    async def connect(sid, environ, *args):
        print(f"[SocketIO] Client connected: {sid}")
    
    @sio.event
    async def disconnect(sid, *args):
        print(f"[SocketIO] Client disconnected: {sid}")
        # Remove user from online list
        for user_id, sids in list(user_sessions.items()):
            if sid in sids:
                sids.remove(sid)
                if not sids:
                    online_users.remove(user_id)
                    del user_sessions[user_id]
                    last_seen[user_id] = datetime.utcnow().isoformat() + "Z"
                    # Notify all clients that user went offline
                    await sio.emit('user_offline', {'user_id': user_id})
                break
    
    @sio.event
    async def join_conversation(sid, data):
        conversation_id = data.get('conversation_id') or data.get('conversationId')
        user_id = data.get('user_id') or data.get('userId')
        print(f"[SocketIO] {user_id} joining conversation {conversation_id}")
        if not conversation_id:
            await sio.emit('error', {'message': 'Missing conversation ID for join_conversation'}, room=sid)
            return
        await sio.enter_room(sid, f"conv_{conversation_id}")
        await sio.emit('user_joined', {'user_id': user_id, 'conversation_id': conversation_id}, room=f"conv_{conversation_id}")
    
    @sio.event
    async def leave_conversation(sid, data):
        conversation_id = data.get('conversation_id') or data.get('conversationId')
        user_id = data.get('user_id') or data.get('userId')
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
            sender_id = data.get('sender_id') or data.get('senderId')
            content = data.get('content') or data.get('MContent') or ""
            file_url = data.get('file_url') or data.get('fileUrl')
            
            # Validate required fields
            if not conversation_id or not sender_id:
                await sio.emit('error', {'message': 'Missing required fields: conversation_id and sender_id'}, room=sid)
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
                'FileURL': message.FileURL
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
        user_id = data.get('user_id')
        is_typing = data.get('is_typing')
        await sio.emit('user_typing', {
            'user_id': user_id,
            'conversation_id': conversation_id,
            'is_typing': is_typing
        }, room=f"conv_{conversation_id}", skip_sid=sid)
    
    @sio.event
    async def register_user(sid, data):
        user_id = data.get('user_id')
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
