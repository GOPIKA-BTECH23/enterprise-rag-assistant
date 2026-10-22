
import os
import json
import logging
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from config import CORS_ORIGINS, DATA_DIR, LLM_PROVIDER, LLM_MODEL
from rag_engine import ask_question_with_role, ask_question_stream, generate_suggestions
from auth import (
    authenticate_user, create_access_token, verify_token,
    LoginRequest, TokenResponse, is_token_blacklisted,
    logout_token, create_user, get_all_users,
)
from analytics import (
    log_query, log_chat, submit_feedback,
    get_query_stats, get_user_activity, get_chat_history,
    get_evaluation_metrics, get_performance_metrics,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Enterprise RAG Chatbot",
    description="AI Knowledge Assistant powered by FAISS + Groq / LM Studio",
    version="3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"Server ready | LLM: {LLM_PROVIDER} ({LLM_MODEL}) | CORS origins: {CORS_ORIGINS}")


# ==================== MODELS ====================

class Question(BaseModel):
    question: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class FeedbackRequest(BaseModel):
    query_id: int
    feedback: int  # 1 = thumbs up, -1 = thumbs down


# ==================== AUTH HELPERS ====================

def verify_auth_header(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    if is_token_blacklisted(token):
        raise HTTPException(status_code=401, detail="Token has been revoked")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload


# ==================== PUBLIC ENDPOINTS ====================

@app.get("/")
def home():
    return {
        "message": "Enterprise RAG Chatbot v3.0",
        "features": ["RAG", "Citations", "Streaming", "Auth", "Analytics", "Feedback", "Suggestions"],
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "3.0", "llm_provider": LLM_PROVIDER, "llm_model": LLM_MODEL}


@app.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest):
    user = authenticate_user(credentials.username, credentials.password, credentials.role)
    if not user:
        logger.warning(f"Failed login: {credentials.username}")
        raise HTTPException(status_code=401, detail="Invalid credentials or role mismatch")

    token, expires_in = create_access_token({"username": user["username"], "role": user["role"]})
    logger.info(f"Login: {user['username']} ({user['role']})")

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        role=user["role"],
        username=user["username"],
    )


# ==================== AUTHENTICATED ENDPOINTS ====================

@app.post("/logout")
def logout(
    current_user=Depends(verify_auth_header),
    authorization: Optional[str] = Header(None),
):
    if authorization:
        token = authorization.split()[-1]
        logout_token(token)
    logger.info(f"Logout: {current_user['username']}")
    return {"message": "Successfully logged out"}


@app.post("/change-password")
def change_password_endpoint(
    req: ChangePasswordRequest,
    current_user=Depends(verify_auth_header),
):
    from auth import change_password
    if not change_password(current_user["username"], req.old_password, req.new_password):
        raise HTTPException(status_code=400, detail="Failed to change password")
    return {"message": "Password changed successfully"}


@app.get("/user/info")
def get_user_info(current_user=Depends(verify_auth_header)):
    return {"username": current_user["username"], "role": current_user["role"], "authenticated": True}


# ==================== CHAT ENDPOINTS ====================

@app.post("/ask")
def ask(q: Question, current_user=Depends(verify_auth_header)):
    role = current_user.get("role", "employee")
    result = ask_question_with_role(q.question, role=role)

    query_id = log_query(
        username=current_user["username"],
        role=role,
        question=q.question,
        answer=result["answer"],
        confidence=result.get("confidence", 0.0),
        response_time_ms=result.get("total_time_ms", 0),
        sources_count=len(result.get("sources", [])),
    )
    log_chat(
        username=current_user["username"],
        role=role,
        question=q.question,
        answer=result["answer"],
        sources=result.get("sources", []),
        confidence=result.get("confidence", 0.0),
        response_time_ms=result.get("total_time_ms", 0),
    )

    result["query_id"] = query_id
    return result


