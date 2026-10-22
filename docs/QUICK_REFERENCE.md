# 🚀 Enterprise RAG Chatbot - Quick Reference & Implementation Guide

## System Architecture at a Glance

```
USER QUESTION
    ↓
[Frontend HTML/JS]
    ↓ HTTP POST /ask
[FastAPI Backend]
    ↓
[RAG Engine]
├─ Vectorize Question (Embeddings)
├─ Search FAISS Database (Top-K Retrieval)
├─ Build Context (Concatenate chunks)
├─ Format Prompt (Add instructions)
└─ Call LM Studio API (Mistral 7B)
    ↓
[Response]
    ↓ HTTP JSON
[Display in Frontend]
```

---

## 📂 Project Structure Explained

```
enterprise-rag-chatbot/
│
├── backend/                          # FastAPI Backend
│   ├── app.py                        # Main API server
│   ├── rag_engine.py                 # RAG logic (retrieve + generate)
│   ├── ingest_documents.py           # Document ingestion & vectorization
│   └── test_rag.py                   # Testing script
│
├── frontend/                         # Web UI
│   ├── index.html                    # Chat interface (main)
│   ├── login.html                    # Login page (future)
│   ├── chatbot.html                  # Alternative UI (future)
│   ├── script.js                     # Client-side logic
│   └── style.css                     # Styling
│
├── data/                             # Document storage
│   ├── employee/                     # Employee-accessible docs
│   │   └── *.pdf
│   ├── hr/                           # HR-accessible docs
│   │   └── *.pdf
│   └── manager/                      # Manager-accessible docs
│       └── *.pdf
│
├── vectorstore/                      # FAISS Vector Database
│   ├── index.faiss                   # Main index file
│   ├── docstore.pkl                  # Document store
│   └── index.pkl                     # Metadata
│
├── models/                           # Local models (if cached)
│   └── (embedding models stored here)
│
├── scripts/                          # Utility scripts
│   └── (helper scripts)
│
├── requirements.txt                  # Python dependencies
└── WORKFLOW_DOCUMENTATION.md         # This comprehensive guide
```

---

## 🔄 Complete Data Flow Walkthrough

### Request Journey: Question to Answer

```
1️⃣ USER INTERACTION
   User types: "What is the vacation policy?"
   Clicks: "Send" button
   
2️⃣ FRONTEND (script.js)
   Triggers: sendMessage()
   Sends: POST request to backend
   Data: {"question": "What is the vacation policy?"}
   
3️⃣ FASTAPI ENDPOINT (app.py)
   Route: @app.post("/ask")
   Receives: Question object
   Calls: ask_question(question)
   
4️⃣ VECTORIZATION (rag_engine.py)
   Model: sentence-transformers/all-MiniLM-L6-v2
   Input: "What is the vacation policy?" (text)
   Output: [0.123, -0.456, 0.789, ..., 0.234] (384-dim vector)
   
5️⃣ SEMANTIC SEARCH (FAISS)
   Database: vectorstore/index.faiss
   Query: [0.123, -0.456, 0.789, ..., 0.234]
   K: 3 (retrieve top 3 chunks)
   Results: 
   - Chunk 1: "Vacation Policy: 20 days/year..." (similarity: 0.92)
   - Chunk 2: "PTO Request Form..." (similarity: 0.87)
   - Chunk 3: "Annual Leave..." (similarity: 0.85)
   
6️⃣ CONTEXT BUILDING
   Concatenate: Chunk1 + "\n\n" + Chunk2 + "\n\n" + Chunk3
   Result: Multi-chunk context string
   
7️⃣ PROMPT FORMATTING
   System: "You are an enterprise knowledge assistant..."
   Context: [retrieved chunks]
   Question: "What is the vacation policy?"
   
8️⃣ LLM API CALL (LM Studio)
   Endpoint: http://127.0.0.1:1234/v1/chat/completions
   Model: mistral-7b-instruct-v0.3
   Temperature: 0.1 (low randomness)
   Max Tokens: 500
   Timeout: 120 seconds
   
9️⃣ LLM RESPONSE
   Processing: 60-90 seconds typical
   Output: "Based on the vacation policy, employees are entitled..."
   
🔟 RESPONSE PARSING
   Extract: response["choices"][0]["message"]["content"]
   Format: Return as JSON
   
1️⃣1️⃣ HTTP RESPONSE
   Status: 200 OK
   Body: {"answer": "Based on the vacation policy..."}
   Headers: Content-Type: application/json
   
1️⃣2️⃣ FRONTEND DISPLAY
   Receive: JSON response
   Parse: data.answer
   Create: <div> element with bot message
   Append: To chat-box
   Clear: Input field
   Show: User "You: ..." and Bot "Bot: ..."
```

