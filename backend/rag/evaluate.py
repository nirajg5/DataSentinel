
import json
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from backend.rag.evaluation_cases import EVALUATION_CASES
from backend.rag.retriever import retrieve_documents
from backend.rag.reranker import rerank_documents
from backend.rag.answer_service import answer_question


def evaluate_retrieval(cases: list[dict]) -> dict:
    results = []
    reciprocal_ranks = []
    source_hits = []

    for case in cases:
        question = case["question"]
        expected_sources = set(case["expected_sources"])

        candidates = retrieve_documents(question, top_k=10)
        documents = rerank_documents(
            question,
            candidates,
            top_k=5,
        )

        retrieved_sources = [
            document["source"] for document in documents
        ]

        relevant_positions = [
            position
            for position, source in enumerate(
                retrieved_sources, start=1
            )
            if source in expected_sources
        ]

        reciprocal_rank = (
            1 / relevant_positions[0]
            if relevant_positions else 0.0
        )

        hit = bool(relevant_positions)

        reciprocal_ranks.append(reciprocal_rank)
        source_hits.append(int(hit))

        results.append({
            "question": question,
            "expected_sources": sorted(expected_sources),
            "retrieved_sources": retrieved_sources,
            "hit_at_5": hit,
            "reciprocal_rank": reciprocal_rank,
        })

    count = len(results)

    return {
        "test_cases": count,
        "source_hit_rate_at_5": (
            sum(source_hits) / count if count else 0.0
        ),
        "mean_reciprocal_rank": (
            sum(reciprocal_ranks) / count if count else 0.0
        ),
        "results": results,
    }


def evaluate_answers(cases: list[dict]) -> dict:
    results = []

    for case in cases:
        start = time.perf_counter()

        try:
            response = answer_question(case["question"])
            error = None
        except Exception as exc:
            response = None
            error = str(exc)

        latency_seconds = round(
            time.perf_counter() - start, 3
        )

        if response:
            retrieved_sources = {
                item["source"]
                for item in response.get("citations", [])
            }

            results.append({
                "question": case["question"],
                "success": True,
                "latency_seconds": latency_seconds,
                "citation_count": len(
                    response.get("citations", [])
                ),
                "citation_sources_valid": all(
                    source in {
                        item["source"]
                        for item in response.get("citations", [])
                    }
                    for source in retrieved_sources
                ),
                "answer": response.get("answer", ""),
            })
        else:
            results.append({
                "question": case["question"],
                "success": False,
                "latency_seconds": latency_seconds,
                "error": error,
            })

    successful = [
        item for item in results if item["success"]
    ]

    return {
        "test_cases": len(cases),
        "successful_answers": len(successful),
        "success_rate": (
            len(successful) / len(cases) if cases else 0.0
        ),
        "average_latency_seconds": (
            round(
                sum(item["latency_seconds"] for item in successful)
                / len(successful),
                3,
            )
            if successful else None
        ),
        "results": results,
    }


if __name__ == "__main__":
    print("Evaluating retrieval...")
    retrieval_report = evaluate_retrieval(EVALUATION_CASES)

    print(json.dumps(retrieval_report, indent=2))

    print("\nEvaluating answer generation...")
    answer_report = evaluate_answers(EVALUATION_CASES)

    print(json.dumps(answer_report, indent=2))

    output_path = Path("rag_evaluation_report.json")
    output_path.write_text(
        json.dumps({
            "retrieval": retrieval_report,
            "answers": answer_report,
        }, indent=2),
        encoding="utf-8",
    )

    print(f"\nReport saved to: {output_path.resolve()}")
