from langchain_community.embeddings import FastEmbedEmbeddings

from config import EMBEDDING_MODEL_NAME, EMBEDDING_CACHE_DIR


def get_embeddings() -> FastEmbedEmbeddings:
    """all-MiniLM-L6-v2 via fastembed (ONNX Runtime): same vectors as sentence-transformers,
    unit-length, without PyTorch. Used by both ingestion and querying so they always match."""
    return FastEmbedEmbeddings(model_name=EMBEDDING_MODEL_NAME, cache_dir=EMBEDDING_CACHE_DIR)
