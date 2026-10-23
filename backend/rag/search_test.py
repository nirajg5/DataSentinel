
from backend.rag.retriever import retrieve_documents


if __name__ == "__main__":
    question = input("Enter your question: ").strip()

    try:
        results = retrieve_documents(question, top_k=5)

        if not results:
            print("No matching documents found.")
        else:
            for i, result in enumerate(results, start=1):
                print(f"\n--- Result {i} ---")
                print(f"Source: {result['source']}")
                print(f"Score: {result['score']:.4f}")
                print(f"Chunk: {result['chunk_index']}")
                print(f"Text: {result['text']}")

    except Exception as exc:
        print(f"Search failed: {exc}")
