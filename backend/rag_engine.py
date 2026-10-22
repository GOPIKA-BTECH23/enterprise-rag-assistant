import os
import json
import logging
import time
from typing import List, Dict, Tuple
import requests
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from datetime import datetime

from config import (
    LLM_PROVIDER, LLM_MODEL, GROQ_API_URL, GROQ_API_KEY, LM_STUDIO_URL, VECTOR_DIR,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== CONFIGURATION ====================
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
RETRIEVAL_K = 3
TEMPERATURE = 0.1
MAX_TOKENS = 500
REQUEST_TIMEOUT = 120

NOT_FOUND_ANSWER = "I don't have information about this in the available documents. Please contact HR directly."
NO_INDEX_ANSWER = "The document index has not been built yet. Please run ingest_documents.py first."

logger.info(f"LLM provider: {LLM_PROVIDER} | model: {LLM_MODEL}")

# Load embedding model
embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)

_store_cache: Dict[str, FAISS] = {}


def _load_store(path: str) -> FAISS:
    if path not in _store_cache:
        _store_cache[path] = FAISS.load_local(path, embedding_model, allow_dangerous_deserialization=True)
    return _store_cache[path]


# Load the combined FAISS store (may not exist if ingest hasn't been run yet)
try:
    vector_db = _load_store(VECTOR_DIR)
    logger.info("Default vectorstore loaded")
except Exception as e:
    logger.warning(f"Could not load default vectorstore: {e}. Run ingest_documents.py first.")
    vector_db = None


# ==================== LLM CLIENT ====================

class LLMError(Exception):
    """An LLM failure with a message that is safe to show to the user."""

    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.message = message
        self.code = code


def _llm_endpoint() -> Tuple[str, Dict[str, str]]:
    if LLM_PROVIDER == "groq":
        if not GROQ_API_KEY:
            raise LLMError(
                "The AI model is not configured: GROQ_API_KEY is missing. "
                "Set it in backend/.env (local) or as a Hugging Face Space secret (deployment).",
                "LLM_NOT_CONFIGURED",
            )
        return GROQ_API_URL, {"Authorization": f"Bearer {GROQ_API_KEY}"}
    if LLM_PROVIDER == "lmstudio":
        return LM_STUDIO_URL, {}
    raise LLMError(
        f"Unknown LLM_PROVIDER '{LLM_PROVIDER}'. Use 'groq' or 'lmstudio'.",
        "LLM_NOT_CONFIGURED",
    )


def _is_model_unavailable(resp: requests.Response) -> bool:
    # Groq: 404 "model_not_found", or 400 "model_decommissioned" for retired models
    if resp.status_code == 404:
        return True
    try:
        err = resp.json().get("error", {})
    except ValueError:
        return False
    if not isinstance(err, dict):  # LM Studio may return {"error": "<message>"}
        err = {"message": str(err)}
    code = str(err.get("code", ""))
    msg = str(err.get("message", "")).lower()
    return code in ("model_not_found", "model_decommissioned") or (
        "model" in msg and any(s in msg for s in ("not found", "decommissioned", "does not exist"))
    )


def _http_error_message(resp: requests.Response) -> str:
    status = resp.status_code
    if status == 401:
        return "The AI provider rejected the API key (401). Check GROQ_API_KEY."
    if _is_model_unavailable(resp):
        hint = ("a model listed at https://console.groq.com/docs/models"
                if LLM_PROVIDER == "groq" else "the identifier of the model loaded in LM Studio")
        return (f"Model '{LLM_MODEL}' is not available from the AI provider (not found or retired). "
                f"Set LLM_MODEL in backend/.env (or as a Space variable) to {hint}.")
    if status == 429:
        return "The AI model is rate-limited right now. Please wait a moment and try again."
    return f"The AI model returned an error (HTTP {status}). Please try again."


