import bcrypt
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from app.database import get_db
from app.config import settings

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hashes plaintext password using bcrypt with random salt."""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verifies plaintext password against stored bcrypt hash."""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False

    @classmethod
    def seed_default_admin(cls):
        """Seeds default administrator account if database has no users."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM users;")
            row = cursor.fetchone()
            if row["count"] == 0:
                admin_id = str(uuid.uuid4())
                admin_username = "admin"
                admin_password = "CipherVaultAdmin2026!"
                password_hash = cls.hash_password(admin_password)
                
                cursor.execute("""
                    INSERT INTO users (id, username, password_hash, role)
                    VALUES (?, ?, ?, 'admin');
                """, (admin_id, admin_username, password_hash))
                
                cls.log_audit(
                    user_id=admin_id,
                    username=admin_username,
                    action="SYSTEM_INIT",
                    status="SUCCESS",
                    details="Initialized default administrator account."
                )
                conn.commit()

    @classmethod
    def authenticate_user(cls, username: str, password: str) -> Tuple[bool, Optional[dict], str]:
        """Authenticates user credentials and returns session if valid."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ?;", (username,))
            user = cursor.fetchone()

            if not user or not cls.verify_password(password, user["password_hash"]):
                cls.log_audit(
                    user_id=None,
                    username=username,
                    action="AUTH_LOGIN",
                    status="FAILURE",
                    details="Invalid username or password attempt."
                )
                return False, None, "Invalid username or password."

            # Create server-side session
            session_token = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)

            cursor.execute("""
                INSERT INTO sessions (token, user_id, expires_at)
                VALUES (?, ?, ?);
            """, (session_token, user["id"], expires_at.isoformat()))
            conn.commit()

            cls.log_audit(
                user_id=user["id"],
                username=user["username"],
                action="AUTH_LOGIN",
                status="SUCCESS",
                details="User successfully authenticated. Session established."
            )

            user_dict = {
                "id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "created_at": str(user["created_at"])
            }
            return True, user_dict, session_token

    @classmethod
    def get_user_from_session(cls, session_token: str) -> Optional[dict]:
        """Validates session token and returns user if active and not expired."""
        if not session_token:
            return None

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT s.token, s.expires_at, u.id, u.username, u.role, u.created_at
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token = ?;
            """, (session_token,))
            row = cursor.fetchone()

            if not row:
                return None

            expires_at = datetime.fromisoformat(row["expires_at"])
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires_at:
                # Expired session
                cursor.execute("DELETE FROM sessions WHERE token = ?;", (session_token,))
                conn.commit()
                return None

            return {
                "id": row["id"],
                "username": row["username"],
                "role": row["role"],
                "created_at": str(row["created_at"])
            }

    @classmethod
    def logout_session(cls, session_token: str) -> bool:
        """Terminates session."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT user_id FROM sessions WHERE token = ?;", (session_token,))
            row = cursor.fetchone()
            if row:
                cls.log_audit(
                    user_id=row["user_id"],
                    username=None,
                    action="AUTH_LOGOUT",
                    status="SUCCESS",
                    details="User terminated session."
                )
                cursor.execute("DELETE FROM sessions WHERE token = ?;", (session_token,))
                conn.commit()
                return True
            return False

    @staticmethod
    def log_audit(
        user_id: Optional[str],
        username: Optional[str],
        action: str,
        status: str,
        details: str
    ):
        """Persists audit logs without ever logging plaintext passwords or encryption keys."""
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO audit_logs (id, user_id, username, action, status, details)
                    VALUES (?, ?, ?, ?, ?, ?);
                """, (
                    str(uuid.uuid4()),
                    user_id,
                    username or "anonymous",
                    action,
                    status,
                    details
                ))
                conn.commit()
        except Exception:
            pass
