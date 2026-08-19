"""Cria ou repõe a password de um utilizador da aplicação de prospecção.

Uso:
    uv run python Prospector/backend/create_user.py <utilizador> <password>
"""

import sys

from auth import create_user, get_user_by_username, hash_password
from db import SessionLocal, init_db


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("Uso: python create_user.py <utilizador> <password>")
        return 2

    username, password = argv[1], argv[2]
    init_db()

    with SessionLocal() as session:
        existing = get_user_by_username(session, username)
        if existing:
            existing.password_hash = hash_password(password)
            session.commit()
            print(f"Password actualizada para '{existing.username}'.")
            return 0

        user = create_user(session, username, password)
        print(f"Utilizador '{user.username}' criado.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