def _post_llm(messages: List[Dict], temperature: float, max_tokens: int,
              stream: bool = False, timeout: int = REQUEST_TIMEOUT) -> requests.Response:
    url, headers = _llm_endpoint()
    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream,
    }
    if "gpt-oss" in LLM_MODEL:
        # Reasoning model: its hidden reasoning tokens count against max_tokens
        payload["reasoning_effort"] = "low"
    try:
        resp = requests.post(
            url,
            headers=headers,
            json=payload,
            stream=stream,
            timeout=timeout,
        )
    except requests.exceptions.ConnectionError:
        if LLM_PROVIDER == "lmstudio":
            raise LLMError(f"Cannot reach LM Studio at {LM_STUDIO_URL}. Is the LM Studio local server running?",
                           "LLM_CONNECTION_FAILED")
        raise LLMError("Cannot reach the Groq API. Check the server's internet connection.",
                       "LLM_CONNECTION_FAILED")
    except requests.exceptions.Timeout:
        raise LLMError("The AI model took too long to respond. Please try again.", "LLM_TIMEOUT")

    if resp.status_code != 200:
        logger.error(f"LLM HTTP {resp.status_code}: {resp.text[:300]}")
        raise LLMError(_http_error_message(resp), f"LLM_HTTP_{resp.status_code}")
    return resp


# ==================== SOURCE CITATIONS ====================

def _doc_url_from_path(filepath: str) -> str:
    normalized = filepath.replace("\\", "/")
    if "/data/" in normalized:
        return normalized.split("/data/")[-1]
    return os.path.basename(normalized)


def distance_to_similarity(distance: float) -> float:
    # all-MiniLM-L6-v2 produces unit-length vectors and FAISS (IndexFlatL2) returns the
    # squared L2 distance. For unit vectors d² = 2 − 2·cos, so cos = 1 − d²/2.
    return max(0.0, min(1.0, 1.0 - float(distance) / 2.0))


def extract_sources(docs, scores) -> List[Dict]:
    sources = []
    for doc, score in zip(docs, scores):
        raw_path = doc.metadata.get("source", "Unknown")
        sources.append({
            "filename": os.path.basename(raw_path),
            "page": doc.metadata.get("page", 0),
            "snippet": doc.page_content[:150] + "..." if len(doc.page_content) > 150 else doc.page_content,
            "doc_url": _doc_url_from_path(raw_path),
            "similarity": round(distance_to_similarity(score), 3),
        })
    return sources


def calculate_confidence(scores) -> float:
    """Mean cosine similarity (0–1) between the question and the retrieved chunks."""
    if not scores:
        return 0.0
    sims = [distance_to_similarity(s) for s in scores]
    return round(sum(sims) / len(sims), 3)


# ==================== STRICT PROMPT BUILDER ====================

ROLE_LABELS = {
    "employee": "Employee",
    "hr": "HR Manager",
    "manager": "Department Manager",
    "admin": "Administrator",
}


def build_strict_prompt(question: str, context: str, role: str) -> str:
    role_label = ROLE_LABELS.get(role, role.title())
    return f"""You are a strict enterprise knowledge assistant helping a {role_label}.

RULES — follow exactly:
1. Answer ONLY using information from the Context below.
2. Do NOT use any outside knowledge or make assumptions.
3. If the answer is not clearly present in the Context, respond with exactly:
   "{NOT_FOUND_ANSWER}"
4. Be concise, factual, and direct. No creativity or elaboration beyond what the documents state.
5. Never invent numbers, dates, names, or policies.

Context:
{context}

Question: {question}

Answer:"""


# ==================== ROLE-BASED RETRIEVAL ====================

def get_role_store(role: str):
    if role == "admin":
        return vector_db
    try:
        vectorstore_path = os.path.join(VECTOR_DIR, role)
        if not os.path.exists(vectorstore_path):
            logger.warning(f"Role store {role} not found, using default")
            return vector_db
        return _load_store(vectorstore_path)
    except Exception as e:
        logger.error(f"Error loading role store {role}: {e}")
        return vector_db


def retrieve(question: str, role: str):
    store = get_role_store(role)
    results = store.similarity_search_with_score(question, k=RETRIEVAL_K)
    docs = [doc for doc, _ in results]
    scores = [score for _, score in results]
    return docs, scores


def _empty_response(answer: str, start_time: float, role: str, retrieval_ms: int = 0, error: str = None) -> Dict:
    resp = {
        "answer": answer,
        "sources": [],
        "confidence": 0.0,
        "role": role,
        "retrieval_time_ms": retrieval_ms,
        "llm_time_ms": 0,
        "total_time_ms": int((time.time() - start_time) * 1000),
    }
    if error:
        resp["error"] = error
    return resp


# ==================== MAIN ASK (non-streaming) ====================

