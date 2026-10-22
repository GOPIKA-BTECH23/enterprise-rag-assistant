# 🗺️ Implementation Roadmap & Architecture

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     ENTERPRISE RAG CHATBOT                       │
│                        System Overview                           │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Frontend (HTML/CSS/JavaScript)                             │  │
│  │                                                              │  │
│  │  [index.html]              [login.html]        [admin.html] │  │
│  │  ┌─────────────┐          ┌─────────────┐      ┌──────────┐ │  │
│  │  │ Chat UI     │          │ Login Form  │      │Dashboard │ │  │
│  │  │ - Message   │          │ - Role      │      │ - Stats  │ │  │
│  │  │   history   │          │   select    │      │ - Logs   │ │  │
│  │  │ - Input box │          │ - Auth      │      │ - Users  │ │  │
│  │  │ - Send btn  │          └─────────────┘      └──────────┘ │  │
│  │  └─────────────┘                                             │  │
│  │                                                              │  │
│  │  [script.js]                      [style.css]               │  │
│  │  - sendMessage()                  - Chat styling            │  │
│  │  - fetch() API calls              - Responsive layout       │  │
│  │  - Stream handler                 - Theme                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  ↕
                    HTTP/REST API (JSON)
                                  ↕
┌─────────────────────────────────────────────────────────────────────┐
│                     API/APPLICATION LAYER                           │
│                        (FastAPI Backend)                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  FastAPI App (app.py)                                       │  │
│  │                                                              │  │
│  │  Endpoints:                                                 │  │
│  │  ├─ GET  /                                                 │  │
│  │  ├─ POST /ask                                              │  │
│  │  ├─ POST /ask-stream (Future)                              │  │
│  │  ├─ POST /login (Future - auth.py)                         │  │
│  │  ├─ POST /ingest (Future - upload new docs)                │  │
│  │  └─ GET  /analytics (Future - analytics.py)                │  │
│  │                                                              │  │
│  │  Middleware:                                                │  │
│  │  ├─ CORS (Allow frontend)                                  │  │
│  │  ├─ Auth (JWT validation)                                  │  │
│  │  └─ Logging                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  ↕
┌─────────────────────────────────────────────────────────────────────┐
│                    PROCESSING/LOGIC LAYER                           │
│                                                                     │
│  ┌───────────────────────┐   ┌────────────────────┐                │
│  │  RAG Engine           │   │ Auth Module        │                │
│  │  (rag_engine.py)      │   │ (auth.py)          │                │
│  │                       │   │                    │                │
│  │  ask_question()       │   │ create_token()     │                │
│  │  ├─ Vectorize Q       │   │ verify_token()     │                │
│  │  ├─ Search FAISS      │   │ get_user_role()    │                │
│  │  ├─ Build context     │   │                    │                │
│  │  ├─ Format prompt     │   │                    │                │
│  │  └─ Call LLM          │   │                    │                │
│  │                       │   │                    │                │
│  │  ask_question_stream()│   │ hash_password()    │                │
│  │  └─ Stream responses  │   │ verify_password()  │                │
│  └───────────────────────┘   └────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
                    ↕                            ↕
        ┌───────────────────┐       ┌───────────────────┐
        │ Vector DB Layer   │       │ LLM Layer         │
        └───────────────────┘       └───────────────────┘
                ↓                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                    │
│                                                                     │
│  ┌─────────────────────────────────┐   ┌──────────────────────┐   │
│  │  Vector Database (FAISS)        │   │  LM Studio API       │   │
│  │  /vectorstore/                  │   │  http://127.0.0.1    │   │
│  │  ├─ index.faiss                 │   │  :1234/v1/chat/      │   │
│  │  ├─ docstore.pkl                │   │  completions         │   │
│  │  └─ index.pkl                   │   │                      │   │
│  │                                 │   │  Model:              │   │
│  │  Embedding Model:               │   │  mistral-7b-         │   │
│  │  sentence-transformers/         │   │  instruct-v0.3       │   │
│  │  all-MiniLM-L6-v2               │   │                      │   │
│  │  (384-dim vectors)              │   │  Running locally     │   │
│  └─────────────────────────────────┘   └──────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Document Storage & Database                               │  │
│  │  /data/                                                     │  │
│  │  ├─ employee/          ├─ hr/           ├─ manager/        │  │
│  │  │  ├─ handbook.pdf    │ ├─ policies.pdf│  ├─ guide.pdf    │  │
│  │  │  └─ benefits.pdf    │ └─ payroll.pdf │  └─ handbook.pdf │  │
│  │  └─────────────────────┴──────────────────┴────────────────   │
│  │                                                              │  │
│  │  Role-Based Vector Stores (Future):                         │  │
│  │  ├─ vectorstore/employee/                                  │  │
│  │  ├─ vectorstore/hr/                                         │  │
│  │  └─ vectorstore/manager/                                   │  │
│  │                                                              │  │
│  │  User Database (Future):                                    │  │
│  │  └─ users.db                                               │  │
│  │     ├─ username, role, hashed_password                     │  │
│  │     └─ created_at, last_login                              │  │
│  │                                                              │  │
│  │  Chat History DB (Future):                                  │  │
│  │  └─ chat_history.db                                         │  │
│  │     ├─ user_id, question, answer, timestamp                │  │
│  │     └─ confidence_score                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Visualization

