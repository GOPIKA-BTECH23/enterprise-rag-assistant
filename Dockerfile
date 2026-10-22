# Backend image for a Hugging Face Space (Docker SDK). Also runs anywhere Docker does.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# CPU-only PyTorch first, so sentence-transformers doesn't pull the multi-GB CUDA build
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

# Hugging Face Spaces run containers as UID 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    APP_ENV=production
WORKDIR /home/user/app

COPY --chown=user backend/ backend/
COPY --chown=user data/ data/

# Build the FAISS indexes into the image. This also caches the embedding model in ~/.cache,
# so the container starts without downloading anything.
RUN python backend/ingest_documents.py

# The SQLite DB (users, history, analytics) is created and seeded when the app starts.
WORKDIR /home/user/app/backend
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
