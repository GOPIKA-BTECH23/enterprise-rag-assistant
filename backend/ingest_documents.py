
import os

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_community.vectorstores import FAISS

from config import DATA_DIR, VECTOR_DIR
from embeddings import get_embeddings


DATA_PATH = DATA_DIR
VECTOR_PATH = VECTOR_DIR
ROLES = ["employee", "hr", "manager"]


def load_documents_for_role(role: str):
    """Load only documents from a specific role's folder."""
    documents = []
    role_path = os.path.join(DATA_PATH, role)

    if not os.path.exists(role_path):
        print(f"No data folder found for role: {role}")
        return documents

    for file in os.listdir(role_path):
        if file.endswith(".pdf"):
            print(f"  Loading {file}")
            loader = PyPDFLoader(os.path.join(role_path, file))
            documents.extend(loader.load())

    return documents


def load_all_documents():
    """Load all documents across all role folders (used for admin combined store)."""
    documents = []

    for root, dirs, files in os.walk(DATA_PATH):
        for file in files:
            if file.endswith(".pdf"):
                print(f"  Loading {file}")
                loader = PyPDFLoader(os.path.join(root, file))
                documents.extend(loader.load())

    return documents


def split_documents(documents):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=150
    )
    return splitter.split_documents(documents)


if __name__ == "__main__":
    # Downloads the ONNX model into EMBEDDING_CACHE_DIR on first use
    embeddings_model = get_embeddings()

    # Create one vectorstore per role so each role can only search its own documents
    for role in ROLES:
        print(f"\nProcessing role: {role}")
        documents = load_documents_for_role(role)

        if not documents:
            print(f"  No documents found, skipping.")
            continue

        chunks = split_documents(documents)
        role_vector_path = os.path.join(VECTOR_PATH, role)

        db = FAISS.from_documents(chunks, embeddings_model)
        os.makedirs(role_vector_path, exist_ok=True)
        db.save_local(role_vector_path)
        print(f"  Vector store for '{role}' saved at: {role_vector_path} ({len(chunks)} chunks)")

    # Create the combined store at the root vectorstore path for admin access
    print("\nCreating combined vector store (admin / fallback)...")
    all_documents = load_all_documents()
    all_chunks = split_documents(all_documents)
    db_all = FAISS.from_documents(all_chunks, embeddings_model)
    os.makedirs(VECTOR_PATH, exist_ok=True)
    db_all.save_local(VECTOR_PATH)
    print(f"  Combined store saved at: {VECTOR_PATH} ({len(all_chunks)} chunks)")

    print("\nAll vector stores created successfully!")
