
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.rag.answer_service import answer_question

router = APIRouter(prefix="/rag", tags=["Advanced RAG"])


class RAGQuestion(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


@router.post("/ask")
def ask_knowledge_base(
    payload: RAGQuestion,
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        return answer_question(payload.question)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=str(exc)
        ) from exc
    except Exception as exc:
        # Log the underlying exception on the server.
        raise HTTPException(
            status_code=502,
            detail="RAG request failed. Check application logs.",
        ) from exc
