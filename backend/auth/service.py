from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.auth.constants import ALLOWED_ROLES
from backend.auth.schemas import UserCreate
from backend.auth.security import hash_password, verify_password
from backend.models.user import User


def create_user(db: Session, data: UserCreate) -> User:
    if data.role not in ALLOWED_ROLES:
        raise ValueError("Invalid user role")

    existing = db.scalar(
        select(User).where(
            or_(
                User.email == data.email,
                User.username == data.username,
            )
        )
    )

    if existing:
        raise ValueError("Username or email already exists")

    user = User(
        username=data.username,
        email=str(data.email),
        hashed_password=hash_password(data.password),
        role=data.role,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise


def authenticate_user(
    db: Session,
    username: str,
    password: str,
) -> User | None:
    user = db.scalar(
        select(User).where(
            or_(
                User.username == username,
                User.email == username,
            )
        )
    )

    if user is None:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user