---

## ⚙️ Key Configuration Parameters

### Retrieval Parameters

```python
# backend/rag_engine.py Configuration

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
# Converts text to 384-dimensional vectors
# Trade-off: Speed vs. Accuracy (better models = slower)

VECTOR_DB_PATH = "../vectorstore"
# FAISS index location
# Contains: index.faiss, docstore.pkl, index.pkl

RETRIEVAL_K = 3
# Number of top chunks to retrieve
# Increase (5-10) for more context but slower
# Decrease (1-2) for faster responses

CHUNK_SIZE = 600
# Characters per document chunk
# Larger (800-1000) = more context, fewer chunks
# Smaller (300-500) = more chunks, specific info

CHUNK_OVERLAP = 150
# Characters overlap between chunks
# Prevents splitting important information

LM_STUDIO_API = "http://127.0.0.1:1234/v1/chat/completions"
# LLM API endpoint (must be running)

MODEL_NAME = "mistral-7b-instruct-v0.3"
# Which LLM to use

TEMPERATURE = 0.1
# 0.0 = deterministic (same answer every time)
# 1.0 = random/creative answers
# 0.1 recommended for factual Q&A

MAX_TOKENS = 500
# Maximum response length
# Lower (200) = faster but truncated
# Higher (1000) = longer responses but slower

REQUEST_TIMEOUT = 120
# Seconds to wait for LLM response
```

---

## 📊 Performance Optimization Checklist

### Performance Issues & Quick Fixes

| Issue | Quick Fix | Advanced Solution |
|-------|-----------|-------------------|
| Slow responses (120+ s) | Reduce MAX_TOKENS from 500 to 200 | Use smaller LLM (Phi-2, TinyLlama) |
| | Reduce RETRIEVAL_K from 3 to 1 | Enable GPU acceleration |
| | Lower TEMPERATURE from 0.1 to 0.3 | Implement caching |
| Wrong answers | Increase RETRIEVAL_K from 3 to 5 | Add metadata filtering |
| | Increase CHUNK_SIZE from 600 to 1000 | Use better embeddings |
| | Verify PDFs are readable | Implement reranking |
| OOM errors | Reduce CHUNK_SIZE | Use quantized models |
| | Use CPU instead of GPU | Split vector store |

### Quick Optimization Recipe

```python
# FAST BUT BASIC
CHUNK_SIZE = 400
CHUNK_OVERLAP = 50
RETRIEVAL_K = 1
TEMPERATURE = 0.3
MAX_TOKENS = 200
# Expected: 30-40s response time

# BALANCED (RECOMMENDED)
CHUNK_SIZE = 600
CHUNK_OVERLAP = 150
RETRIEVAL_K = 3
TEMPERATURE = 0.1
MAX_TOKENS = 500
# Expected: 60-90s response time

# ACCURATE BUT SLOW
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
RETRIEVAL_K = 5
TEMPERATURE = 0.1
MAX_TOKENS = 800
# Expected: 120-180s response time
```

---

## 🔧 Setup Instructions (Step-by-Step)

### Prerequisites
- Python 3.10+
- LM Studio running on port 1234
- 8GB+ RAM

