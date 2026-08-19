"""Autenticação simples por login e password, com tokens de sessão opacos."""

import hashlib
import secrets
import time
from datetime import timedelta
from functools import wraps
from typing import Optional
from uuid import uuid4

from flask import g, jsonify, request
from sqlalchemy import select
from sqlalchemy.orm import Session
from werkzeug.security import check_password_hash, generate_password_hash

from config import (
    LOGIN_ATTEMPT_WINDOW_SECONDS,
    LOGIN_MAX_ATTEMPTS,
    SESSION_TTL_HOURS,
)
from db import SessionLocal
from models import AppUser, AuthSession
from sources import utcnow

#: Tentativas de login falhadas por IP: {ip: [timestamps]}.
_failed_attempts: dict[str, list[float]] = {}


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    return check_password_hash(password_hash, password)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_user_by_username(session: Session, username: str) -> Optional[AppUser]:
    stmt = select(AppUser).where(AppUser.username == username.strip().lower())
    return session.scalars(stmt).first()


def create_user(session: Session, username: str, password: str) -> AppUser:
    """Cria um utilizador. Levanta ValueError se o nome já existir."""
    normalised = (username or "").strip().lower()
    if not normalised or not password:
        raise ValueError("Utilizador e password são obrigatórios.")

    if get_user_by_username(session, normalised):
        raise ValueError(f"O utilizador '{normalised}' já existe.")

    user = AppUser(
        id=str(uuid4()),
        username=normalised,
        password_hash=hash_password(password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def ensure_bootstrap_user(username: str, password: str) -> Optional[AppUser]:
    """Cria o primeiro utilizador a partir do .env, se ainda não existir."""
    if not username or not password:
        return None

    with SessionLocal() as session:
        existing = get_user_by_username(session, username)
        if existing:
            return existing
        return create_user(session, username, password)


def authenticate(session: Session, username: str, password: str) -> Optional[AppUser]:
    user = get_user_by_username(session, username or "")
    if not user or not verify_password(user.password_hash, password or ""):
        return None
    return user


def issue_token(session: Session, user: AppUser) -> tuple[str, AuthSession]:
    """Emite um token de sessão. Só o hash fica guardado na base de dados."""
    token = secrets.token_urlsafe(32)
    auth_session = AuthSession(
        id=str(uuid4()),
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=utcnow() + timedelta(hours=SESSION_TTL_HOURS),
    )
    user.last_login_at = utcnow()
    session.add(auth_session)
    session.commit()
    session.refresh(auth_session)
    return token, auth_session


def resolve_token(session: Session, token: str) -> Optional[AppUser]:
    if not token:
        return None

    stmt = select(AuthSession).where(AuthSession.token_hash == hash_token(token))
    auth_session = session.scalars(stmt).first()
    if not auth_session or auth_session.revoked_at is not None:
        return None

    expires_at = auth_session.expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=utcnow().tzinfo)
    if expires_at is not None and expires_at < utcnow():
        return None

    return session.get(AppUser, auth_session.user_id)


def revoke_token(session: Session, token: str) -> bool:
    stmt = select(AuthSession).where(AuthSession.token_hash == hash_token(token))
    auth_session = session.scalars(stmt).first()
    if not auth_session:
        return False

    auth_session.revoked_at = utcnow()
    session.commit()
    return True


def extract_token() -> str:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return ""


def login_throttled(ip: str) -> bool:
    """True se este IP excedeu as tentativas de login falhadas permitidas."""
    now = time.time()
    attempts = [
        moment
        for moment in _failed_attempts.get(ip, [])
        if now - moment < LOGIN_ATTEMPT_WINDOW_SECONDS
    ]
    _failed_attempts[ip] = attempts
    return len(attempts) >= LOGIN_MAX_ATTEMPTS


def register_failed_login(ip: str) -> None:
    _failed_attempts.setdefault(ip, []).append(time.time())


def clear_failed_logins(ip: str) -> None:
    _failed_attempts.pop(ip, None)


def login_required(view):
    """Protege um endpoint. Expõe o utilizador autenticado em `g.current_user`."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        token = extract_token()
        if not token:
            return jsonify({"status": "error", "message": "Sessão em falta."}), 401

        with SessionLocal() as session:
            user = resolve_token(session, token)
            if not user:
                return (
                    jsonify({"status": "error", "message": "Sessão inválida ou expirada."}),
                    401,
                )
            g.current_user_id = user.id
            g.current_username = user.username

        return view(*args, **kwargs)

    return wrapper