### Simple Flow (Current MVP)
```
User Query
    ↓
[Frontend] → HTTP POST → [Backend]
    ↑                        ↓
[HTML/JS]            [RAG Engine]
    ↑                        ↓
[Browser]        [Vectorize + Search FAISS]
                             ↓
                      [Format Prompt]
                             ↓
                   [Call LM Studio API]
                             ↓
                      [Mistral 7B Response]
                             ↓
                    [Parse + Return JSON]
```

### Full Production Flow (Future)
```
User Logs In
    ↓
[Login Form] → HTTP POST → [Auth Service]
    ↓                            ↓
[Token Generated]     [Verify Credentials]
    ↓                            ↓
[Store in Session]   [Create JWT Token]
    ↓                            ↓
[Redirect to Dashboard]
    ↓
User Asks Question (with Role)
    ↓
[Frontend + Token] → HTTP POST → [Backend]
    ↓                              ↓
[Message shown]          [Verify Auth Token]
                              ↓
                        [Verify User Role]
                              ↓
                    [Load Role-Specific Vector Store]
                              ↓
                    [Retrieve Role-Based Documents]
                              ↓
                        [Search FAISS]
                              ↓
                    [Stream Response via SSE]
                              ↓
                    [Track: Q, A, Source, Confidence]
                              ↓
                    [Save to Chat History DB]
                              ↓
                [Display Answer + Citations + Confidence]
```

---

## Implementation Phase Breakdown

### Phase 1: Optimization (Weeks 1-2)

**Status:** ⏳ Ready to Start  
**Goal:** Improve speed and accuracy

**Tasks:**
```
Week 1:
  □ Performance Benchmarking
    ├─ Measure current response times
    ├─ Profile each component
    └─ Identify bottlenecks
  
  □ Retrieval Testing
    ├─ Test k=1,3,5,10 performance
    ├─ Evaluate answer quality
    └─ Document results

Week 2:
  □ Parameter Tuning
    ├─ Adjust chunk_size, overlap
    ├─ Test different temperatures
    ├─ Reduce max_tokens
    └─ Try smaller models
  
  □ Optimization Implementation
    ├─ Update configuration
    ├─ Deploy optimized version
    └─ Re-test and compare
```

**Files to Modify:**
- `backend/rag_engine.py` (config parameters)
- `backend/ingest_documents.py` (chunking)
- `requirements.txt` (model versions)

**Success Criteria:**
- Response time < 90s
- Retrieval accuracy > 85%

---

### Phase 2a: Source Citations (Weeks 3-4)

**Status:** ⏳ Planned  
**Goal:** Add source tracking and citations

**Architecture:**
```
Modified rag_engine.py:

def ask_question_with_citations(question: str):
    # 1. Retrieve documents
    docs = retriever.invoke(question)
    
    # 2. Extract metadata
    sources = []
    for doc in docs:
        sources.append({
            "filename": doc.metadata.get("source", "Unknown"),
            "page": doc.metadata.get("page", "N/A"),
            "snippet": doc.page_content[:100]
        })
    
    # 3. Build context & call LLM
    answer = call_lm_studio(build_prompt(docs, question))
    
    # 4. Return with sources
    return {
        "answer": answer,
        "sources": sources,
        "confidence": 0.92  # similarity score
    }
```

**Files to Create/Modify:**
- Create: `backend/citations_handler.py` (new)
- Modify: `backend/rag_engine.py` (add source extraction)
- Modify: `backend/ingest_documents.py` (preserve metadata)
- Modify: `frontend/script.js` (display citations)
- Modify: `frontend/style.css` (citation styling)

**Frontend UI Change:**
```html
<div class="bot-message">
    <p>Based on the vacation policy, employees...</p>
    <details>
        <summary>📎 Sources (2)</summary>
        <ul>
            <li>company_handbook.pdf - Page 12</li>
            <li>benefits_guide.pdf - Page 5</li>
        </ul>
    </details>
</div>
```

