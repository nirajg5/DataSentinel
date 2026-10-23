
MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"

_reranker = None


def get_reranker():
    global _reranker

    if _reranker is None:
        from sentence_transformers import CrossEncoder

        _reranker = CrossEncoder(
            MODEL_NAME,
            device="cpu",
        )

    return _reranker


def rerank_documents(
    question: str,
    documents: list[dict],
    top_k: int = 5,
) -> list[dict]:
    if not documents:
        return []

    try:
        model = get_reranker()

        pairs = [
            (question, document["text"])
            for document in documents
        ]

        scores = model.predict(
            pairs,
            show_progress_bar=False,
        )

        ranked_documents = []

        for document, score in zip(documents, scores):
            ranked_documents.append({
                **document,
                "rerank_score": float(score),
            })

        ranked_documents.sort(
            key=lambda item: item["rerank_score"],
            reverse=True,
        )

        return ranked_documents[:top_k]

    except (ImportError, OSError, MemoryError):
        # Fall back to retrieval scores if the reranker
        # cannot load because of missing dependencies or memory.
        return sorted(
            documents,
            key=lambda item: float(item.get("score") or 0),
            reverse=True,
        )[:top_k]
