# Enterprise RAG Chatbot - Testing & Setup Guide

## 🚀 Quick Start

### Prerequisites
1. **Python 3.8+** installed
2. **LM Studio** or compatible LLM running on `http://127.0.0.1:1234/v1/chat/completions`
3. **Dependencies installed** - see requirements.txt

### Setup Steps

#### 1. Install Dependencies
```bash
pip install -r requirements.txt
pip install pyjwt  # For authentication
```

#### 2. Start LLM Server
LM Studio (or similar):
- Download Mistral 7B model
- Run server on port 1234
- Verify: `curl http://127.0.0.1:1234/v1/models` (should return model list)

#### 3. Start Backend API (Terminal 1)
```bash
cd backend
python -m uvicorn app:app --reload --port 8000
```

Expected output:
```
Uvicorn running on http://127.0.0.1:8000
Press CTRL+C to quit
```

#### 4. Start Frontend Server (Terminal 2)
```bash
cd frontend
python -m http.server 8001
```

Navigate to: `http://localhost:8001/login.html`

---

## 🧪 Testing Checklist

### ✅ Test 1: Authentication Flow

1. **Go to Login Page**
   - URL: http://localhost:8001/login.html
   - Should see gradient UI with demo credentials

2. **Test Demo User**
   - Username: `john`
   - Password: `password123`
   - Role: `Employee` (select from dropdown)
   - Click **Login**

3. **Expected Results**
   - ✓ Success message appears
   - ✓ Redirects to main chat page after 1 second
   - ✓ User info displays: "👤 john" in top-right
   - ✓ Role badge shows: "👤 Employee"

4. **Test Invalid Credentials**
   - Try wrong password
   - Should show error: "Login failed. Check credentials."

5. **Test Role Switch**
   - Login as `alice` with role `HR`
   - Verify role badge shows: "👥 HR Manager"
   - Login as `bob` with role `Manager`
   - Verify role badge shows: "🎯 Department Manager"

### ✅ Test 2: Chat Interface

1. **Ask Question (Regular Response)**
   - Click in input field
   - Type: "What are company policies?"
   - Click **Send** button (or press Enter)

2. **Expected Results**
   - ✓ User message appears on right (blue bubble)
   - ✓ Typing indicator shows during processing
   - ✓ Bot response appears on left (gray bubble)
   - ✓ Response shows "Answer", sources, and metrics

3. **Verify Message Format**
   - Bot message includes 3 main parts:
     - **Answer**: The RAG-generated response
     - **Sources**: Expandable section with document citations
     - **Metrics**: Confidence %, retrieval time, LLM time, total time

### ✅ Test 3: Sources & Citations

1. **Expand Sources Section**
   - Look for "📎 Sources (3)" or similar
   - Click to expand
   - Should show:
     - Filename (e.g., "employee_handbook.txt")
     - Page number
     - Snippet preview

2. **Verify Source Format**
   ```
   Source Item:
   ├─ Filename: employee_handbook.txt (Page 2)
   └─ Snippet: "The company policy states that..."
   ```

### ✅ Test 4: Streaming Response

1. **Enable Streaming**
   - Ask question: "Tell me about benefits"
   - Click **Stream** button instead of Send

2. **Expected Behavior**
   - ✓ Response appears character-by-character
   - ✓ No typing indicator (response already generating)
   - ✓ Sources appear after streaming completes
   - ✓ Response slower but more transparent

### ✅ Test 5: Performance Metrics

1. **Check Metrics Display**
   - Each response should show:
     - **Confidence**: 0-100% (e.g., 85%)
     - **Retrieval Time**: ~50-200ms (doc retrieval)
     - **LLM Time**: ~500-2000ms (model inference)
     - **Total Time**: Sum of above

2. **Verify Timing Progression**
   - First query: ~1-3 seconds (model loading)
   - Subsequent queries: ~0.5-1.5 seconds

3. **Stats Footer**
   - Bottom shows: "Last response: 1.25s | Role: employee"
   - Updates after each query

### ✅ Test 6: Role-Based Access

1. **Test Employee Role Filtering**
   - Login as john (Employee)
   - Ask: "What are manager responsibilities?"
   - Response should be restricted to employee-visible data

2. **Test HR Role Filtering**
   - Login as alice (HR)
   - Ask same question
   - Response should include HR-specific information

3. **Test Manager Role Filtering**
   - Login as bob (Manager)
   - Response should include manager-specific data

### ✅ Test 7: Authentication Security

1. **Test Token Expiration (Optional)**
   - Wait 24 hours, then refresh page
   - Should redirect to login with message

2. **Test Logout**
   - Click **Logout** button
   - Should redirect to login.html
   - localStorage should be cleared

3. **Test Token Blacklist**
   - Login with john
   - Copy token from DevTools Console: `localStorage.getItem('token')`
   - Click Logout (token now blacklisted)
   - Try to use old token in API call
   - Should get 401 Unauthorized

