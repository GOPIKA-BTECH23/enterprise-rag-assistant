import sqlite3
import os
import logging

from config import DB_PATH
from security import hash_password

logger = logging.getLogger(__name__)

DEMO_USERS = [
    ("john",  "password123", "employee"),
    ("alice", "password123", "hr"),
    ("bob",   "password123", "manager"),
    ("admin", "admin123",    "admin"),
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            is_active INTEGER DEFAULT 1
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS token_blacklist (
            token TEXT PRIMARY KEY,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS query_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            role TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT,
            confidence REAL DEFAULT 0.0,
            response_time_ms INTEGER DEFAULT 0,
            sources_count INTEGER DEFAULT 0,
            feedback INTEGER,
            timestamp TEXT DEFAULT (datetime('now'))
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            role TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT,
            sources TEXT,
            confidence REAL DEFAULT 0.0,
            response_time_ms INTEGER DEFAULT 0,
            timestamp TEXT DEFAULT (datetime('now'))
        )
    """)

    # Seed demo users (only hash passwords for users that don't exist yet; bcrypt is slow)
    for username, password, role in DEMO_USERS:
        c.execute("SELECT 1 FROM users WHERE username = ?", (username,))
        if c.fetchone() is None:
            c.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                (username, hash_password(password), role),
            )

    conn.commit()
    conn.close()
    logger.info(f"Database ready at {DB_PATH}")


init_db()