---

### Phase 2b: Streaming Responses (Weeks 4-5)

**Status:** ⏳ Planned  
**Goal:** Show responses as they're generated

**Implementation:**
```python
# backend/app.py - New endpoint

from fastapi.responses import StreamingResponse
import json

@app.post("/ask-stream")
async def ask_stream(q: Question):
    async def generate():
        # Retrieve context
        docs = retriever.invoke(q.question)
        context = build_context(docs)
        prompt = format_prompt(context, q.question)
        
        # Stream from LM Studio
        with requests.post(
            LM_STUDIO_API,
            json={
                "model": "mistral-7b-instruct-v0.3",
                "messages": [{"role": "user", "content": prompt}],
                "stream": True  # CRITICAL
            },
            stream=True
        ) as response:
            for line in response.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        if "choices" in chunk:
                            content = chunk["choices"][0]["delta"].get("content", "")
                            if content:
                                yield f"data: {json.dumps({'content': content})}\n\n"
                    except json.JSONDecodeError:
                        pass
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

**Frontend JavaScript:**
```javascript
async function sendMessageStream() {
    const question = document.getElementById("user-input").value;
    
    // Display user message
    displayMessage("You: " + question);
    
    // Create EventSource for streaming
    const eventSource = new EventSource(
        "http://127.0.0.1:8000/ask-stream",
        {
            method: "POST",
            body: JSON.stringify({question: question})
        }
    );
    
    let botMessage = "";
    const botDiv = createBotMessageDiv();
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        botMessage += data.content;
        botDiv.innerText = "Bot: " + botMessage;
    };
    
    eventSource.onerror = () => {
        eventSource.close();
    };
}
```

**Files to Create/Modify:**
- Modify: `backend/app.py` (add /ask-stream endpoint)
- Modify: `frontend/script.js` (implement EventSource)
- Modify: `frontend/style.css` (streaming animation)

---

### Phase 3: Authentication & Roles (Weeks 6-8)

**Status:** 🔮 Planned  
**Goal:** Multi-user support with role-based access

**File Structure After:**
```
backend/
├── app.py                    (updated with auth routes)
├── auth.py                   (NEW - authentication logic)
├── role_retriever.py         (NEW - role-based filtering)
├── rag_engine.py             (updated with role support)
├── ingest_documents.py       (unchanged)
└── database.py               (NEW - user DB)

frontend/
├── index.html                (main chat, no changes)
├── login.html                (NEW - login form)
├── dashboard.html            (NEW - role-specific dashboard)
├── script.js                 (updated with auth flow)
└── style.css                 (styling)

data/
├── users.db                  (NEW - SQLite user DB)
├── chat_history.db           (NEW - SQLite chat history)
└── [existing PDF folders]

vectorstore/
├── employee/                 (NEW - employee docs only)
├── hr/                       (NEW - hr docs only)
├── manager/                  (NEW - manager docs only)
└── index.faiss              (old - can be removed)
```

**Authentication Flow:**
```
┌─────────────────────────────────────────┐
│ User Visits App                         │
│ URL: http://127.0.0.1:8000/login.html  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Login Form                              │
│ - Username input                        │
│ - Password input                        │
│ - Role dropdown (Employee/HR/Manager)   │
│ - Login button                          │
└─────────────────────────────────────────┘
                    ↓
         POST /login
    {username, password, role}
                    ↓
┌─────────────────────────────────────────┐
│ Auth Service (auth.py)                  │
│ - Verify credentials                    │
│ - Hash password check                   │
│ - Create JWT token                      │
│ - Store user session                    │
└─────────────────────────────────────────┘
                    ↓
    Response: {token, role, expires_at}
                    ↓
┌─────────────────────────────────────────┐
│ Frontend                                │
│ - Store token in localStorage           │
│ - Store role in session                 │
│ - Redirect to index.html               │
└─────────────────────────────────────────┘
                    ↓
         Question Asked
    POST /ask (with token)
                    ↓
┌─────────────────────────────────────────┐
│ Backend                                 │
│ - Verify token                          │
│ - Extract user role                     │
│ - Load role-specific vector store       │
│ - Retrieve docs from role store only    │
│ - Generate answer                       │
│ - Log to chat history                   │
└─────────────────────────────────────────┘
                    ↓
    Response: {answer, sources}
                    ↓