### ✅ Test 8: Error Handling

1. **Test Backend Down**
   - Stop FastAPI server
   - Try to send message
   - Should show: "Connection error. Is the backend running?"

2. **Test LLM Down**
   - Stop LM Studio
   - Try to send message
   - Should show error in response

3. **Test Invalid Session**
   - Clear localStorage: `localStorage.clear()`
   - Refresh page
   - Should redirect to login

### ✅ Test 9: UI Functionality

1. **Test Clear Chat**
   - Ask a few questions
   - Click **Clear** button
   - Click OK on confirmation
   - Chat should be empty with "Chat cleared" message

2. **Test Enter Key**
   - Type message
   - Press Enter (not Shift+Enter)
   - Message should send

3. **Test Keyboard Hint**
   - Should see "💡 Press Enter to send..." at bottom

4. **Test Mobile Responsiveness**
   - Resize browser to 480px width
   - UI should stack vertically
   - Buttons should remain functional

---

## 🔍 API Endpoints to Test (with cURL)

### 1. Login Endpoint
```bash
curl -X POST http://127.0.0.1:8000/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "password123",
    "role": "employee"
  }'
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 86400,
  "username": "john",
  "role": "employee"
}
```

### 2. Ask Endpoint (with Token)
```bash
TOKEN="your_token_here"
curl -X POST http://127.0.0.1:8000/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are company policies?"
  }'
```

### 3. Analytics Endpoint
```bash
TOKEN="your_token_here"
curl -X GET "http://127.0.0.1:8000/analytics/stats?days=7" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. User Info Endpoint
```bash
TOKEN="your_token_here"
curl -X GET http://127.0.0.1:8000/user/info \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Performance Benchmarks

Expected response times on modern hardware:

| Scenario | Time | Notes |
|----------|------|-------|
| Cold start (first query) | 2-4s | Model loading included |
| Warm start (subsequent) | 0.8-1.5s | Model already loaded |
| Retrieval only | 50-150ms | FAISS vector search |
| LLM inference | 800-1500ms | Mistral 7B generation |
| Streaming vs Normal | +20-30% | Additional SSE overhead |

---

## 🐛 Troubleshooting

### Issue: "Connection error. Is the backend running?"
- Check FastAPI server is running: `http://127.0.0.1:8000/`
- Check CORS is enabled in app.py
- Verify port 8000 is not blocked by firewall

### Issue: "Invalid or expired token"
- Token expired (24 hours)
- Backend restarted (invalidates tokens)
- Solution: Login again

### Issue: No response from LLM
- Check LM Studio is running on port 1234
- Verify model is loaded
- Check network connectivity
- Try: `curl http://127.0.0.1:1234/v1/models`

### Issue: Empty sources in response
- Verify FAISS index exists: `vectorstore/index.faiss`
- Check documents are ingested: `python backend/ingest_documents.py`
- Verify metadata in documents

### Issue: Slow responses
- Check LM Studio CPU usage (should be high)
- Reduce RETRIEVAL_K from 3 to 1 (fewer documents)
- Increase REQUEST_TIMEOUT in rag_engine.py
- Use smaller LLM model

---

## 📝 Test Cases Log

Create test results using this template:

```
Date: [YYYY-MM-DD]
Tester: [Name]
Browser: [Chrome/Firefox/Edge]
Backend: [Running/Stopped]
LLM: [Model/Status]

Test Results:
□ Authentication: [✓/✗] [Notes]
□ Chat Sending: [✓/✗] [Notes]
□ Streaming: [✓/✗] [Notes]
□ Sources: [✓/✗] [Notes]
□ Metrics: [✓/✗] [Notes]
□ Role-Based Access: [✓/✗] [Notes]
□ Error Handling: [✓/✗] [Notes]

Issues Found:
- [Issue 1]
- [Issue 2]

Recommendations:
- [Recommendation]
```

---

## 🎯 Next Steps After Testing

1. **Create Role-Specific Vector Stores**
   ```bash
   python backend/ingest_documents.py --role employee --path data/employee/
   python backend/ingest_documents.py --role hr --path data/hr/
   python backend/ingest_documents.py --role manager --path data/manager/
   ```

2. **Deploy to Production**
   - Use Gunicorn instead of Uvicorn
   - Set up reverse proxy (Nginx)
   - Configure HTTPS/SSL
   - Set up database for query logging

3. **Monitor Performance**
   - Check `/analytics/performance` endpoint
   - Monitor token usage
   - Track response times

4. **Scale Up**
   - Add more LLM replicas
   - Implement caching layer (Redis)
   - Use larger model if hardware allows

---

## 📚 Documentation Files

- `ROADMAP.md` - Feature roadmap
- `ARCHITECTURE.md` - System design
- `API.md` - Endpoint documentation
- `TESTING_GUIDE.md` - This file

---

**Version**: 2.0
**Last Updated**: 2024
**Status**: Ready for Testing
