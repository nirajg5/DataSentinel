
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE_DIR = PROJECT_ROOT / "data" / "knowledge"

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def split_text(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive.")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "overlap must be non-negative and smaller than chunk_size."
        )

    text = text.strip()
    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))

        # Prefer ending at a paragraph or word boundary.
        if end < len(text):
            boundary = text.rfind("\n", start, end)
            if boundary <= start:
                boundary = text.rfind(" ", start, end)
            if boundary > start:
                end = boundary

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = max(end - overlap, start + 1)

    return chunks


def load_knowledge_documents() -> list[dict]:
    if not KNOWLEDGE_DIR.exists():
        raise ValueError(
            f"Knowledge directory not found: {KNOWLEDGE_DIR}"
        )

    documents = []

    supported_extensions = {".md", ".txt"}

    for path in sorted(KNOWLEDGE_DIR.rglob("*")):
        if not path.is_file():
            continue

        if path.suffix.lower() not in supported_extensions:
            continue

        content = path.read_text(encoding="utf-8").strip()

        if not content:
            continue

        for index, chunk in enumerate(split_text(content)):
            documents.append({
                "source": path.relative_to(
                    KNOWLEDGE_DIR
                ).as_posix(),
                "chunk_index": index,
                "content": chunk,
            })

    return documents
