import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager
from app.config import settings

def get_db_connection() -> sqlite3.Connection:
    """Creates and returns a connection to SQLite with WAL mode and foreign keys enabled."""
    db_path = Path(settings.DB_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(
        str(db_path),
        check_same_thread=False,
        isolation_level=None # Autocommit mode managed explicitly
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn

@contextmanager
def get_db():
    """Context manager for acquiring and closing database connection cleanly."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """Initializes SQLite tables, indexes, and constraints."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # 2. Server-side Sessions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);")
        
        # 3. Encrypted Records Table (Never contains plaintext)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS encrypted_records (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                category TEXT NOT NULL,
                ciphertext TEXT NOT NULL,
                nonce TEXT NOT NULL,
                auth_tag TEXT NOT NULL,
                encryption_version TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_owner_category ON encrypted_records (owner_id, category);")
        
        # 4. Audit Logs Table (Never logs plaintext, secrets, or keys)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                username TEXT,
                action TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp DESC);")
        
        # 5. Benchmarks History Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS benchmarks (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                record_count INTEGER NOT NULL,
                enc_time_ms REAL NOT NULL,
                dec_time_ms REAL NOT NULL,
                avg_enc_latency_us REAL NOT NULL,
                avg_dec_latency_us REAL NOT NULL,
                plaintext_size_bytes INTEGER NOT NULL,
                encrypted_size_bytes INTEGER NOT NULL,
                storage_overhead_pct REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_benchmarks_created ON benchmarks (created_at DESC);")
        
        conn.commit()