┌─────────────────────────────────────────┐
│ Frontend Display                        │
│ - Show answer                           │
│ - Show role-specific content only       │
└─────────────────────────────────────────┘
```

**Code Changes:**

**New: `backend/auth.py`**
```python
import jwt
import hashlib
from datetime import datetime, timedelta
from typing import Optional

SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"

# Simple in-memory user store (upgrade to DB later)
USERS_DB = {
    "john": {
        "password_hash": hashlib.sha256(b"password123").hexdigest(),
        "role": "employee"
    },
    "alice": {
        "password_hash": hashlib.sha256(b"password123").hexdigest(),
        "role": "hr"
    },
    "bob": {
        "password_hash": hashlib.sha256(b"password123").hexdigest(),
        "role": "manager"
    }
}

def authenticate_user(username: str, password: str) -> Optional[dict]:
    if username not in USERS_DB:
        return None
    
    user = USERS_DB[username]
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    if password_hash == user["password_hash"]:
        return {"username": username, "role": user["role"]}
    
    return None

def create_access_token(data: dict) -> str:
    expires = datetime.utcnow() + timedelta(hours=24)
    payload = {**data, "exp": expires}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.InvalidTokenError:
        return None
```

**Modified: `backend/app.py`**
```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from auth import authenticate_user, create_access_token, verify_token

@app.post("/login")
def login(credentials: LoginCredentials):
    user = authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(user)
    return {"access_token": token, "role": user["role"]}

def get_current_user(credentials: HTTPAuthCredentials = Depends(HTTPBearer())):
    user = verify_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

@app.post("/ask")
def ask(q: Question, current_user = Depends(get_current_user)):
    # Now we have user role!
    answer = ask_question(q.question, role=current_user["role"])
    return {"answer": answer}
```

**New: `backend/role_retriever.py`**
```python
from langchain_community.vectorstores import FAISS

def get_role_specific_retriever(role: str):
    """Load vector store specific to user role"""
    vectorstore_path = f"../vectorstore/{role}"
    
    from langchain_huggingface import HuggingFaceEmbeddings
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    
    vector_db = FAISS.load_local(
        vectorstore_path,
        embeddings,
        allow_dangerous_deserialization=True
    )
    
    return vector_db.as_retriever(search_kwargs={"k": 3})
```

**Modified: `backend/rag_engine.py`**
```python
from role_retriever import get_role_specific_retriever

def ask_question(question: str, role: str = "employee"):
    # Get role-specific retriever
    retriever = get_role_specific_retriever(role)
    
    # Rest is same as before
    docs = retriever.invoke(question)
    context = "\n\n".join([doc.page_content for doc in docs])
    response = call_lm_studio(build_prompt(context, question))
    return response
```

**New: `frontend/login.html`**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Enterprise Chatbot - Login</title>
    <style>
        body { font-family: Arial; max-width: 400px; margin: 100px auto; }
        form { border: 1px solid #ddd; padding: 20px; }
        input, select, button { width: 100%; margin: 10px 0; padding: 8px; }
        button { background-color: #007bff; color: white; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Enterprise Chatbot</h1>
    <form onsubmit="handleLogin(event)">
        <input type="text" id="username" placeholder="Username" required>
        <input type="password" id="password" placeholder="Password" required>
        <select id="role">
            <option value="employee">Employee</option>
            <option value="hr">HR</option>
            <option value="manager">Manager</option>
        </select>
        <button type="submit">Login</button>
    </form>
    
    <script>
        async function handleLogin(event) {
            event.preventDefault();
            
            const response = await fetch("http://127.0.0.1:8000/login", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    username: document.getElementById("username").value,
                    password: document.getElementById("password").value,
                    role: document.getElementById("role").value
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem("token", data.access_token);
                localStorage.setItem("role", data.role);
                window.location.href = "index.html";
            } else {
                alert("Login failed");
            }
        }
    </script>
</body>
</html>
```

**Files to Create:**
- `backend/auth.py`
- `backend/role_retriever.py`
- `backend/database.py` (future - actual DB)
- `frontend/login.html`
- `frontend/dashboard.html` (future)

**Files to Modify:**
- `backend/app.py` (add auth routes)
- `backend/rag_engine.py` (add role parameter)
- `backend/ingest_documents.py` (create role-specific stores)
- `frontend/script.js` (add token handling)
- `frontend/index.html` (add logout button)

---

### Phase 4: Dashboards & Analytics (Weeks 9-10)

**Status:** 🔮 Planned  
**Goal:** Role-specific dashboards and insights

**Dashboard Features by Role:**

**Employee Dashboard:**
- Recent questions & answers
- Frequently asked questions
- Access to employee-specific docs
- Profile settings

