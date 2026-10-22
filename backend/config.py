import os
import logging
import secrets

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# ==================== PATHS ====================
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
VECTOR_DIR = os.path.join(PROJECT_ROOT, "vectorstore")

# Real environment variables (e.g. Hugging Face Space secrets) take precedence over backend/.env
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# "production" when APP_ENV says so, or when running inside a Hugging Face Space
IS_PRODUCTION = os.getenv("APP_ENV", "").lower() == "production" or bool(os.getenv("SPACE_ID"))

# ==================== LLM ====================
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").strip().lower()
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://127.0.0.1:1234/v1/chat/completions")

_DEFAULT_MODELS = {
    "groq": "openai/gpt-oss-20b",
    "lmstudio": "mistral-7b-instruct-v0.2@q4_0",
}
LLM_MODEL = os.getenv("LLM_MODEL", "").strip() or _DEFAULT_MODELS.get(LLM_PROVIDER, "")

# ==================== DATABASE ====================
DB_PATH = os.getenv("DB_PATH", "").strip() or os.path.join(BACKEND_DIR, "enterprise_rag.db")

# ==================== CORS ====================
CORS_ORIGINS = [
    o.strip().rstrip("/")
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]


def get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET", "").strip()
    if secret:
        return secret
    if IS_PRODUCTION:
        raise RuntimeError(
            "JWT_SECRET is not set. Add it as an environment variable / Space secret before starting the app."
        )
    logger.warning(
        "JWT_SECRET is not set; using a random development secret. "
        "Logins will be invalidated on every restart. Set JWT_SECRET in backend/.env."
    )
    return secrets.token_urlsafe(32)
