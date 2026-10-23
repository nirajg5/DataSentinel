
from dotenv import load_dotenv

load_dotenv()

from backend.rag.pinecone_store import ingest_knowledge_documents


if __name__ == "__main__":
    result = ingest_knowledge_documents()
    print(result)
