
from backend.rag.chunker import (
    load_knowledge_documents,
    split_text,
)


def test_split_text():
    chunks = split_text(
        "A" * 2500,
        chunk_size=1000,
        overlap=150,
    )

    assert len(chunks) > 1
    assert all(chunks)


def test_empty_text():
    assert split_text("") == []


def test_load_knowledge_documents():
    documents = load_knowledge_documents()

    assert documents
    assert all(
        {"source", "chunk_index", "content"} <= set(doc)
        for doc in documents
    )
