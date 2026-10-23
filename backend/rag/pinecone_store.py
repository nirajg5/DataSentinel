
import hashlib
import os

from pinecone import Pinecone

from backend.rag.chunker import load_knowledge_documents


INDEX_NAME = os.getenv(
    "PINECONE_INDEX_NAME",
    "datasentinel-knowledge",
)
NAMESPACE = "datasentinel-runbooks"


def get_pinecone_index():
    api_key = os.getenv("PINECONE_API_KEY")

    if not api_key:
        raise ValueError(
            "PINECONE_API_KEY is missing from .env."
        )

    pc = Pinecone(api_key=api_key)

    # The index must already exist and be configured
    # for integrated embedding in the Pinecone console.
    existing_indexes = pc.list_indexes().names()

    if INDEX_NAME not in existing_indexes:
        raise ValueError(
            f"Pinecone index '{INDEX_NAME}' does not exist. "
            "Create it with integrated embedding first."
        )

    return pc.Index(INDEX_NAME)


def ingest_knowledge_documents() -> dict:
    documents = load_knowledge_documents()

    if not documents:
        raise ValueError(
            "No Markdown or TXT documents found in data/knowledge."
        )

    index = get_pinecone_index()
    records = []

    for doc in documents:
        raw_id = (
            f"{doc['source']}:{doc['chunk_index']}"
        )
        record_id = hashlib.sha256(
            raw_id.encode("utf-8")
        ).hexdigest()

        records.append({
            "_id": record_id,
            "text": doc["content"],
            "source": doc["source"],
            "chunk_index": int(doc["chunk_index"]),
            "document_type": "knowledge",
        })

    batch_size = 50

    for start in range(0, len(records), batch_size):
        batch = records[start:start + batch_size]

        index.upsert_records(
            namespace=NAMESPACE,
            records=batch,
        )

    return {
        "status": "SUCCESS",
        "index_name": INDEX_NAME,
        "namespace": NAMESPACE,
        "documents_loaded": len(documents),
        "records_uploaded": len(records),
        "embedding_provider": "Pinecone integrated inference",
    }
