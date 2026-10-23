import json
import os
import hashlib

import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://localhost:6379/0",
)

CACHE_TTL = int(
    os.getenv("RAG_CACHE_TTL_SECONDS", "300")
)

CACHE_VERSION = os.getenv("RAG_CACHE_VERSION", "1")

_client = None


def get_redis_client():
    global _client

    if _client is None:
        _client = redis.Redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )

    return _client


def make_cache_key(question: str) -> str:
    normalized = " ".join(question.lower().split())

    content = f"{CACHE_VERSION}:{normalized}"

    digest = hashlib.sha256(
        content.encode("utf-8")
    ).hexdigest()

    return f"datasentinel:rag:{digest}"


def get_cached_answer(question: str):
    try:
        client = get_redis_client()
        cached = client.get(make_cache_key(question))

        if cached:
            return json.loads(cached)

    except (redis.RedisError, ValueError):
        pass

    return None


def cache_answer(question: str, answer: dict):
    try:
        client = get_redis_client()

        client.setex(
            make_cache_key(question),
            CACHE_TTL,
            json.dumps(answer),
        )

    except (redis.RedisError, TypeError, ValueError):
        pass