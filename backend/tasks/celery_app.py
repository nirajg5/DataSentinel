
import os

from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://localhost:6379/0",
)

celery_app = Celery(
    "datasentinel",
    broker=REDIS_URL.replace("/0", "/1"),
    backend=REDIS_URL.replace("/0", "/2"),
    include=["backend.tasks.investigation_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    result_expires=3600,
)
