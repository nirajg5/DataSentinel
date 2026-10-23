
from dotenv import load_dotenv

load_dotenv()

from backend.rag.pinecone_store import (
    get_pinecone_index,
    NAMESPACE,
)


def retrieve_documents(
    question: str,
    top_k: int = 10,
    source: str | None = None,
) -> list[dict]:
    question = question.strip()

    if not question:
        raise ValueError("Question cannot be empty.")

    if not 1 <= top_k <= 20:
        raise ValueError("top_k must be between 1 and 20.")

    index = get_pinecone_index()

    metadata_filter = {
        "document_type": {"$eq": "knowledge"}
    }

    if source:
        metadata_filter["source"] = {"$eq": source}

    response = index.search(
        namespace=NAMESPACE,
        query={
            "top_k": top_k,
            "inputs": {"text": question},
            "filter": metadata_filter,
        },
        fields=["text", "source", "chunk_index", "document_type"],
    )

    results = []

    for hit in response.result.hits:
        fields = hit.fields or {}

        results.append({
            "id": hit.id,
            "score": float(hit.score or 0),
            "text": fields.get("text", ""),
            "source": fields.get("source", "unknown"),
            "chunk_index": fields.get("chunk_index"),
        })

    return results