def ask_question_with_role(question: str, role: str = "employee") -> Dict:
    start_time = time.time()
    if vector_db is None:
        return _empty_response(NO_INDEX_ANSWER, start_time, role)

    try:
        retrieval_start = time.time()
        docs, scores = retrieve(question, role)
        retrieval_ms = int((time.time() - retrieval_start) * 1000)

        if not docs:
            return _empty_response(NOT_FOUND_ANSWER, start_time, role, retrieval_ms)

        context = "\n\n".join([doc.page_content for doc in docs])
        prompt = build_strict_prompt(question, context, role)

        llm_start = time.time()
        response = _post_llm([{"role": "user", "content": prompt}], TEMPERATURE, MAX_TOKENS)
        llm_time = time.time() - llm_start

        data = response.json()
        answer = (
            (data["choices"][0]["message"].get("content") or "").strip()
            if data.get("choices")
            else "The AI model returned an unexpected response."
        )
        if not answer:
            answer = ("The AI model returned an empty answer (it may have used its token budget on "
                      "reasoning). Please try again, or set LLM_MODEL to a non-reasoning model.")

        return {
            "answer": answer,
            "sources": extract_sources(docs, scores),
            "confidence": calculate_confidence(scores),
            "role": role,
            "retrieval_time_ms": retrieval_ms,
            "llm_time_ms": int(llm_time * 1000),
            "total_time_ms": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now().isoformat(),
        }

    except LLMError as e:
        logger.error(f"LLM error: {e.code}")
        return _empty_response(e.message, start_time, role, error=e.code)
    except Exception as e:
        logger.error(f"Error: {e}")
        return _empty_response("An error occurred while processing your question.", start_time, role, error=str(e))


# ==================== STREAMING ASK ====================

def ask_question_stream(question: str, role: str = "employee"):
    logger.info(f"Streaming question: {question} | Role: {role}")

    if vector_db is None:
        yield json.dumps({"type": "content", "content": NO_INDEX_ANSWER})
        return

    try:
        docs, scores = retrieve(question, role)

        if not docs:
            yield json.dumps({"type": "content", "content": NOT_FOUND_ANSWER})
            return

        yield json.dumps({"type": "sources", "sources": extract_sources(docs, scores)})
        yield json.dumps({"type": "confidence", "confidence": calculate_confidence(scores)})

        context = "\n\n".join([doc.page_content for doc in docs])
        prompt = build_strict_prompt(question, context, role)

        response = _post_llm([{"role": "user", "content": prompt}], TEMPERATURE, MAX_TOKENS, stream=True)

        for line in response.iter_lines():
            if line:
                line_str = line.decode("utf-8") if isinstance(line, bytes) else line
                if line_str.startswith("data: "):
                    line_str = line_str[6:]
                if line_str.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(line_str)
                    if chunk.get("choices"):
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield json.dumps({"type": "content", "content": content})
                except json.JSONDecodeError:
                    pass

    except LLMError as e:
        logger.error(f"Streaming LLM error: {e.code}")
        yield json.dumps({"type": "error", "error": e.message, "code": e.code})
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield json.dumps({"type": "error", "error": str(e)})


# ==================== SUGGESTIONS ====================

ROLE_TOPICS = {
    "employee": "attendance policy, leave policy, work from home rules, code of conduct",
    "hr": "recruitment process, payroll policy, selection criteria, hiring procedures",
    "manager": "performance review process, promotion criteria, employee evaluation",
    "admin": "all company policies, user management, system analytics",
}


def generate_suggestions(question: str, role: str) -> Dict:
    topics = ROLE_TOPICS.get(role, "company policies")
    prompt = (
        f'A user asked: "{question}"\n'
        f"They have access to documents about: {topics}\n\n"
        f"Suggest exactly 3 short follow-up questions they might ask next.\n"
        f"Output format (one line only): Question one? | Question two? | Question three?"
    )
    try:
        resp = _post_llm([{"role": "user", "content": prompt}], temperature=0.7, max_tokens=300, timeout=25)
        text = (resp.json()["choices"][0]["message"].get("content") or "").strip()
        raw = [s.strip() for s in text.split("|") if s.strip()]
        suggestions = [s if s.endswith("?") else s + "?" for s in raw][:3]
        return {"suggestions": suggestions}
    except Exception:
        return {"suggestions": []}


# ==================== LEGACY (kept for compatibility) ====================

def ask_question(question: str, role: str = None) -> Dict:
    return ask_question_with_role(question, role or "employee")
