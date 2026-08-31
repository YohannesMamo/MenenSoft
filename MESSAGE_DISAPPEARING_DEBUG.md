# Message Disappearing Issue - Debugging Guide

## Symptoms
- Messages appear to be sent but then disappear
- No error message displayed to the user
- Messages don't appear on sender's or receiver's page

## Root Causes (in order of likelihood)

### 1. **Socket.IO Connection Issues** ⚠️ MOST LIKELY
**Symptoms:**
- Socket connects initially but disconnects/reconnects
- New message event isn't received
- message_sent event times out

**How to diagnose:**
- Open Browser Console (F12)
- Look for these messages:
  ```
  [ChatContext] Socket.IO connected: <socket-id>
  [ChatContext] Sending message: {...}
  [ChatContext] Emitting send_message event
  [ChatContext] message_sent received from server
  ```
- If you see "sending message" but never "message_sent received", the connection is the issue

**How to fix:**
- Check if backend is running: `python backend/main.py`
- Check if `VITE_API_URL` environment variable is correct in frontend
- Check browser console for "Socket.IO connection failed" errors
- Look for CORS errors

### 2. **Backend Validation Failures** ⚠️ SECOND MOST LIKELY
**Symptoms:**
- Socket error event is emitted from backend
- Error message shows in UI

**Validation checks the backend performs:**
- Conversation ID is a valid UUID ✓
- User is a participant in the conversation ✓
- Either text content or file URL exists ✓

**How to diagnose:**
- Look in browser console for error message
- Should see something like: "Socket error event: {message: 'User not in conversation'}"

**How to fix:**
- Ensure user was added to conversation participants
- Ensure conversation ID is correct
- Ensure message isn't empty

### 3. **Message Not Appearing (newMessage Event Failure)** ⚠️
**Symptoms:**
- message_sent confirms success
- But message doesn't appear in chat
- No error messages

**This can happen if:**
- User hasn't joined the conversation room yet
- new_message listener isn't set up
- User isn't in the participant list

**How to diagnose:**
- Check backend logs for "Broadcasting to rooms: ..."
- Verify user joined conversation: "Joined conversation room: <id>"

### 4. **Frontend State Update Issues**
**Symptoms:**
- Message is in state but not displaying

**How to diagnose:**
- Open React DevTools
- Check ChatContext messages state
- Look for temp messages or real messages

---

## Debug Logging Already Enabled

The chat system now includes extensive logging. Open browser console and send a message. You should see:

```
[ChatContext] Sending message: {...}
[ChatContext] Adding optimistic message: temp_1234567_0.123
[ChatContext] Emitting send_message event with payload: {...}
[ChatContext] message_sent received from server: {success: true, message: {...}}
[ChatContext] Message confirmed, replacing temp ID with real ID
```

**Or if it fails:**

```
[ChatContext] Sending message: {...}
[ChatContext] Socket error event: {message: 'User not in conversation'}
```

---

## Step-by-Step Debugging

### Step 1: Check Socket Connection
```javascript
// Run in browser console:
const chatContext = window.__chatContext; // Might not be available
// Or look for these logs in console:
```

Expected output:
```
[ChatContext] Socket.IO connected: SocketIOID-12345
[ChatContext] userId now available, emitting register_user for: STU123
```

### Step 2: Check Conversation Join
Send a message and look for:
```
[Socket] Joined conversation room: conv-uuid-here
```

### Step 3: Send Test Message
Send a message and watch for **all** of these in sequence:

1. ✓ `[ChatContext] Sending message:`
2. ✓ `[ChatContext] Adding optimistic message:`
3. ✓ `[ChatContext] Emitting send_message event`
4. ✓ `[ChatContext] message_sent received from server`

**If Step 4 doesn't appear within 20 seconds, it's a backend/network issue.**

### Step 4: Check Backend Logs
```bash
# Run backend and watch for:
python backend/main.py

# Expected output when message is sent:
[SocketIO] Received message data: {conversation_id: ..., sender_id: ..., content: ...}
✅ Message created: ID=uuid, Content length=15, FileURL=False
✅ Broadcasting to rooms: conv_uuid, user_STU123
```

---

## Network Issues Checklist

- [ ] Backend is running on correct port (default: 8000)
- [ ] Frontend `VITE_API_URL` matches backend URL
- [ ] CORS allows frontend domain
- [ ] No firewall blocking Socket.IO port
- [ ] Check browser Network tab for Socket.IO connection failures
- [ ] Check for "WebSocket is closed" errors

---

## Quick Fix Checklist

1. **Clear browser cache** (Ctrl+Shift+Del)
2. **Restart backend** (stop and `python backend/main.py`)
3. **Refresh frontend** (F5)
4. **Check console errors** (F12 > Console)
5. **Verify Socket.IO rooms:**
   - Frontend: Look for "Joined conversation room"
   - Backend: Look for socket room assignments

---

## If Still Broken

Provide these details:

1. **Browser console output** when message is sent (entire logs from "Sending message" to timeout)
2. **Backend logs** when user sends message
3. **Network tab** from browser DevTools showing Socket.IO connection and message events
4. **URL of frontend and backend** - verify they can communicate

---

## Sample Error Scenarios

### Scenario A: Socket Not Connected
```
❌ [ChatContext] Socket is not connected or userId missing
   Error thrown to user: "Socket is not connected"
```
**Fix:** Restart backend, check CORS

### Scenario B: User Not in Conversation
```
❌ [ChatContext] Socket error event: {message: 'User not a participant in this conversation'}
   Error: "User not a participant in this conversation"
```
**Fix:** Verify user was added to conversation participants

### Scenario C: Timeout
```
[ChatContext] Sending message...
[ChatContext] Adding optimistic message...
[ChatContext] Emitting send_message event...
(20 second pause)
❌ [ChatContext] Message send timeout after 20s
   Error: "Message send timeout - no response from server"
```
**Fix:** Check backend connection, network latency

### Scenario D: Success
```
[ChatContext] Sending message...
[ChatContext] Adding optimistic message: temp_123
[ChatContext] Emitting send_message event
[ChatContext] message_sent received from server
[ChatContext] Message confirmed, replacing temp ID with real ID
✓ Message appears in chat
```
**Status:** Working correctly!

---

## Performance Notes

- **Optimistic update:** Instant (no wait)
- **Database save:** <100ms typically
- **Socket broadcast:** <50ms typically
- **Total time:** <500ms for full flow
- **Timeout:** 20 seconds (very generous for debugging)

If backend responds with message_sent, message should appear within 1 second.

---

## Files to Check

- Frontend: `frontend/src/contexts/ChatContext.tsx` - Socket.IO handling
- Frontend: `frontend/src/components/ChatHub.tsx` - Message sending UI
- Backend: `backend/routes/chat.py` - Socket.IO event handlers
- Backend: `backend/main.py` - Socket.IO initialization

---

## Testing Commands

```bash
# Test socket connection from frontend console:
if (window.__DEBUG_SOCKET) {
  console.log('Socket connected:', window.__DEBUG_SOCKET.connected)
}

# Monitor backend socket events:
# (Enable debug mode in socketio)
```

---

## Next Steps

1. Open browser console (F12)
2. Send a message
3. Copy all console output
4. Share with development team if still failing

Check the error message displayed in the UI - it now shows specific details about what went wrong!