**HR Dashboard:**
- Query analytics
- Employee engagement metrics
- Policy document usage
- User management

**Manager Dashboard:**
- Team activity overview
- Query patterns by team
- Performance metrics
- Advanced settings

**Implementation:**
- Create `frontend/dashboard-employee.html`
- Create `frontend/dashboard-hr.html`
- Create `frontend/dashboard-manager.html`
- Create `backend/analytics.py`
- Add endpoints: `/stats`, `/recent-queries`, `/query-logs`

---

## Current Implementation Status

### ✅ Completed (MVP)
```
Level 1: Core RAG System
├─ ✅ Document Loading (PyPDFLoader)
├─ ✅ Text Chunking (RecursiveCharacterTextSplitter)
├─ ✅ Embeddings (Sentence Transformers - MiniLM)
├─ ✅ Vector Database (FAISS)
├─ ✅ Semantic Retrieval (Top-K)
├─ ✅ LLM Integration (Mistral 7B via LM Studio)
├─ ✅ FastAPI Backend
├─ ✅ Web Frontend
└─ ✅ Basic Q&A Functionality
```

### 🚧 In Progress / Optimization Needed
```
Level 2: Performance & Quality
├─ 🔄 Response Speed Optimization
├─ 🔄 Retrieval Accuracy Tuning
├─ 🔄 Response Caching
└─ 🔄 Error Handling
```

### ⏳ Planned (Roadmap)
```
Level 3: Enterprise Features
├─ ⏳ Source Citations
├─ ⏳ Streaming Responses
├─ ⏳ User Authentication
├─ ⏳ Role-Based Access Control
├─ ⏳ User Dashboards
├─ ⏳ Chat History
├─ ⏳ Analytics & Metrics
└─ ⏳ Admin Controls

Level 4: Advanced Features
├─ 🔮 Hybrid Search (Semantic + Keyword)
├─ 🔮 Query Expansion
├─ 🔮 Response Reranking
├─ 🔮 Multi-Modal Support
├─ 🔮 Knowledge Graph Integration
└─ 🔮 Custom Model Training
```

---

## Success Metrics by Phase

### Phase 1: Optimization
- **Response Time:** < 90 seconds (from 120+)
- **Retrieval Accuracy:** > 85%
- **Uptime:** 99%

### Phase 2: Features
- **Source Citations:** 100% of responses
- **Streaming Support:** Working
- **Setup Time:** < 5 minutes

### Phase 3: Authentication
- **Login Success Rate:** 99%
- **Authorization Enforcement:** 100%
- **Role Isolation:** Verified

### Phase 4: Analytics
- **Dashboard Uptime:** 99%
- **Query Logging:** 100%
- **Performance Tracking:** Enabled

---

## Critical Dependencies

### External Services
- **LM Studio** - Local LLM inference (Required)
- **HuggingFace Hub** - Download embeddings (One-time)

### Python Libraries
- `fastapi` - Web framework
- `langchain` - RAG framework
- `faiss-cpu/gpu` - Vector search
- `sentence-transformers` - Embeddings
- `requests` - HTTP calls
- `pydantic` - Data validation
- `python-jose` - JWT tokens (Phase 3)
- `sqlalchemy` - Database ORM (Phase 3)

### Hardware Requirements
- **CPU:** 4+ cores
- **RAM:** 8GB+ (for 7B model)
- **GPU:** 4GB+ (Optional, for speed)
- **Disk:** 10GB+ (for models & vectors)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LM Studio crashes | Total failure | Add health check, auto-restart |
| FAISS corruption | Lost data | Backup strategy, version control |
| Slow LLM inference | Poor UX | Implement streaming, caching |
| Low retrieval accuracy | Wrong answers | Hybrid search, reranking |
| Concurrent requests slow | Scalability issue | Queue system (Celery/RabbitMQ) |
| Auth token leakage | Security breach | HTTPS only, short expiry |
| DB size explosion | Storage issues | Archiving, cleanup policy |

---

## Deployment Strategy

### Development
```bash
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
# Visit: http://127.0.0.1:8000/frontend/index.html
```

### Staging
```bash
# Docker containerization (future)
docker build -t enterprise-rag .
docker run -p 8000:8000 enterprise-rag
```

### Production
```bash
# Gunicorn + Nginx
gunicorn app:app --workers 4 --bind 0.0.0.0:8000
# Behind Nginx reverse proxy
# SSL/TLS enabled
# Rate limiting
# Monitoring
```

---

**Last Updated:** 2024-04  
**Status:** Active Development  
**Next Review:** Post-Phase 1
