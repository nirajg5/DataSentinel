
from backend.agents.graph import investigate


if __name__ == "__main__":
    question = input("Ask DataSentinel: ").strip()

    result = investigate(question)

    print("\nTools used:")
    print(result["tools_used"])

    print("\nAnswer:")
    print(result["answer"])
