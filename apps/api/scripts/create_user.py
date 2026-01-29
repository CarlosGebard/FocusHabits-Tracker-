from __future__ import annotations

import argparse
import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal, init_engine
from app.models.user import User


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a user account")
    parser.add_argument("--username", required=True)
    args = parser.parse_args()

    username = args.username.strip().lower()
    if not username:
        raise SystemExit("Username is required")

    password = getpass.getpass("Password: ")
    if not password:
        raise SystemExit("Password is required")

    init_engine()
    db = SessionLocal()
    try:
        existing = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        if existing:
            raise SystemExit("User already exists")

        user = User(username=username, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        print("User created.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
