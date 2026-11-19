from fastapi import Request, HTTPException, status, Depends
from typing import Optional
from app.services.auth_service import AuthService
from app.config import settings

def get_current_user_optional(request: Request) -> Optional[dict]:
    """Extracts session token from cookie or header and returns user if valid."""
    session_token = request.cookies.get(settings.COOKIE_NAME)
    
    if not session_token:
        # Fallback to Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:].strip()
            
    if not session_token:
        # Fallback to X-Session-Token
        session_token = request.headers.get("X-Session-Token")

    if not session_token:
        return None

    return AuthService.get_user_from_session(session_token)

def get_current_user(request: Request) -> dict:
    """Dependency that requires valid authentication."""
    user = get_current_user_optional(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Active session not found or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
