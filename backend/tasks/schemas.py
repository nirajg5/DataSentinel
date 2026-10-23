from pydantic import BaseModel, Field


class AsyncInvestigationRequest(BaseModel):
    question: str = Field(min_length=5, max_length=2000)