### Step 1: Prepare LM Studio
```bash
# Download from https://lmstudio.ai
# After installation:
1. Open LM Studio
2. Search for: mistral-7b-instruct-v0.3
3. Download the model (~4.2 GB)
4. Click "Start Server"
5. Verify: http://127.0.0.1:1234/health
```

### Step 2: Prepare Documents
```bash
# Create data directories
mkdir -p data/employee data/hr data/manager

# Add PDF files to each folder
data/
├── employee/
│   ├── employee_handbook.pdf
│   └── benefits_guide.pdf
├── hr/
│   ├── hr_policies.pdf
│   └── payroll_rules.pdf
└── manager/
    ├── manager_guide.pdf
    └── leadership_handbook.pdf
```

### Step 3: Install Dependencies
```bash
# From project root directory
pip install -r requirements.txt
```

**If requirements.txt is empty, create it:**
```
fastapi==0.104.1
uvicorn==0.24.0
langchain==0.1.0
langchain-community==0.0.1
langchain-huggingface==0.0.1
faiss-cpu==1.7.4
sentence-transformers==2.2.2
requests==2.31.0
python-dotenv==1.0.0
pydantic==2.5.0
```

### Step 4: Create Vector Database
```bash
cd backend
python ingest_documents.py

# Output should show:
# Loading company_handbook.pdf
# Loading employee_handbook.pdf
# [...]
# Splitting documents...
# Creating vector database...
# Vector DB created successfully!
# Saved at: ../vectorstore
```

**Verify created files:**
```
vectorstore/
├── index.faiss        # Main index (~20-50 MB depending on docs)
├── docstore.pkl
└── index.pkl
```

