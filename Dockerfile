# Backend image for Render (free web service, Docker runtime). Runs anywhere Docker does.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

# Run as an unprivileged user
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    APP_ENV=production \
    PORT=10000 \
    FASTEMBED_CACHE_PATH=/home/user/app/.fastembed_cache
WORKDIR /home/user/app

# Download the ONNX embedding model into the image (own layer, so code changes don't re-download it)
COPY --chown=user backend/config.py backend/embeddings.py backend/
RUN cd backend && python -c "from embeddings import get_embeddings; get_embeddings().embed_query('warm-up')"

COPY --chown=user backend/ backend/
COPY --chown=user data/ data/

# Build the FAISS indexes into the image with the cached model
RUN python backend/ingest_documents.py

# The SQLite DB (users, history, analytics) is created and seeded when the app starts.
WORKDIR /home/user/app/backend
EXPOSE 10000
# Render sets PORT; the shell form expands it (default 10000)
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-10000}"]