@app.post("/ask-stream")
def ask_stream(q: Question, current_user=Depends(verify_auth_header)):
    role = current_user.get("role", "employee")

    query_id = log_query(
        username=current_user["username"],
        role=role,
        question=q.question,
        answer="[streaming]",
        confidence=0.0,
        response_time_ms=0,
        sources_count=0,
    )

    def generate():
        yield f"data: {json.dumps({'type': 'query_id', 'query_id': query_id})}\n\n"
        try:
            for chunk in ask_question_stream(q.question, role=role):
                yield f"data: {chunk}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/suggestions")
def get_suggestions(q: Question, current_user=Depends(verify_auth_header)):
    role = current_user.get("role", "employee")
    return generate_suggestions(q.question, role)


@app.get("/chat/history")
def chat_history(limit: int = 50, current_user=Depends(verify_auth_header)):
    return {"history": get_chat_history(current_user["username"], limit=limit)}


# ==================== FEEDBACK ====================

@app.post("/feedback")
def feedback_endpoint(req: FeedbackRequest, current_user=Depends(verify_auth_header)):
    if req.feedback not in (1, -1):
        raise HTTPException(status_code=400, detail="Feedback must be 1 (up) or -1 (down)")
    submit_feedback(req.query_id, req.feedback)
    return {"message": "Feedback recorded"}


# ==================== DOCUMENTS ====================

@app.get("/documents/list")
def list_documents(current_user=Depends(verify_auth_header)):
    role = current_user["role"]
    data_path = DATA_DIR
    extensions = (".pdf", ".docx", ".doc")

    subfolders = ["employee", "hr", "manager"] if role == "admin" else [role]
    docs = []
    for subfolder in subfolders:
        folder = os.path.join(data_path, subfolder)
        if os.path.exists(folder):
            for f in sorted(os.listdir(folder)):
                if f.endswith(extensions):
                    docs.append({
                        "filename": f,
                        "role": subfolder,
                        "doc_url": f"{subfolder}/{f}",
                    })

    return {"documents": docs}


# ==================== ANALYTICS ====================

@app.get("/analytics/stats")
def get_stats(
    days: int = 7,
    role: Optional[str] = None,
    current_user=Depends(verify_auth_header),
):
    if current_user["role"] != "admin" and role and role != current_user["role"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user["role"] != "admin":
        role = current_user["role"]
    return get_query_stats(days=days, role=role)


@app.get("/analytics/performance")
def get_perf_metrics(current_user=Depends(verify_auth_header)):
    if current_user["role"] not in ("admin", "hr"):
        raise HTTPException(status_code=403, detail="Not authorized")
    return get_performance_metrics()


@app.get("/analytics/activity")
def get_activity(limit: int = 50, current_user=Depends(verify_auth_header)):
    if current_user["role"] in ("admin", "hr"):
        return get_user_activity(limit=limit)
    return get_user_activity(username=current_user["username"], limit=limit)


@app.get("/metrics/evaluation")
def evaluation_metrics(current_user=Depends(verify_auth_header)):
    return get_evaluation_metrics()


# ==================== ADMIN ====================

@app.post("/admin/create-user")
def create_new_user(credentials: LoginRequest, current_user=Depends(verify_auth_header)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    if not create_user(credentials.username, credentials.password, credentials.role):
        raise HTTPException(status_code=400, detail="User already exists or invalid role")
    logger.info(f"User created: {credentials.username} by {current_user['username']}")
    return {"message": f"User {credentials.username} created"}


@app.get("/admin/users")
def list_users(current_user=Depends(verify_auth_header)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    users = get_all_users()
    return {"users": users, "total": len(users)}


@app.get("/admin/stats-detailed")
def get_detailed_stats(days: int = 30, current_user=Depends(verify_auth_header)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return {
        "overall": get_query_stats(days=days),
        "performance": get_performance_metrics(),
        "evaluation": get_evaluation_metrics(),
        "recent_activity": get_user_activity(limit=20),
    }


# ==================== STATIC DOCUMENTS ====================
# Mounted last: a mount at "/documents" matches every "/documents/..." path, so it would
# shadow routes like /documents/list if it were registered before them.
if os.path.exists(DATA_DIR):
    app.mount("/documents", StaticFiles(directory=DATA_DIR), name="documents")