### Step 5: Start Backend Server
```bash
# From backend directory
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Output:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Step 6: Open Frontend
```
URL: http://127.0.0.1:8000/frontend/index.html
(Or http://localhost:8000/frontend/index.html)
```

### Step 7: Test System
```bash
# Test endpoint with curl
curl -X POST http://127.0.0.1:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the vacation policy?"}'

# Expected response:
# {"answer": "Based on the vacation policy, employees are entitled to..."}
```

---

## 🧪 Testing & Debugging

### Test 1: Check LM Studio Connection
```bash
curl http://127.0.0.1:1234/health

# Should return: {"status": "ok"}
```

### Test 2: Check Backend Running
```bash
curl http://127.0.0.1:8000/

# Should return: {"message": "Enterprise RAG Chatbot Running 🚀"}
```

### Test 3: Check Vector Store
```python
# backend/test_retrieval.py
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

vector_db = FAISS.load_local("../vectorstore", embedding_model)
retriever = vector_db.as_retriever(search_kwargs={"k": 3})

docs = retriever.invoke("What is the vacation policy?")
for i, doc in enumerate(docs):
    print(f"\nDoc {i+1}:")
    print(doc.page_content[:200])  # First 200 chars
```

### Test 4: Full System Test
```python
# backend/test_full_system.py
import requests

# Test question
question = "What is the vacation policy?"

# Send request
response = requests.post(
    "http://127.0.0.1:8000/ask",
    json={"question": question},
    timeout=180
)

print("Response:", response.json())
```

---

## 🐛 Troubleshooting

### Problem: "Error connecting to AI server"

**Cause:** LM Studio not running or wrong port

**Fix:**
```bash
# Check if running
curl http://127.0.0.1:1234/health

# If no response, start LM Studio
# Windows: Open "LM Studio.exe"
# Mac: Open "LM Studio" from Applications
# Linux: ./lm-studio

# Then verify:
curl http://127.0.0.1:1234/health
# Should return: {"status": "ok"}
```

---

### Problem: "No vectorstore found"

**Cause:** ingest_documents.py not run yet

**Fix:**
```bash
cd backend
python ingest_documents.py

# Wait for completion (~2-5 mins depending on doc size)
# Check if /vectorstore/ created with files
```

---

### Problem: CORS errors in browser

**Cause:** Backend CORS not configured

**Fix:** Verify in `backend/app.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # This should allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Problem: Slow responses (>120s)

**Cause:** LLM inference taking too long

**Fix:** Apply optimization from earlier section
```python
# In rag_engine.py, try:
RETRIEVAL_K = 1      # Instead of 3
MAX_TOKENS = 200     # Instead of 500
TEMPERATURE = 0.3    # Instead of 0.1
# Or use smaller model
```

---

### Problem: Out of Memory (OOM)

**Cause:** Insufficient RAM or large LLM

**Fix:**
```bash
# Check available RAM
# Windows: Open Task Manager
# Mac: Open Activity Monitor
# Linux: free -h

# If low (<4GB), solutions:
# 1. Use smaller model (Phi-2, TinyLlama)
# 2. Reduce chunk size in ingest_documents.py
# 3. Use GPU instead of CPU
```

---

## 📈 Monitoring & Logging

### Add Basic Logging
```python
# backend/rag_engine.py - Add at top
import logging
import time

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def ask_question(question: str):
    start_time = time.time()
    
    logger.info(f"Question: {question}")
    
    # Retrieve
    retrieval_start = time.time()
    docs = retriever.invoke(question)
    retrieval_time = time.time() - retrieval_start
    logger.info(f"Retrieval took {retrieval_time:.2f}s, docs: {len(docs)}")
    
    # LLM
    llm_start = time.time()
    response = requests.post(...)
    llm_time = time.time() - llm_start
    logger.info(f"LLM took {llm_time:.2f}s")
    
    total_time = time.time() - start_time
    logger.info(f"Total time: {total_time:.2f}s")
    
    return response.json()["choices"][0]["message"]["content"]
```

---

## 🎯 Next Steps Prioritization

### Week 1: Stabilize & Optimize
- [ ] Run performance tests
- [ ] Apply optimization settings
- [ ] Add logging
- [ ] Document common issues

### Week 2-3: Add Citations
- [ ] Modify ingest_documents.py to track source
- [ ] Update rag_engine.py response format
- [ ] Update frontend to display sources

### Week 4: Streaming
- [ ] Implement SSE in FastAPI
- [ ] Update frontend for streaming
- [ ] Test response streaming

### Week 5-6: Authentication
- [ ] Create auth.py
- [ ] Add login endpoint
- [ ] Build role-based retrieval
- [ ] Create login UI

---

## 📚 Important Files Summary

| File | Purpose | Key Components |
|------|---------|-----------------|
| `app.py` | FastAPI server | `/ask` endpoint, CORS |
| `rag_engine.py` | RAG logic | Vectorization, retrieval, LLM call |
| `ingest_documents.py` | Document processing | PDF load, chunk, embed, FAISS |
| `index.html` | Chat UI | Message display, input box |
| `script.js` | Client logic | sendMessage(), fetch API |
| `style.css` | Styling | Chat interface design |
| `requirements.txt` | Dependencies | All Python packages |

---

## 🔗 Useful Commands

```bash
# Start everything fresh
cd backend && python ingest_documents.py && uvicorn app:app --reload

# Test a question
curl -X POST http://127.0.0.1:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Your question here"}'

# Check health
curl http://127.0.0.1:8000/
curl http://127.0.0.1:1234/health

# Monitor LM Studio
curl http://127.0.0.1:1234/v1/models

# Kill processes (if stuck)
# Windows: taskkill /PID [pid] /F
# Mac/Linux: kill -9 [pid]
```

---

## 📞 Support & Resources

- **LM Studio Help:** https://lmstudio.ai/docs
- **LangChain Docs:** https://python.langchain.com/docs
- **FastAPI:** https://fastapi.tiangolo.com/
- **FAISS:** https://github.com/facebookresearch/faiss/wiki
- **Sentence Transformers:** https://www.sbert.net/

---

**Version:** 1.0  
**Last Updated:** 2024-04  
**Status:** Active Development
