import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
from pydantic import BaseModel
from config import get_jwt_secret
from database import get_db
from security import pwd_context, hash_password

SECRET_KEY = get_jwt_secret()
ALGORITHM = "HS256"
TOKEN_EXPIRATION_HOURS = 24
VALID_ROLES = ["employee", "hr", "manager", "admin"]


class LoginRequest(BaseModel):
    username: str
    password: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    role: str
    username: str


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except ValueError:  # unrecognised / corrupt hash
        return False


def authenticate_user(username: str, password: str, role: str) -> Optional[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ? AND is_active = 1", (username,))
    user = c.fetchone()

    if not user:
        conn.close()
        return None
    try:
        valid, new_hash = pwd_context.verify_and_update(password, user["password_hash"])
    except ValueError:
        valid, new_hash = False, None
    if not valid:
        conn.close()
        return None
    if new_hash:  # legacy SHA-256 hash -> upgrade to bcrypt
        conn.execute("UPDATE users SET password_hash = ? WHERE username = ?", (new_hash, username))
        conn.commit()
    conn.close()

    if role not in VALID_ROLES or user["role"] != role:
        return None

    return {"username": username, "role": user["role"]}


def create_access_token(data: Dict):
    expires = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRATION_HOURS)
    to_encode = data.copy()
    to_encode.update({"exp": expires})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token, int(TOKEN_EXPIRATION_HOURS * 3600)


def verify_token(token: str) -> Optional[Dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("username") and payload.get("role"):
            return {"username": payload["username"], "role": payload["role"]}
        return None
    except Exception:
        return None


def create_user(username: str, password: str, role: str) -> bool:
    if role not in VALID_ROLES:
        return False
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            (username, hash_password(password), role)
        )
        conn.commit()
        return True
    except Exception:
        return False
    finally:
        conn.close()


def change_password(username: str, old_password: str, new_password: str) -> bool:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    row = c.fetchone()
    if not row or not verify_password(old_password, row["password_hash"]):
        conn.close()
        return False
    conn.execute(
        "UPDATE users SET password_hash = ? WHERE username = ?",
        (hash_password(new_password), username)
    )
    conn.commit()
    conn.close()
    return True


def logout_token(token: str):
    conn = get_db()
    try:
        conn.execute("INSERT OR IGNORE INTO token_blacklist (token) VALUES (?)", (token,))
        conn.commit()
    finally:
        conn.close()


def is_token_blacklisted(token: str) -> bool:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT 1 FROM token_blacklist WHERE token = ?", (token,))
    result = c.fetchone()
    conn.close()
    return result is not None


def get_all_users():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT username, role, created_at, is_active FROM users")
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]
