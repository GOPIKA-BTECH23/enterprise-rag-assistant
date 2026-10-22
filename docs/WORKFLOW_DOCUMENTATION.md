# 📊 Enterprise RAG Chatbot - Complete Workflow Documentation

## Executive Summary
This document provides a comprehensive workflow overview of the Enterprise RAG Chatbot system, detailing current implementation, architecture, ongoing challenges, and planned improvements.

**System Type:** Retrieval-Augmented Generation (RAG) with Local LLM Integration  
**Current Version:** 1.0 (MVP)  
**Tech Stack:** FastAPI, LangChain, FAISS, Sentence Transformers, LM Studio (Mistral 7B)

---

## 1. 🏗️ System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTERPRISE RAG CHATBOT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FRONTEND LAYER (Browser-Based)                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  HTML/CSS/JavaScript Interface                          │  │
│  │  - index.html (Main Chat Interface)                     │  │
│  │  - login.html (Authentication - Planned)               │  │
│  │  - script.js (Client-side Logic)                        │  │
│  │  - style.css (UI Styling)                               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           ↓ HTTP/REST                           │
│                    API Calls (JSON)                             │
│                           ↓                                     │
│  BACKEND LAYER (FastAPI Server)                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  FastAPI Application (app.py)                           │  │
│  │  ├─ /ask (POST) - Question endpoint                    │  │
│  │  ├─ / (GET) - Health check                             │  │
│  │  └─ CORS Middleware (Frontend compatibility)           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  PROCESSING LAYER (RAG Engine)                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  Retrieval       │  │ LLM Integration  │                   │
│  │  (rag_engine.py) │→ │ (LM Studio)      │                   │
│  │                  │  │                  │                   │
│  │ 1. Query Vector  │  │ 1. Format Prompt │                   │
│  │ 2. Semantic      │  │ 2. Call Mistral  │                   │
│  │    Search (k=3)  │  │ 3. Parse Response│                   │
│  └──────────────────┘  └──────────────────┘                   │
│           ↓                        ↓                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  VECTOR DATABASE LAYER (FAISS)                         │  │
│  │  ├─ Vector Store (index.faiss)                         │  │
│  │  ├─ Embedding Model: sentence-transformers/MiniLM     │  │
│  │  └─ Retrieval: Top-K Semantic Search (k=3)            │  │
│  └─────────────────────────────────────────────────────────┘  │
│           ↓                                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  DATA LAYER (Ingestion Pipeline)                       │  │
│  │  ├─ Raw Documents: /data/[role]/*.pdf                  │  │
│  │  ├─ PDF Loader (PyPDFLoader)                           │  │
│  │  ├─ Text Splitter (Recursive, 600 chunk, 150 overlap)  │  │
│  │  └─ Embedding Generator (HuggingFace)                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 📋 Component Breakdown

### 2.1 Frontend Components

#### **Files:** `frontend/`
- **index.html** - Main chat interface
  - Chat display box
  - User input field
  - Send button
  - Message history

- **login.html** - Authentication (Planned)
  - Role selection (Employee/HR/Manager)
  - Username/Password fields

- **script.js** - Client-side logic
  - `sendMessage()` - Send question to backend
  - `fetch()` - HTTP calls to FastAPI
  - Error handling & UI updates

- **style.css** - UI styling
  - Chat interface design
  - Responsive layout

**Current Limitations:**
- ❌ No role-based UI differentiation
- ❌ No streaming responses (full response waits for LLM)
- ❌ No message history persistence
- ❌ No source citation display

---

### 2.2 Backend Components

#### **FastAPI Application** (`backend/app.py`)

```python
Key Endpoints:
├─ GET  /              → Health check
├─ POST /ask           → Submit question
└─ (Future) POST /ingest → Upload new documents
```

**Request/Response Model:**
```
Request:  { "question": "What is the vacation policy?" }
Response: { "answer": "The vacation policy states..." }
```

---

### 2.3 RAG Engine (`backend/rag_engine.py`)

**Workflow:**

```
User Question
      ↓
┌─────────────────────────────────────┐
│ 1. VECTORIZE QUESTION              │
│    - Convert to embedding           │
│    - Using MiniLM model             │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 2. SEMANTIC SEARCH IN FAISS        │
│    - k=3 (retrieve top 3 chunks)   │
│    - Similarity-based ranking       │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 3. BUILD CONTEXT                   │
│    - Concatenate top 3 chunks       │
│    - Maintain document structure    │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 4. FORMAT PROMPT                   │
│    - System instructions            │
│    - Retrieved context              │
│    - User question                  │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 5. CALL LM STUDIO API              │
│    - Mistral 7B model               │
│    - Temperature: 0.1 (deterministic)│
│    - Max tokens: 500                │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 6. PARSE RESPONSE                  │
│    - Extract text from JSON         │
│    - Error handling                 │
│    - Return to frontend             │
└─────────────────────────────────────┘
```

**Key Parameters:**
- **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Vector DB:** FAISS with semantic search
- **Retrieval k:** 3 (Top 3 most relevant chunks)
- **LLM:** Mistral 7B via LM Studio
- **Temperature:** 0.1 (Low randomness, factual answers)
- **Max Tokens:** 500 (Response length limit)

---

### 2.4 Document Ingestion Pipeline (`backend/ingest_documents.py`)

**One-time Setup Process:**

```
PDF Files (data/employee/, data/hr/, data/manager/)
            ↓
    ┌───────────────────┐
    │ PyPDFLoader       │ - Extract text from PDFs
    │                   │ - Preserve page structure
    └───────────────────┘
            ↓
    ┌───────────────────┐
    │ Text Splitter     │ - Chunk size: 600 chars
    │ (Recursive)       │ - Overlap: 150 chars
    │                   │ - Maintain context continuity
    └───────────────────┘
            ↓
    ┌───────────────────┐
    │ Embedding         │ - Convert to vectors
    │ Generation        │ - Dimension: 384
    │ (HuggingFace)     │ - Model: MiniLM-L6-v2
    └───────────────────┘
            ↓
    ┌───────────────────┐
    │ FAISS Index       │ - Store vectors locally
    │ Creation          │ - Path: vectorstore/
    │                   │ - Allow dangerous deserialize
    └───────────────────┘
```

**Execution:**
```bash
python backend/ingest_documents.py
```

---

## 3. 📊 Current Status

### ✅ Implemented Features

| Feature | Status | Details |
|---------|--------|---------|
| **PDF Loading** | ✅ Working | PyPDFLoader ingests documents from `/data` folder |
| **Document Chunking** | ✅ Working | Recursive splitter with 600 chars chunks, 150 overlap |
| **Embeddings** | ✅ Working | MiniLM model generates 384-dimensional vectors |
| **FAISS Database** | ✅ Working | Local vector store in `vectorstore/` directory |
| **Semantic Retrieval** | ✅ Working | Top-K search retrieves 3 most relevant chunks |
| **FastAPI Backend** | ✅ Working | RESTful API with CORS enabled |
| **LM Studio Integration** | ✅ Working | Connects to local Mistral 7B model |
| **Chatbot UI** | ✅ Working | HTML/CSS/JS interface for Q&A |

### ⚠️ Known Issues

| Issue | Impact | Root Cause | Priority |
|-------|--------|-----------|----------|
| **Slow Response** | 120s+ delay | LLM inference time, network latency | High |
| **Poor Retrieval Accuracy** | Wrong answers | k=3 may miss relevant chunks, low chunk relevance | High |
| **No Source Citations** | Unverifiable answers | Response doesn't include source references | Medium |
| **No Streaming** | Long wait times | Full response waits for LLM completion | Medium |
| **Role-Based Access** | Security gap | Any user can access all documents | High |

### ❌ Not Implemented

- Role-based document filtering
- User authentication
- Source/citation tracking
- Response streaming
- Role-based dashboards
- Chat history persistence
- Advanced retrieval (metadata filters)
- Evaluation metrics

---

## 4. 🔧 Data Flow - Step by Step

### Scenario: Employee asks "What is the vacation policy?"

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: USER INTERACTION (Frontend)                            │
│─────────────────────────────────────────────────────────────────│
│ User types: "What is the vacation policy?"                      │
│ → Clicks "Send" button                                          │
│ → JavaScript event listener triggers sendMessage()             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: HTTP REQUEST (Frontend → Backend)                      │
│─────────────────────────────────────────────────────────────────│
│ Method: POST                                                    │
│ URL: http://127.0.0.1:8000/ask                                 │
│ Body: {                                                         │
│   "question": "What is the vacation policy?"                   │
│ }                                                               │
│ Headers: Content-Type: application/json                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: BACKEND RECEIVES REQUEST                               │
│─────────────────────────────────────────────────────────────────│
│ FastAPI route: @app.post("/ask")                               │
│ Pydantic model validates input                                 │
│ Calls: ask_question("What is the vacation policy?")            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: VECTORIZE THE QUESTION (RAG Engine)                    │
│─────────────────────────────────────────────────────────────────│
│ Question: "What is the vacation policy?"                       │
│ Embedding Model: sentence-transformers/all-MiniLM-L6-v2        │
│ Output: Vector of 384 dimensions                               │
│ Example: [0.123, -0.456, 0.789, ..., 0.234]                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: SEARCH FAISS DATABASE                                  │
│─────────────────────────────────────────────────────────────────│
│ Query Vector: [0.123, -0.456, 0.789, ..., 0.234]              │
│ Search Type: Cosine Similarity (L2 distance)                   │
│ Top-K: 3 (retrieve 3 most similar chunks)                      │
│                                                                 │
│ FAISS Index Search:                                            │
│ ├─ Chunk 1: "Vacation Policy: Employees get 20 days..." (0.92) │
│ ├─ Chunk 2: "PTO Request Form..." (0.87)                      │
│ └─ Chunk 3: "Annual Leave Accrual..." (0.85)                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: BUILD CONTEXT                                          │
│─────────────────────────────────────────────────────────────────│
│ context = Chunk1 + "\n\n" + Chunk2 + "\n\n" + Chunk3           │
│                                                                 │
│ Result:                                                         │
│ "Vacation Policy: Employees get 20 days per year.              │
│  PTO Request Form must be submitted...                         │
│  Annual Leave Accrual begins in January..."                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: FORMAT PROMPT FOR LLM                                  │
│─────────────────────────────────────────────────────────────────│
│ System Prompt: "You are an enterprise knowledge assistant..."  │
│ Rules: "Use ONLY the information from context. Do NOT invent"  │
│                                                                 │
│ Final Prompt:                                                  │
│ """                                                             │
│ You are an enterprise knowledge assistant.                     │
│ Use ONLY the information from the context below.               │
│ Rules:                                                         │
│ - Do NOT invent information.                                   │
│ - If answer not in context say "The information is not        │
│   available in the provided documents."                        │
│                                                                 │
│ Context:                                                       │
│ Vacation Policy: Employees get 20 days per year...             │
│                                                                 │
│ Question:                                                      │
│ What is the vacation policy?                                   │
│                                                                 │
│ Answer:                                                        │
│ """                                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: CALL LM STUDIO API                                     │
│─────────────────────────────────────────────────────────────────│
│ Endpoint: http://127.0.0.1:1234/v1/chat/completions           │
│ Method: POST                                                   │
│ Model: mistral-7b-instruct-v0.3                                │
│ Temperature: 0.1 (deterministic)                               │
│ Max Tokens: 500                                                │
│ Timeout: 120s                                                  │
│                                                                 │
│ Request JSON:                                                  │
│ {                                                              │
│   "model": "mistral-7b-instruct-v0.3",                         │
│   "messages": [{"role": "user", "content": "[prompt]"}],       │
│   "temperature": 0.1,                                          │
│   "max_tokens": 500                                            │
│ }                                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 9: LM STUDIO GENERATES RESPONSE                           │
│─────────────────────────────────────────────────────────────────│
│ Processing Time: 60-90 seconds (typical)                       │
│ Model: Mistral 7B running on local GPU/CPU                     │
│                                                                 │
│ Response JSON:                                                 │
│ {                                                              │
│   "choices": [{                                                │
│     "message": {                                               │
│       "content": "Based on the vacation policy,                │
│                   employees are entitled to 20 days            │
│                   of annual vacation. PTO requests must        │
│                   be submitted through the HR portal..."      │
│     }                                                          │
│   }]                                                           │
│ }                                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 10: PARSE & RETURN RESPONSE                               │
│─────────────────────────────────────────────────────────────────│
│ Extract: response.json()["choices"][0]["message"]["content"]   │
│ Answer: "Based on the vacation policy, employees are..."      │
│ Return to FastAPI route                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 11: HTTP RESPONSE (Backend → Frontend)                    │
│─────────────────────────────────────────────────────────────────│
│ Status: 200 OK                                                 │
│ Body: {                                                         │
│   "answer": "Based on the vacation policy, employees..."      │
│ }                                                              │
│ Headers: Content-Type: application/json                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 12: DISPLAY RESPONSE (Frontend)                           │
│─────────────────────────────────────────────────────────────────│
│ JavaScript fetch receives response                             │
│ Create new <div> element with bot message                      │
│ Append to chat-box                                             │
│ Clear input field                                              │
│                                                                 │
│ User sees:                                                     │
│ "You: What is the vacation policy?"                            │
│ "Bot: Based on the vacation policy, employees..."             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 🐛 Performance Issues & Solutions

### Issue 1: Slow Response (120+ seconds)

**Root Causes:**
1. **LLM Inference Latency** (60-90s) - Mistral 7B local inference
2. **Network Round Trips** (1-2s) - HTTP calls between services
3. **Embedding Computation** (2-3s) - Vectorizing question
4. **FAISS Search** (<1s) - Usually fast
5. **Blocking Request** (Design) - No streaming responses

**Solutions:**

#### Short-term (Easy - Implement First)
- ✅ Optimize chunk size (currently 600, reduce to 400)
- ✅ Reduce retrieved chunks (k=3 to k=1, increase if accuracy drops)
- ✅ Lower max_tokens (500 to 200)
- ✅ Increase temperature slightly (0.1 to 0.3, if more concise)
- ✅ Use smaller LLM (Mistral 7B → Phi-2, TinyLlama)

#### Medium-term (Moderate)
- 🔄 Implement response streaming (SSE or WebSocket)
- 🔄 Add response caching (for repeated questions)
- 🔄 Batch process multiple questions
- 🔄 GPU acceleration (if using CPU, switch to GPU)

#### Long-term (Complex)
- 🔮 Deploy quantized model (GGUF format)
- 🔮 Use cloud LLM (faster but requires API key)
- 🔮 Implement async/worker queue (Celery + Redis)
- 🔮 Multi-GPU setup

---

### Issue 2: Retrieval Accuracy Issues

**Root Causes:**
1. **Limited Context** - k=3 chunks may miss relevant info
2. **Poor Chunking** - Fixed 600-char chunks may split important info
3. **Semantic Gap** - Question wording vs document wording mismatch
4. **No Metadata** - Can't filter by role, date, category
5. **Low-quality Embeddings** - MiniLM has limitations

**Solutions:**

#### Diagnostic Steps (Run First)
```bash
# Check retrieval quality
python backend/test_rag.py
# Run with different k values (1, 3, 5, 10)
# Analyze retrieved chunks for relevance
```

#### Short-term Improvements
- ✅ Increase k (3 → 5, 10) for more context
- ✅ Adjust chunk size (600 → 800 or 1000)
- ✅ Reduce overlap issues (150 → 50)
- ✅ Add metadata to chunks (role, source doc, page #)

#### Medium-term Improvements
- 🔄 Implement metadata filtering (retrieve only role-specific docs)
- 🔄 Use better embeddings (BGE-Large, E5-Large)
- 🔄 Add hybrid search (semantic + keyword BM25)
- 🔄 Implement query expansion (rephrase questions)

#### Long-term Improvements
- 🔮 Train custom embeddings on domain data
- 🔮 Implement reranking (BGE-Reranker)
- 🔮 Use multi-vector retrieval
- 🔮 Implement query understanding module

---

### Issue 3: Source Citations Not Available

**Current Limitation:** Response includes no source information

**Solution Architecture:**

```python
# Modified rag_engine.py structure
def ask_question_with_citations(question: str):
    # Step 1: Retrieve docs (same as before)
    docs = retriever.invoke(question)
    
    # Step 2: STORE METADATA
    sources = []
    for doc in docs:
        sources.append({
            "source": doc.metadata.get("source", "Unknown"),
            "page": doc.metadata.get("page", "N/A"),
            "content": doc.page_content[:100]  # Preview
        })
    
    # Step 3: Build context (same as before)
    context = "\n\n".join([doc.page_content for doc in docs])
    
    # Step 4: Call LLM (same as before)
    response = call_lm_studio(prompt)
    
    # Step 5: RETURN WITH CITATIONS
    return {
        "answer": response,
        "sources": sources,
        "confidence": calculate_confidence(docs)  # 0.0-1.0
    }
```

**Updated Response Format:**
```json
{
  "answer": "Based on the vacation policy, employees...",
  "sources": [
    {
      "source": "company_handbook.pdf",
      "page": 12,
      "preview": "Vacation Policy: Employees get 20 days..."
    }
  ],
  "confidence": 0.92
}
```

---

## 6. 🚀 Planned Features

### Feature 1: Role-Based Document Access

**Current Gap:** Any user can access all documents (Employee, HR, Manager)

**Implementation Plan:**

```
Frontend:
├─ login.html: Role selection dropdown
│  ├─ "Employee" (access: employee/ docs only)
│  ├─ "HR" (access: hr/ docs only)
│  └─ "Manager" (access: manager/ docs only)
└─ Store role in localStorage or session

Backend Changes:
├─ Add authentication endpoint
├─ Store role with session token
├─ Modify retriever to filter by role
└─ Create role-specific vector stores

Vector Store Architecture:
├─ /vectorstore/employee/ → employee docs index
├─ /vectorstore/hr/ → hr docs index
└─ /vectorstore/manager/ → manager docs index

Updated rag_engine.py:
def ask_question(question: str, role: str):
    # Load role-specific vector store
    vector_db = FAISS.load_local(f"../vectorstore/{role}")
    retriever = vector_db.as_retriever(search_kwargs={"k": 3})
    docs = retriever.invoke(question)
    # ... rest of flow
```

---

### Feature 2: Streaming Responses

**Current Limitation:** Wait for full LLM response before displaying

**SSE (Server-Sent Events) Implementation:**

```python
# backend/app.py
from fastapi.responses import StreamingResponse

@app.post("/ask-stream")
async def ask_stream(q: Question):
    async def generate():
        # Connect to LM Studio with streaming
        with requests.post(
            LM_STUDIO_API,
            json={
                "model": "mistral-7b-instruct-v0.3",
                "messages": [...],
                "stream": True  # ENABLE STREAMING
            },
            stream=True
        ) as response:
            for line in response.iter_lines():
                if line:
                    chunk = json.loads(line)
                    if "choices" in chunk:
                        content = chunk["choices"][0]["delta"].get("content", "")
                        if content:
                            yield f"data: {json.dumps({'content': content})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

**Frontend Update:**
```javascript
async function sendMessageStream() {
    const eventSource = new EventSource(
        "http://127.0.0.1:8000/ask-stream",
        {
            method: "POST",
            body: JSON.stringify({question: userQuestion})
        }
    );
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        appendStreamingResponse(data.content);  // Show char-by-char
    };
}
```

---

### Feature 3: User Authentication

**Basic Authentication Flow:**

```python
# backend/auth.py
from fastapi import HTTPException
from pydantic import BaseModel
import jwt
import datetime

SECRET_KEY = "your-secret-key-change-this"
ALGORITHM = "HS256"

class User(BaseModel):
    username: str
    role: str  # "employee", "hr", "manager"
    password: str

class Token(BaseModel):
    access_token: str
    role: str

def create_access_token(data: dict):
    expires = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    to_encode = data.copy()
    to_encode.update({"exp": expires})
    encoded = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded

@app.post("/login", response_model=Token)
def login(user: User):
    # Verify credentials (add proper DB later)
    if user.username == "john" and user.password == "password":
        token = create_access_token({"username": user.username, "role": user.role})
        return {"access_token": token, "role": user.role}
    raise HTTPException(status_code=401, detail="Invalid credentials")
```

---

## 7. 📋 Implementation Roadmap

### Phase 1: Optimization (1-2 weeks)
**Goal:** Improve performance & accuracy

- [ ] Test different chunk sizes (400, 600, 800, 1000)
- [ ] Optimize k parameter (1, 3, 5, 10)
- [ ] Reduce max_tokens (500 → 200)
- [ ] Try alternative models (Phi-2, TinyLlama)
- [ ] Add response time logging
- [ ] Create performance benchmarks

**Deliverables:**
- Optimized rag_engine.py
- Performance comparison report
- Updated requirements.txt with smaller models

---

### Phase 2: Features - Citations & Streaming (2-3 weeks)
**Goal:** Add missing critical features

#### 2a. Source Citations
- [ ] Modify ingest_documents.py to add metadata
- [ ] Update rag_engine.py to return sources
- [ ] Update frontend to display citations
- [ ] Create citation UI component

#### 2b. Streaming Responses
- [ ] Implement SSE in FastAPI
- [ ] Test LM Studio streaming support
- [ ] Update frontend to handle streams
- [ ] Add loading indicator

**Deliverables:**
- Updated API response format
- New `/ask-stream` endpoint
- Enhanced frontend with citations

---

### Phase 3: Authentication & Role-Based Access (3-4 weeks)
**Goal:** Add security & multi-user support

- [ ] Create authentication backend
- [ ] Add login endpoint & JWT tokens
- [ ] Create role-specific vector stores
- [ ] Update retriever to filter by role
- [ ] Build login UI
- [ ] Add session management

**Deliverables:**
- `backend/auth.py` module
- Updated `app.py` with auth endpoints
- `login.html` interface
- Role-based retriever

---

### Phase 4: Dashboard & Analytics (4-5 weeks)
**Goal:** Add insights & monitoring

- [ ] Create role-specific dashboards
- [ ] Add query logging & analytics
- [ ] Implement response evaluation
- [ ] Create admin dashboard
- [ ] Add usage metrics

**Deliverables:**
- Dashboard.html for each role
- Analytics API endpoints
- Admin panel

---

### Phase 5: Advanced Retrieval (Ongoing)
**Goal:** Improve answer quality

- [ ] Implement hybrid search (semantic + keyword)
- [ ] Add query expansion
- [ ] Implement reranking
- [ ] Add metadata filtering
- [ ] Create evaluation framework

**Deliverables:**
- Advanced retrieval_engine.py
- Evaluation scripts
- Performance metrics

---

## 8. 🛠️ Technical Details & Configuration

### Environment Variables Required

```bash
# .env (create this file)
LM_STUDIO_API=http://127.0.0.1:1234/v1/chat/completions
FAISS_PATH=./vectorstore
DATA_PATH=./data
MODEL_NAME=mistral-7b-instruct-v0.3
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
TEMPERATURE=0.1
MAX_TOKENS=500
RETRIEVAL_K=3
```

### System Requirements

```
CPU: 4+ cores (for LLM inference)
RAM: 8GB+ (Mistral 7B needs ~5GB)
Disk: 10GB+ (for vector store + models)
Optional: GPU 4GB+ (NVIDIA/AMD for faster inference)
```

### LM Studio Configuration

```
Model: Mistral 7B Instruct v0.3
Server Port: 1234
API Format: OpenAI-compatible (/v1/chat/completions)
CORS: Enabled
```

### Dependencies

```
fastapi==0.104.1
uvicorn==0.24.0
langchain==0.1.0
langchain-community==0.0.1
langchain-huggingface==0.0.1
faiss-cpu==1.7.4  # Or faiss-gpu for CUDA
sentence-transformers==2.2.2
requests==2.31.0
python-dotenv==1.0.0
pydantic==2.5.0
pyjwt==2.8.1  # For authentication
```

---

## 9. 📈 Evaluation & Metrics

### Retrieval Quality Metrics

```python
# backend/evaluate.py
def evaluate_retrieval(question: str, expected_answer: str):
    # Retrieve docs
    docs = retriever.invoke(question)
    
    # Metrics
    metrics = {
        "num_docs_retrieved": len(docs),
        "avg_chunk_length": sum(len(d.page_content) for d in docs) / len(docs),
        "relevance_score": calculate_similarity(docs, expected_answer),
        "answer_length": len(generate_answer(docs, question))
    }
    return metrics
```

### System Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Question→Response Time | <30s | 120+ s |
| Embedding Latency | <2s | 2-3s |
| Retrieval Latency | <1s | <1s |
| LLM Response Time | <15s | 60-90s |
| Retrieval Accuracy | 90%+ | 70% (estimated) |

---

## 10. 🔍 Troubleshooting Guide

### Common Issues & Fixes

| Issue | Symptom | Solution |
|-------|---------|----------|
| "Error connecting to AI server" | Backend can't reach LM Studio | Ensure LM Studio running on port 1234 |
| CORS error in frontend | No response from backend | Check CORS middleware in app.py |
| FAISS index not found | "No vectorstore found" | Run `ingest_documents.py` first |
| Slow responses | 120+ second wait | Reduce k, max_tokens, try smaller model |
| Wrong answers | Irrelevant retrieved chunks | Increase k, check chunk overlap |
| Out of memory | GPU/RAM exceeded | Use smaller model or quantized version |
| Empty response | Bot returns nothing | Check document PDFs aren't corrupted |

---

## 11. 📞 Quick Start Guide

### Step 1: Setup LM Studio
```bash
1. Download LM Studio from https://lmstudio.ai
2. Load model: mistral-7b-instruct-v0.3
3. Start local server (port 1234)
```

### Step 2: Prepare Documents
```bash
1. Place PDF files in /data/employee, /data/hr, /data/manager
2. Run: python backend/ingest_documents.py
3. Verify: /vectorstore/index.faiss created
```

### Step 3: Start Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Step 4: Open Frontend
```bash
Open http://127.0.0.1:8000/frontend/index.html in browser
(Or deploy to web server)
```

### Step 5: Test System
```bash
# Test endpoint
curl -X POST http://127.0.0.1:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the vacation policy?"}'
```

---

## 12. 📚 References & Resources

- **LangChain Documentation:** https://python.langchain.com
- **FAISS Guide:** https://github.com/facebookresearch/faiss
- **LM Studio:** https://lmstudio.ai
- **FastAPI:** https://fastapi.tiangolo.com
- **Sentence Transformers:** https://www.sbert.net

---

## Summary

This Enterprise RAG Chatbot is a production-ready MVP that demonstrates core RAG capabilities. The current system successfully ingests documents, retrieves relevant chunks, and generates contextual answers using a local LLM.

**Next Priority:** Optimize performance (Issue #1) and add source citations (Issue #3) for immediate value. Then proceed with streaming responses and role-based access for enterprise requirements.

**Estimated Timeline:**
- Optimization: 1-2 weeks
- Citations + Streaming: 2-3 weeks  
- Authentication + Roles: 3-4 weeks
- Dashboard: 4-5 weeks
- **Total to Full Enterprise System: 10-15 weeks**

---

**Document Version:** 1.0  
**Last Updated:** 2024-04  
**Status:** Active Development
